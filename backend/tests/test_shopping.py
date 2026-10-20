import importlib
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.routes import shopping

auth=importlib.import_module('app.api.v1.routes.auth')
@pytest.fixture
def client(tmp_path,monkeypatch):
 monkeypatch.setenv('AUTH_DATABASE_PATH',str(tmp_path/'shopping.sqlite3'));monkeypatch.setattr(auth,'ITERATIONS',1000)
 with TestClient(app) as c:
  signup(c,'first@example.test');yield c

def signup(c,email):
 r=c.post('/api/auth/register',json={'name':'Test customer','email':email,'password':'StrongTest123!','role':'customer'});assert r.status_code==200,r.text
 return r.json()['user']['id']
def add(c,cid='CD-2408',quantity=1,selected=True,**extra):
 return c.post('/api/shopping/cart',json={'campaignId':cid,'quantity':quantity,'selected':selected,**extra})
def checkout(c,**extra):
 return c.post('/api/shopping/checkout',json={'key':'idempotent-key-1','name':'Test customer','phone':'0901234567','address':'123 Test street, HCMC','accepted':True,**extra})

def test_isolation_and_login_persistence(client):
 first=client.cookies.get(auth.COOKIE)
 assert add(client).status_code==200
 assert client.post('/api/shopping/saved',json={'productId':1,'saved':True}).status_code==200
 assert client.post('/api/shopping/claim',json={'code':'PREORA50'}).status_code==200
 with TestClient(app) as other:
  signup(other,'other@example.test')
  d=other.get('/api/shopping/me').json();assert d['cart']==[] and d['saved']==[] and d['claimed']==[]
  assert checkout(other).status_code==400
  other.cookies.clear();other.cookies.set(auth.COOKIE,first)
  d=other.get('/api/shopping/me').json();assert d['cart'][0]['productId']==1 and d['saved']==[1] and d['claimed']==['PREORA50']

def test_server_prices_and_selected_only_checkout(client):
 assert add(client,quantity=2,unitPrice=1,productId=999).status_code==200
 assert add(client,'CD-LIVE-001',selected=False).status_code==200
 claim=client.post('/api/shopping/claim',json={'code':'FAN10'});assert claim.status_code==200
 gross=shopping.CAMPAIGNS['CD-2408']['price']*2
 preview=client.post('/api/shopping/quote',json={'code':'FAN10'}).json();assert preview['subtotal']==gross and preview['discount']==150000
 response=checkout(client,code='FAN10');assert response.status_code==200,response.text
 r=response.json();assert len(r['shopping']['cart'])==1 and not r['shopping']['cart'][0]['selected']
 assert len(r['receipt']['orders'])==1 and r['receipt']['orders'][0]['total']==gross-150000
 assert r['receipt']['simulation'] is True and r['shopping']['used']==['FAN10']
 assert checkout(client,code='FAN10').json()['receipt']['id']==r['receipt']['id']
 assert len(client.get('/api/shopping/me').json()['orders'])==1
 add(client,'CD-LIVE-001',selected=True)
 assert checkout(client,key='another-key-2',code='FAN10').status_code==400

def test_voucher_scope_minimum_and_claim_idempotency(client):
 add(client)
 assert client.post('/api/shopping/quote',json={'code':'FAN10'}).status_code==400
 for _ in range(2):assert client.post('/api/shopping/claim',json={'code':'HOME60'}).status_code==200
 assert client.get('/api/shopping/me').json()['claimed']==['HOME60']
 assert client.post('/api/shopping/quote',json={'code':'HOME60'}).status_code==400
 client.post('/api/shopping/claim',json={'code':'COLLECT80'})
 assert client.post('/api/shopping/quote',json={'code':'COLLECT80'}).json()['discount']==80000
 assert client.post('/api/shopping/claim',json={'code':'DOES_NOT_EXIST'}).status_code==400

def test_empty_invalid_and_finished_campaign(client):
 assert checkout(client).status_code==400
 assert add(client,quantity=-1).status_code==422
 assert add(client,quantity=1.5).status_code==422
 assert add(client,quantity=100).status_code==422
 assert add(client,'fake-campaign').status_code==409
 c=next(c for c in shopping.CAMPAIGNS.values() if c['status']!='Đang hoạt động')
 assert add(client,c['id']).status_code==409
 add(client,quantity=99)
 assert add(client,quantity=1,mode='add').status_code==400
 assert checkout(client,accepted=False).status_code==422
 assert client.get('/api/shopping/me').json()['orders']==[]

def test_auth_and_origin_required(client):
 assert client.post('/api/shopping/cart',json={'campaignId':'CD-2408','quantity':1},headers={'Origin':'https://evil.example'}).status_code==403
 with TestClient(app) as anonymous:
  assert anonymous.get('/api/shopping/me').status_code==401
  assert anonymous.get('/api/shopping/vouchers').status_code==200
  assert add(anonymous).status_code==401
 client.post('/api/auth/logout',json={})
 client.post('/api/auth/login',json={'email':'seller@preora.demo','password':'Demo123!'})
 assert add(client).status_code==403

def test_changes_do_not_mutate_other_items_and_expiry(client,monkeypatch):
 add(client);add(client,'CD-LIVE-001',quantity=2)
 add(client,quantity=0)
 assert len(client.get('/api/shopping/me').json()['cart'])==1
 add(client)
 client.post('/api/shopping/claim',json={'code':'PREORA50'})
 vouchers=[{**v,'expires':'2000-01-01'} for v in shopping.VOUCHERS]
 monkeypatch.setattr(shopping,'VOUCHERS',vouchers)
 assert checkout(client,code='PREORA50').status_code==400
 assert len(client.get('/api/shopping/me').json()['cart'])==2
 assert client.get('/api/shopping/me').json()['orders']==[]

def test_select_all_and_scoped_selection(client):
 add(client);add(client,'CD-LIVE-001')
 r=client.post('/api/shopping/selection',json={'selected':False})
 assert r.status_code==200 and all(not i['selected'] for i in r.json()['cart'])
 assert client.post('/api/shopping/quote',json={}).status_code==400
 r=client.post('/api/shopping/selection',json={'selected':True,'campaignIds':['CD-2408','not-owned']})
 assert [i['campaignId'] for i in r.json()['cart'] if i['selected']]==['CD-2408']
 assert checkout(client).status_code==200
 assert len(client.get('/api/shopping/me').json()['cart'])==1
