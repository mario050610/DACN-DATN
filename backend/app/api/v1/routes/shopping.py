"""Account-owned shopping data and a server-priced simulated checkout."""
import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, ConfigDict
from .auth import database, current_user, origin_guard
from app.services.behavior_events import record as record_behavior

router = APIRouter(prefix='/shopping', tags=['Shopping'])
CATALOGUE = json.loads((Path(__file__).resolve().parents[3] / 'data/shopping_catalogue.json').read_text(encoding='utf-8'))
PRODUCTS = {p['id']: p for p in CATALOGUE['products']}
CAMPAIGNS = {c['id']: c for c in CATALOGUE['campaigns']}
VOUCHERS = [
 {'code':'PREORA50','title':'Chào bạn mới · Giảm 50.000 ₫','minimum':300000,'amount':50000,'percent':0,'cap':50000,'category':'','expires':'2027-12-31'},
 {'code':'FAN10','title':'Ưu đãi fan · Giảm 10%, tối đa 150.000 ₫','minimum':500000,'amount':0,'percent':10,'cap':150000,'category':'','expires':'2027-12-31'},
 {'code':'COLLECT80','title':'Sưu tầm thả ga · Giảm 80.000 ₫','minimum':600000,'amount':80000,'percent':0,'cap':80000,'category':'Collectible','expires':'2027-12-31'},
 {'code':'HOME60','title':'Làm mới tổ ấm · Giảm 60.000 ₫','minimum':400000,'amount':60000,'percent':0,'cap':60000,'category':'Trang trí nhà cửa','expires':'2027-12-31'},
 {'code':'PERFUME12','title':'Hương thơm yêu thích · Giảm 12%, tối đa 120.000 ₫','minimum':500000,'amount':0,'percent':12,'cap':120000,'category':'Nước hoa','expires':'2027-12-31'},
 {'code':'TECH100','title':'Góc gaming · Giảm 100.000 ₫','minimum':1000000,'amount':100000,'percent':0,'cap':100000,'category':'Công nghệ / Phụ kiện điện tử','expires':'2027-12-31'},
]
# Additional mock offers use the same server-side eligibility checks as existing codes.
VOUCHERS += [
 {'code':code,'title':title,'minimum':minimum,'amount':amount,'percent':percent,'cap':cap,'category':category,'expires':expires}
 for code,title,minimum,amount,percent,cap,category,expires in [
 ('NEW100','Khởi đầu mới · Giảm 100.000 ₫',700000,100000,0,100000,'','2027-03-31'),
 ('FASHION15','Tủ đồ mới · Giảm 15%',500000,0,15,120000,'Thời trang','2027-04-30'),
 ('MERCH20','Creator Club · Giảm 20%',400000,0,20,100000,'Merchandise','2027-05-31'),
 ('FIGURE100','Góc sưu tầm · Giảm 100.000 ₫',900000,100000,0,100000,'Collectible','2027-06-30'),
 ('GAMING8','Setup mới · Giảm 8%',800000,0,8,200000,'Công nghệ / Phụ kiện điện tử','2027-07-31'),
 ('HOME120','Nhà xinh · Giảm 120.000 ₫',1000000,120000,0,120000,'Trang trí nhà cửa','2027-08-31'),
 ('PERFUME80','Hương mới · Giảm 80.000 ₫',650000,80000,0,80000,'Nước hoa','2027-09-30'),
 ('FANCLUB5','Cộng đồng PREORA · Giảm 5%',200000,0,5,80000,'','2027-10-31'),
 ('BUNDLE150','Đặt trước cùng nhau · Giảm 150.000 ₫',1500000,150000,0,150000,'','2027-11-30'),
 ('MINI25','Ưu đãi nhỏ · Giảm 25.000 ₫',150000,25000,0,25000,'','2027-12-31'),
 ('PREORA200','Giỏ hàng lớn · Giảm 200.000 ₫',2500000,200000,0,200000,'','2027-12-31'),
 ('CREATOR10','Ý tưởng mới · Giảm 10%',300000,0,10,90000,'Merchandise','2027-12-31'),
 ]]


def initialize(db):
    # execute() preserves the surrounding transaction (executescript would commit it).
    db.execute('CREATE TABLE IF NOT EXISTS shopping(user_id TEXT PRIMARY KEY REFERENCES accounts(id), data TEXT NOT NULL)')

def load(db, uid):
    initialize(db)
    row = db.execute('SELECT data FROM shopping WHERE user_id=?',(uid,)).fetchone()
    return json.loads(row['data']) if row else {'cart':[], 'saved':[], 'claimed':[], 'used':[], 'orders':[], 'receipts':[]}

def persist(db, uid, data):
    db.execute('INSERT INTO shopping VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data',(uid,json.dumps(data,ensure_ascii=False)))

def owner(db, request):
    user=current_user(db,request)
    if user['role']!='customer': raise HTTPException(403,'Chức năng mua sắm dành cho tài khoản khách hàng.')
    return user['id']

def available(cid,db=None):
    if db is not None:
        from app.services import lifecycle
        state,_=lifecycle.load(db);c=next((c for c in state["campaigns"] if c["id"]==cid),None)
    else:c=CAMPAIGNS.get(cid)
    today=datetime.now(timezone(timedelta(hours=7))).date().isoformat()
    if not c or c['status']!='Đang hoạt động' or not c['startDate']<=today<=c['endDate']:
        raise HTTPException(409,'Chiến dịch không còn nhận đặt trước.')
    return c

class CartChange(BaseModel):
    campaignId: str
    variant: str = Field(default='Phiên bản tiêu chuẩn',min_length=1,max_length=100)
    quantity: int = Field(ge=0,le=99,strict=True)
    selected: bool = True
    mode: Literal['set','add'] = 'set'

class SaveChange(BaseModel):
    productId: int
    saved: bool

class Selection(BaseModel):
    selected: bool
    campaignIds: list[str] | None = Field(default=None,max_length=100)

class Code(BaseModel):
    code: str = Field(default='',max_length=40)

class Checkout(Code):
    model_config=ConfigDict(str_strip_whitespace=True)
    key: str = Field(min_length=8,max_length=100)
    name: str = Field(min_length=2,max_length=100)
    phone: str = Field(min_length=8,max_length=30,pattern=r'^[0-9+(). -]+$')
    address: str = Field(min_length=8,max_length=300)
    accepted: Literal[True]

def quote(data,code,db=None):
    products=PRODUCTS
    if db is not None:
        from app.services import lifecycle
        products={p['id']:p for p in lifecycle.load(db)[0]['products']}
    items=[i for i in data['cart'] if i['selected']]
    if not items: raise HTTPException(400,'Hãy chọn ít nhất một sản phẩm trong giỏ hàng.')
    subtotal=0
    for i in items:
        c=available(i['campaignId'],db)
        i['unitPrice']=c['price']
        subtotal+=c['price']*i['quantity']
    discount=0
    if code:
        v=next((v for v in VOUCHERS if v['code']==code),None)
        if not v or code not in data['claimed'] or code in data['used'] or v['expires']<datetime.now(timezone(timedelta(hours=7))).date().isoformat():
            raise HTTPException(400,'Mã chưa được lưu, đã sử dụng hoặc hết hạn.')
        eligible=sum(i['quantity']*i['unitPrice'] for i in items if not v['category'] or products.get(i['productId'],{}).get('category')==v['category'])
        if eligible<v['minimum']: raise HTTPException(400,f"Chưa đủ điều kiện: cần {v['minimum']:,} ₫ cho nhóm {v['category'] or 'tất cả sản phẩm'}.")
        discount=min(eligible,v['cap'],v['amount'] or eligible*v['percent']//100)
    return {'subtotal':subtotal,'discount':discount,'total':subtotal-discount,'code':code,'items':items}

@router.get('/vouchers')
def vouchers(): return {'vouchers':VOUCHERS,'simulation':True}

@router.get('/me')
def me(request: Request,response: Response):
    response.headers['Cache-Control']='no-store'
    with database() as db:return load(db,owner(db,request))

@router.post('/cart')
def cart(body: CartChange,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);data=load(db,uid)
        old=next((i for i in data['cart'] if i['campaignId']==body.campaignId and i['variant']==body.variant),None)
        if body.quantity:
            c=available(body.campaignId,db)
            quantity=body.quantity+(old['quantity'] if old and body.mode=='add' else 0)
            if quantity>99: raise HTTPException(400,'Tối đa 99 sản phẩm mỗi dòng.')
            item={'campaignId':c['id'],'productId':c['productId'],'unitPrice':c['price'],'quantity':quantity,'variant':body.variant,'selected':body.selected}
            if old:data['cart'][data['cart'].index(old)]=item
            else:
                if len(data['cart'])>=100:raise HTTPException(400,'Giỏ hàng tối đa 100 dòng.')
                data['cart'].append(item)
        elif old:data['cart'].remove(old)
        persist(db,uid,data)
        if body.quantity and body.mode=='add':record_behavior(body.campaignId,'cart')
        return data

@router.post('/saved')
def saved(body: SaveChange,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);data=load(db,uid)
        from app.services import lifecycle
        domain,_=lifecycle.load(db)
        public={c['productId'] for c in domain['campaigns'] if c['status'] in ('Đang hoạt động','Đã lên lịch','Thành công','Không đạt MOQ')}
        if body.productId not in public:raise HTTPException(404,'Không tìm thấy sản phẩm công khai.')
        was_saved=body.productId in data['saved']
        data['saved']=[p for p in data['saved'] if p!=body.productId]
        if body.saved:
            data['saved'].append(body.productId)
            if not was_saved:
                campaign=next((c for c in domain['campaigns'] if c['productId']==body.productId and c['status']=='Đang hoạt động'),None)
                if campaign:record_behavior(campaign['id'],'favorite')
        persist(db,uid,data);return data

@router.post('/selection')
def selection(body: Selection,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);data=load(db,uid)
        for item in data['cart']:
            if body.campaignIds is None or item['campaignId'] in body.campaignIds:
                item['selected']=body.selected
        persist(db,uid,data);return data

@router.post('/claim')
def claim(body: Code,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);data=load(db,uid)
        if not any(v['code']==body.code and v['expires']>=datetime.now(timezone(timedelta(hours=7))).date().isoformat() for v in VOUCHERS):raise HTTPException(400,'Ưu đãi không còn hiệu lực.')
        if body.code not in data['claimed']:data['claimed'].append(body.code)
        persist(db,uid,data);return data

@router.post('/quote')
def preview(body: Code,request: Request):
    origin_guard(request)
    with database() as db:return quote(load(db,owner(db,request)),body.code,db)

@router.post('/checkout')
def checkout(body: Checkout,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);db.commit();db.execute('BEGIN IMMEDIATE');data=load(db,uid)
        previous=next((r for r in data['receipts'] if r['key']==body.key),None)
        if previous:return {'shopping':data,'receipt':previous}
        q=quote(data,body.code,db);remaining=q['discount'];orders=[];now=datetime.now(timezone.utc).isoformat()
        for index,i in enumerate(q['items']):
            gross=i['unitPrice']*i['quantity']
            reduction=remaining if index==len(q['items'])-1 else q['discount']*gross//q['subtotal']
            remaining-=reduction;c=available(i['campaignId'],db)
            orders.append({**i,'id':'PR-'+uuid.uuid4().hex[:16].upper(),'customerId':uid,'sellerId':c['sellerId'],'total':gross-reduction,'discount':reduction,'createdAt':now,'events':[{'title':'Thanh toán mô phỏng được ghi nhận','at':now,'kind':'payment'},{'title':'Chờ kết quả chiến dịch','at':now,'kind':'order'}],'orderStatus':'Chờ kết quả chiến dịch','paymentStatus':'Đã thanh toán'})
        receipt={'id':'CHK-'+uuid.uuid4().hex,'key':body.key,'orders':orders,'total':q['total'],'subtotal':q['subtotal'],'discount':q['discount'],'code':body.code,'createdAt':now,'contact':{'name':body.name,'phone':body.phone,'address':body.address},'simulation':True}
        data['orders']=orders+data['orders'];data['receipts'].insert(0,receipt)
        data['cart']=[i for i in data['cart'] if not i['selected']]
        if body.code:data['used'].append(body.code)
        from app.services.lifecycle import checkout_orders
        checkout_orders(db,orders,receipt['contact'])
        persist(db,uid,data);return {'shopping':data,'receipt':receipt}
