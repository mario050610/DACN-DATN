"""Account-owned shopping data and a server-priced simulated checkout."""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
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

def available(cid):
    c=CAMPAIGNS.get(cid)
    today=datetime.now(timezone.utc).date().isoformat()
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
    key: str = Field(min_length=8,max_length=100)
    name: str = Field(min_length=2,max_length=100)
    phone: str = Field(min_length=8,max_length=30)
    address: str = Field(min_length=8,max_length=300)
    accepted: Literal[True]

def quote(data,code):
    items=[i for i in data['cart'] if i['selected']]
    if not items: raise HTTPException(400,'Hãy chọn ít nhất một sản phẩm trong giỏ hàng.')
    subtotal=0
    for i in items:
        c=available(i['campaignId'])
        i['unitPrice']=c['price']
        subtotal+=c['price']*i['quantity']
    discount=0
    if code:
        v=next((v for v in VOUCHERS if v['code']==code),None)
        if not v or code not in data['claimed'] or code in data['used'] or v['expires']<datetime.now(timezone.utc).date().isoformat():
            raise HTTPException(400,'Mã chưa được lưu, đã sử dụng hoặc hết hạn.')
        eligible=sum(i['quantity']*i['unitPrice'] for i in items if not v['category'] or PRODUCTS[i['productId']]['category']==v['category'])
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
            c=available(body.campaignId)
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
        if body.productId not in PRODUCTS:raise HTTPException(404,'Không tìm thấy sản phẩm.')
        was_saved=body.productId in data['saved']
        data['saved']=[p for p in data['saved'] if p!=body.productId]
        if body.saved:
            data['saved'].append(body.productId)
            if not was_saved:
                campaign=next((c for c in CAMPAIGNS.values() if c['productId']==body.productId and c['status']=='Đang hoạt động'),None)
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
        if not any(v['code']==body.code and v['expires']>=datetime.now(timezone.utc).date().isoformat() for v in VOUCHERS):raise HTTPException(400,'Ưu đãi không còn hiệu lực.')
        if body.code not in data['claimed']:data['claimed'].append(body.code)
        persist(db,uid,data);return data

@router.post('/quote')
def preview(body: Code,request: Request):
    origin_guard(request)
    with database() as db:return quote(load(db,owner(db,request)),body.code)

@router.post('/checkout')
def checkout(body: Checkout,request: Request):
    origin_guard(request)
    with database() as db:
        uid=owner(db,request);data=load(db,uid)
        previous=next((r for r in data['receipts'] if r['key']==body.key),None)
        if previous:return {'shopping':data,'receipt':previous}
        q=quote(data,body.code);remaining=q['discount'];orders=[];now=datetime.now(timezone.utc).isoformat()
        for index,i in enumerate(q['items']):
            gross=i['unitPrice']*i['quantity']
            reduction=remaining if index==len(q['items'])-1 else q['discount']*gross//q['subtotal']
            remaining-=reduction;c=CAMPAIGNS[i['campaignId']]
            orders.append({**i,'id':'PR-'+uuid.uuid4().hex[:16].upper(),'customerId':uid,'sellerId':c['sellerId'],'total':gross-reduction,'discount':reduction,'createdAt':now,'orderStatus':'Chờ kết quả chiến dịch','paymentStatus':'Đã thanh toán'})
        receipt={'id':'CHK-'+uuid.uuid4().hex,'key':body.key,'orders':orders,'total':q['total'],'subtotal':q['subtotal'],'discount':q['discount'],'code':body.code,'createdAt':now,'contact':{'name':body.name,'phone':body.phone,'address':body.address},'simulation':True}
        data['orders']=orders+data['orders'];data['receipts'].insert(0,receipt)
        data['cart']=[i for i in data['cart'] if not i['selected']]
        if body.code:data['used'].append(body.code)
        persist(db,uid,data);return {'shopping':data,'receipt':receipt}
