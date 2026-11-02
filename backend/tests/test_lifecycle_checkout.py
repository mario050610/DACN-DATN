from test_training import client,login
from test_lifecycle import fixture,send
from app.api.v1.routes.auth import database
from app.services import lifecycle as core
from datetime import date,timedelta

def test_checkout_new_product_uses_canonical_price_category_and_order(client):
 fixture(client)
 with database() as db:
  s,_=core.load(db);c=core.find(s,'campaigns','CD-INTEGRATION');c.update(status='Đang hoạt động',startDate=str(date.today()-timedelta(days=1)),endDate=str(date.today()+timedelta(days=20)),price=300000);core.find(s,'products',9991)['category']='Collectible';core.save(db,s)
 login(client,'customer');assert client.post('/api/shopping/saved',json={'productId':9991,'saved':True}).status_code==200
 assert client.post('/api/shopping/cart',json={'campaignId':'CD-INTEGRATION','quantity':2}).status_code==200
 assert client.post('/api/shopping/claim',json={'code':'COLLECT80'}).status_code==200
 quote=client.post('/api/shopping/quote',json={'code':'COLLECT80'});assert quote.status_code==200,quote.text;assert quote.json()['total']==520000
 payload={'key':'checkout-new-product-1','name':'Khách hàng kiểm thử','phone':'0901234567','address':'123 Địa chỉ kiểm thử nhận hàng','accepted':True,'code':'COLLECT80'}
 r=client.post('/api/shopping/checkout',json=payload);assert r.status_code==200,r.text;first=r.json()['receipt'];assert client.post('/api/shopping/checkout',json=payload).json()['receipt']['id']==first['id']
 oid=first['orders'][0]['id'];own=client.get('/api/lifecycle/state').json()['state'];o=next(o for o in own['orders'] if o['id']==oid);assert o['total']==520000 and o['shippingContact']['phone']=='0901234567';assert next(c for c in own['campaigns'] if c['id']=='CD-INTEGRATION')['currentOrders']==4
 login(client,'seller');assert any(o['id']==oid for o in client.get('/api/lifecycle/state').json()['state']['orders'])
 login(client,'partner');assert not client.get('/api/lifecycle/state').json()['state']['orders']

def test_existing_server_checkout_is_migrated_once(client):
 from app.api.v1.routes import shopping
 with database() as db:
  shopping.initialize(db)
  c=shopping.CAMPAIGNS['CD-2408'];o={'id':'PR-LEGACY-SERVER','campaignId':c['id'],'productId':c['productId'],'customerId':'customer-demo','sellerId':c['sellerId'],'quantity':1,'unitPrice':c['price'],'total':c['price'],'variant':'Standard','createdAt':core.now(),'orderStatus':'Chờ kết quả chiến dịch','paymentStatus':'Đã thanh toán'}
  shopping.persist(db,'customer-demo',{'cart':[],'saved':[],'used':[],'claimed':[],'orders':[o],'receipts':[{'id':'legacy','orders':[o],'contact':{'name':'Khách cũ','phone':'0901234567','address':'Địa chỉ đã lưu trên server'}}]})
 with database() as db:
  s,_=core.load(db);assert sum(o['id']=='PR-LEGACY-SERVER' for o in s['orders'])==1;assert core.find(s,'campaigns',c['id'])['currentOrders']==c['currentOrders']+1;assert core.find(s,'orders','PR-LEGACY-SERVER')['shippingContact']['name']=='Khách cũ'
 with database() as db:
  again,_=core.load(db);assert sum(o['id']=='PR-LEGACY-SERVER' for o in again['orders'])==1;assert core.find(again,'campaigns',c['id'])['currentOrders']==c['currentOrders']+1
