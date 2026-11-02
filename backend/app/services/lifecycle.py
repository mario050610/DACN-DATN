"""Server-owned campaign/order lifecycle. Browser snapshots are never trusted as writes."""
import copy,json,math,uuid
from datetime import datetime,timezone,timedelta,date
from pathlib import Path
from fastapi import HTTPException

ROOT=Path(__file__).resolve().parents[3]
def now():return datetime.now(timezone.utc).isoformat()
def today():return datetime.now(timezone(timedelta(hours=7))).date().isoformat()
def fail(message,code=409):raise HTTPException(code,message)
def initialize(db):
 db.execute('CREATE TABLE IF NOT EXISTS lifecycle_state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL)')
 db.execute('CREATE TABLE IF NOT EXISTS lifecycle_items(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id))')
 db.execute('CREATE TABLE IF NOT EXISTS lifecycle_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)')
 if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
 if not db.execute('SELECT 1 FROM lifecycle_state WHERE id=1').fetchone():
  seed=json.loads((ROOT/'database/seeds/sample_data.json').read_text(encoding='utf-8'));catalogue=json.loads((ROOT/'backend/app/data/shopping_catalogue.json').read_text(encoding='utf-8'))
  seed['products']=catalogue['products'];seed['campaigns']=catalogue['campaigns'];seed['session']=None
  for c in seed['campaigns']:
   c['dataOrigin']='demo'
   if c['status'] in ('Thành công','Không đạt MOQ'):c['finalDemand']=c['currentOrders']
  db.execute('INSERT INTO lifecycle_state VALUES(1,1,?)',(json.dumps(seed,ensure_ascii=False),))
 if not db.execute("SELECT 1 FROM lifecycle_meta WHERE key='shopping-migrated-v1'").fetchone():
  s=json.loads(db.execute('SELECT data FROM lifecycle_state WHERE id=1').fetchone()['data']);known={o['id'] for o in s['orders']};campaigns={c['id']:c for c in s['campaigns']};changed=False
  if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='shopping'").fetchone():
   for row in db.execute('SELECT user_id,data FROM shopping').fetchall():
    shopping=json.loads(row['data']);contacts={o['id']:r.get('contact') for r in shopping.get('receipts',[]) for o in r.get('orders',[])}
    for o in shopping.get('orders',[]):
     if o['id'] in known or o.get('customerId')!=row['user_id'] or o.get('campaignId') not in campaigns:continue
     known.add(o['id']);s['orders'].append(o)
     if contacts.get(o['id']):o['shippingContact']=contacts[o['id']]
     c=campaigns[o['campaignId']]
     if o['orderStatus'] not in ('Đã hủy','Đã hoàn tiền','Đang hoàn tiền'):c['currentOrders']+=o['quantity']
     s['payments'].append({'id':'PAY-'+o['id'],'orderId':o['id'],'amount':o['total'],'status':o['paymentStatus']});changed=True
  if changed:db.execute('UPDATE lifecycle_state SET revision=revision+1,data=? WHERE id=1',(json.dumps(s,ensure_ascii=False),))
  db.execute("INSERT INTO lifecycle_meta VALUES('shopping-migrated-v1','done') ON CONFLICT(key) DO NOTHING")
def load(db):
 initialize(db);row=db.execute('SELECT * FROM lifecycle_state WHERE id=1').fetchone();return json.loads(row['data']),row['revision']
def save(db,s):
 byid={o['id']:o for o in s['orders']}
 for pay in s['payments']:
  if pay['orderId'] in byid:pay['status']=byid[pay['orderId']]['paymentStatus']
 db.execute('UPDATE lifecycle_state SET revision=revision+1,data=? WHERE id=1',(json.dumps(s,ensure_ascii=False,allow_nan=False),))
 # Mirror canonical changes into customer receipts; checkout idempotency remains intact.
 if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='shopping'").fetchone():
  orders={o['id']:o for o in s['orders']}
  for row in db.execute('SELECT user_id,data FROM shopping').fetchall():
   d=json.loads(row['data']);changed=False
   for o in d['orders']:
    if o['id'] in orders and orders[o['id']]!=o:o.update(orders[o['id']]);changed=True
   for r in d['receipts']:
    for o in r['orders']:
     if o['id'] in orders and orders[o['id']]!=o:o.update(orders[o['id']]);changed=True
   if changed:db.execute('UPDATE shopping SET data=? WHERE user_id=?',(json.dumps(d,ensure_ascii=False),row['user_id']))
def items(db,kind):return [json.loads(r['data']) for r in db.execute('SELECT data FROM lifecycle_items WHERE kind=?',(kind,))]
def put(db,kind,obj):db.execute('INSERT INTO lifecycle_items VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data',(kind,str(obj['id']),json.dumps(obj,ensure_ascii=False,allow_nan=False)))
def get(db,kind,id):
 row=db.execute('SELECT data FROM lifecycle_items WHERE kind=? AND id=?',(kind,str(id))).fetchone()
 if not row:fail('Không tìm thấy hồ sơ.',404)
 return json.loads(row['data'])
def find(s,kind,id):
 obj=next((v for v in s[kind] if str(v['id'])==str(id)),None)
 if obj is None:fail('Không tìm thấy bản ghi.',404)
 return obj
def authorize(user,obj,key='sellerId',admin=False):
 if user['id']!=obj.get(key) and not(admin and user['role']=='admin'):fail('Không có quyền thực hiện thao tác.',403)
def event(obj,title,kind='order'):
 obj.setdefault('events',[]).append({'title':title,'at':now(),'kind':kind})
def announce(db,s,c,title):
 from app.api.v1.routes.community import init,notify
 init(db)
 for uid in {o['customerId'] for o in s['orders'] if o['campaignId']==c['id']}|{c['sellerId']}:
  put(db,'notice',{'id':uuid.uuid4().hex,'userId':uid,'campaignId':c['id'],'title':title,'at':now()})
def order_status(s,cid,status,payment=None):
 for o in s['orders']:
  if o['campaignId']==cid and o['orderStatus'] not in ('Đã hoàn tiền','Đã hủy','Đã giao'):
   o['orderStatus']=status;event(o,status)
   if payment:o['paymentStatus']=payment;event(o,'Thanh toán: '+payment,'payment')
 byid={o['id']:o for o in s['orders']}
 for p in s['payments']:
  o=byid.get(p['orderId'])
  if o:p['status']=o['paymentStatus']
def settle(db,s):
 changed=False
 for c in s['campaigns']:
  if c['status'] in ('Đang hoạt động','Đã lên lịch') and c['endDate'] and c['endDate']<today():
   c['finalDemand']=c['currentOrders'];c['finalizedAt']=now();c['status']='Thành công' if c['currentOrders']>=c['moq'] else 'Không đạt MOQ';c.setdefault('events',[]).append({'status':c['status'],'at':now()});changed=True
   if c['status']=='Không đạt MOQ':order_status(s,c['id'],'Đang hoàn tiền','Đang hoàn tiền')
   announce(db,s,c,'Kết quả chiến dịch: '+c['status'])
 if changed:save(db,s)
def scoped(s,user):
 uid=user['id'];role=user['role'];d={**s}
 d['orders']=[o for o in s['orders'] if role=='admin' or o.get('customerId' if role=='customer' else 'sellerId' if role=='seller' else '_')==uid]
 linked={o['campaignId'] for o in d['orders']}
 d['productionRequests']=[r for r in s['productionRequests'] if role=='admin' or r.get('partnerId' if role=='partner' else 'sellerId')==uid or(role=='customer' and r['campaignId'] in linked)]
 d['campaigns']=[c for c in s['campaigns'] if role=='admin' or c['sellerId']==uid or c['id'] in linked or c['status'] in ('Đang hoạt động','Thành công','Không đạt MOQ','Đã lên lịch','Đã hủy')]
 pids={c['productId'] for c in d['campaigns']};d['products']=[p for p in s['products'] if role=='admin' or p['sellerId']==uid or p['id'] in pids]
 oids={o['id'] for o in d['orders']};d['payments']=[p for p in s['payments'] if p['orderId'] in oids];d['checkoutGroups']=[];d['cart']=[]
 d['users']=[{**{k:u[k] for k in ('id','name','role')},'email':u.get('email','') if u['id']==uid else '', 'notificationEmail':False} for u in s['users']]
 d['forecasts']=[f for f in s['forecasts'] if role=='admin' or next((c for c in s['campaigns'] if c['id']==f['campaignId'] and c['sellerId']==uid),None)]
 d['session']=None;d['demoNow']=None;d['salesSimulationEnabled']=False
 return d
def checkout_orders(db,orders,contact=None):
 s,_=load(db);known={o['id'] for o in s['orders']}
 for o in orders:
  if o['id'] in known:continue
  if contact:o['shippingContact']=contact
  c=find(s,'campaigns',o['campaignId']);c['currentOrders']+=o['quantity'];s['orders'].append(o)
  c.setdefault('dailyObservations',[])
  row=next((r for r in c['dailyObservations'] if r['date']==today()),None)
  if row:row['quantity']+=o['quantity']
  else:c['dailyObservations'].append({'date':today(),'quantity':o['quantity']})
  s['payments'].append({'id':'PAY-'+o['id'],'orderId':o['id'],'amount':o['total'],'status':o['paymentStatus']})
 save(db,s)

def capacity(db,partner,category,start,end,qty):
 from app.api.v1.routes.community import init
 init(db);row=db.execute('SELECT data FROM partner_capacity WHERE owner=?',(partner,)).fetchone();rows=json.loads(row['data']) if row else [];results=[]
 for r in rows:
  if r['category'].casefold().strip()!=category.casefold().strip():continue
  begin=max(date.fromisoformat(start),date.fromisoformat(r['availableFrom']))+timedelta(days=r['leadDays']);finish=min(date.fromisoformat(end),date.fromisoformat(r['availableTo']));days=0
  for i in range(max(0,min(731,(finish-begin).days+1))):
   if ((begin+timedelta(days=i)).weekday()+1)%7 in r['weekdays']:days+=1
  available=max(0,days*r['dailyUnits']-r['committedUnits'])//r['batchSize']*r['batchSize'];required=math.ceil(qty/r['batchSize'])*r['batchSize'];results.append({'id':r['id'],'available':available,'required':required,'workdays':days,'enough':available>=required and days>0})
 return results
