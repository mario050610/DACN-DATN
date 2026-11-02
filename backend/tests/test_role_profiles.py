import json,sqlite3
import pytest
from test_auth import client
from test_training import login
from test_verification import submission
from app.api.v1.routes.auth import database,verify_password
from app.services.account_profiles import migrate

def registration(role='customer',**extra):return {'name':'Thành viên mới','email':role+'@example.test','phone':'+84 901 234 567','password':'StrongTest123!','password_confirmation':'StrongTest123!','accepted_terms':True,'accepted_privacy':True,'role':role,**({'storeName':'Cửa hàng của tôi'} if role=='seller' else {}),**extra}

@pytest.mark.parametrize('role',['customer','seller','partner'])
def test_register_and_owned_profile_persist_by_role(client,role):
 r=client.post('/api/auth/register',json=registration(role));assert r.status_code==200,r.text;uid=r.json()['user']['id']
 data={'name':'Tên đã cập nhật','phone':'0901234567'}
 if role=='customer':data['shippingAddress']='Địa chỉ nhận hàng chỉ dành cho tài khoản'
 if role=='seller':data.update(storeName='Cửa hàng cập nhật',businessType='company',mainCategory='Collectible',description='Giới thiệu công khai',businessAddress='Địa chỉ kinh doanh công khai')
 if role=='partner':data.update(organizationName='Tổ chức cập nhật',partnerType='logistics',contactPerson='Người đại diện công khai',activityField='Vận chuyển',serviceArea='Miền Nam',capabilities='Năng lực hợp tác do tổ chức cung cấp')
 r=client.post('/api/account/me',json=data);assert r.status_code==200,r.text;assert r.json()['phone']=='0901234567';assert r.json()['verificationStatus']=='not_submitted'
 public=client.get('/api/community/profiles/'+uid).json();assert 'phone' not in public and 'email' not in public and 'shippingAddress' not in json.dumps(public)
 if role=='customer':assert client.get('/api/account/me').json()['profile']['shippingAddress']==data['shippingAddress']
 if role=='seller':assert public['business']['storeName']==data['storeName']
 if role=='partner':assert public['business']['partnerType']=='logistics' and client.get('/api/account/me').json()['cooperationStatus']=='not_verified'
 client.post('/api/auth/logout',json={});assert client.get('/api/account/me').status_code==401
 assert client.post('/api/auth/login',json={'email':role+'@example.test','password':'StrongTest123!'}).status_code==200;assert client.get('/api/account/me').json()['user']['name']=='Tên đã cập nhật'
 with database() as db:
  stored=dict(db.execute('SELECT * FROM accounts WHERE id=?',(uid,)).fetchone());assert stored['terms_version']=='2026-11-02' and stored['terms_accepted_at'] and verify_password('StrongTest123!',stored['password'])
 assert client.post('/api/account/me',json={**data,'owner':'admin-demo','verificationStatus':'approved'}).status_code==422

@pytest.mark.parametrize('change',[{'phone':'invalid'},{'password_confirmation':'NotMatching123!'},{'accepted_terms':False},{'accepted_privacy':False},{'role':'admin'},{'name':'  '}])
def test_registration_validates_required_fields(client,change):
 assert client.post('/api/auth/register',json=registration(**change)).status_code==422

def test_migration_preserves_existing_credentials_and_is_idempotent(tmp_path):
 with sqlite3.connect(tmp_path/'old.sqlite3') as db:
  db.execute('CREATE TABLE accounts(id TEXT PRIMARY KEY,name TEXT,email TEXT,role TEXT,password TEXT,totp_secret TEXT)');db.execute('INSERT INTO accounts VALUES(?,?,?,?,?,?)',('old','Existing','old@example.test','seller','existing-hash','existing-totp'))
  migrate(db);migrate(db);row=db.execute('SELECT id,password,totp_secret,phone,terms_accepted_at FROM accounts').fetchone();assert row==('old','existing-hash','existing-totp','',None)
  assert len([c for c in db.execute('PRAGMA table_info(accounts)') if c[1]=='phone'])==1

def test_partner_verification_is_separate_and_owner_only(client):
 login(client,'partner');assert client.get('/api/verification/me').status_code==403
 assert client.post('/api/verification/me',json=submission()).status_code==403
 r=client.post('/api/partner-verification/me',json=submission());assert r.status_code==200,r.text;doc=r.json()['profile']['document']['id']
 assert client.get('/api/account/me').json()['verificationStatus']=='submitted'
 login(client,'seller');assert client.get('/api/partner-verification/me').status_code==403;assert client.post('/api/partner-verification/me',json=submission()).status_code==403;assert client.get('/api/verification/documents/'+doc).status_code==404
 login(client,'admin');assert any(p['id']=='partner-demo' for p in client.get('/api/partner-verification/admin').json()['partners']);assert client.get('/api/verification/documents/'+doc).status_code==200
 checks={k:True for k in ['readable','registrationMatches','taxIdMatches','representativeMatches','legalStatusActive']}
 assert client.post('/api/verification/admin/partner-demo',json={'status':'approved','note':'Đã đối chiếu hồ sơ đối tác với nguồn độc lập','registryReference':'Nguồn đối chiếu test độc lập','checks':checks,'revision':1}).status_code==200
 login(client,'partner');assert client.get('/api/account/me').json()['cooperationStatus']=='active';assert client.get('/api/verification/me').status_code==403
