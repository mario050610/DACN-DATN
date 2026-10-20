import base64
import importlib
import json
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

auth=importlib.import_module('app.api.v1.routes.auth')

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('AUTH_DATABASE_PATH',str(tmp_path/'accounts.sqlite3'))
    monkeypatch.setattr(auth,'ITERATIONS',1000)  # Test cost only; production uses 600,000.
    with TestClient(app) as c:yield c

def register(client,email='new@example.test'):
    response=client.post('/api/auth/register',json={'email':email,'password':'StrongTest123!','name':'Người dùng thử','role':'customer'})
    assert response.status_code==200,response.text
    return response.json()['user']

def test_admin_directory_is_restricted_and_does_not_expose_secrets(client):
    assert client.get('/api/auth/admin/users').status_code==401
    register(client)
    assert client.get('/api/auth/admin/users').status_code==403
    assert client.post('/api/auth/login',json={'email':'seller@preora.demo','password':'Demo123!'}).status_code==200
    assert client.get('/api/auth/admin/users').status_code==403
    assert client.post('/api/auth/login',json={'email':'admin@preora.demo','password':'Demo123!'}).status_code==200
    response=client.get('/api/auth/admin/users')
    assert response.status_code==200
    assert response.headers['cache-control']=='no-store'
    users=response.json()['users']
    assert any(u['email']=='new@example.test' for u in users)
    assert all(set(u)=={'id','name','email','role','two_factor_enabled'} for u in users)

def setup(client):
    register(client)
    result=client.post('/api/auth/2fa/setup',json={'password':'StrongTest123!'})
    assert result.status_code==200,result.text
    secret=result.json()['secret'];step=int(time.time()//30)
    result=client.post('/api/auth/2fa/enable',json={'code':auth.totp(secret,step)})
    assert result.status_code==200,result.text
    return secret,result.json()['recovery_codes'],step

def test_register_duplicate_and_no_privileged_signup(client):
    user=register(client)
    assert user['role']=='customer'
    assert client.get('/api/auth/me').json()['user']['id']==user['id']
    assert client.post('/api/auth/register',json={'email':'new@example.test','password':'StrongTest123!','name':'User','role':'customer'}).status_code==409
    assert client.post('/api/auth/register',json={'email':'root@example.test','password':'StrongTest123!','name':'User','role':'admin'}).status_code==422
    with auth.database() as db:
        encoded=db.execute('SELECT password FROM accounts WHERE id=?',(user['id'],)).fetchone()['password']
        assert 'StrongTest123!' not in encoded
        assert auth.verify_password('StrongTest123!',encoded)

def test_session_cookie_and_logout(client):
    register(client)
    cookie=client.cookies.get(auth.COOKIE)
    assert cookie and len(cookie)>30
    response=client.post('/api/auth/logout',json={})
    assert response.status_code==200
    assert client.get('/api/auth/me').status_code==401

def test_password_change_invalidates_other_sessions(client):
    register(client)
    old_cookie=client.cookies.get(auth.COOKIE)
    assert client.post('/api/auth/password',json={'password':'wrong','new_password':'ChangedTest123!'}).status_code==401
    assert client.post('/api/auth/password',json={'password':'StrongTest123!','new_password':'ChangedTest123!'}).status_code==200
    # A second browser retaining the old cookie is no longer authenticated.
    old_client=TestClient(app);old_client.cookies.set(auth.COOKIE,old_cookie)
    assert old_client.get('/api/auth/me').status_code==401
    assert client.post('/api/auth/login',json={'email':'new@example.test','password':'StrongTest123!'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'new@example.test','password':'ChangedTest123!'}).status_code==200

def test_two_factor_requires_confirmation_and_challenge(client):
    secret,codes,used_step=setup(client)
    assert len(codes)==8 and len(set(codes))==8
    assert client.get('/api/auth/me').json()['user']['two_factor_enabled']
    client.post('/api/auth/logout',json={})
    result=client.post('/api/auth/login',json={'email':'new@example.test','password':'StrongTest123!'}).json()
    assert result['requires_two_factor'] and 'user' not in result
    assert client.get('/api/auth/me').status_code==401
    # Setup code may not be replayed for login.
    assert client.post('/api/auth/verify',json={'challenge':result['challenge'],'code':auth.totp(secret,used_step)}).status_code==401
    assert client.post('/api/auth/verify',json={'challenge':result['challenge'],'code':codes[0]}).status_code==200
    assert client.post('/api/auth/verify',json={'challenge':result['challenge'],'code':codes[1]}).status_code==401
    client.post('/api/auth/logout',json={})
    challenge=client.post('/api/auth/login',json={'email':'new@example.test','password':'StrongTest123!'}).json()['challenge']
    assert client.post('/api/auth/verify',json={'challenge':challenge,'code':codes[0]}).status_code==401
    assert client.post('/api/auth/verify',json={'challenge':challenge,'code':codes[1]}).status_code==200

def test_totp_login_and_disable(client,monkeypatch):
    secret,codes,step=setup(client)
    clock=step*30+31
    monkeypatch.setattr(auth.time,'time',lambda:clock)
    client.post('/api/auth/logout',json={})
    result=client.post('/api/auth/login',json={'email':'new@example.test','password':'StrongTest123!'}).json()
    assert client.post('/api/auth/verify',json={'challenge':result['challenge'],'code':auth.totp(secret,step+1)}).status_code==200
    assert client.post('/api/auth/2fa/disable',json={'password':'StrongTest123!','code':codes[0]}).status_code==200
    assert not client.get('/api/auth/me').json()['user']['two_factor_enabled']
    client.post('/api/auth/logout',json={})
    assert 'user' in client.post('/api/auth/login',json={'email':'new@example.test','password':'StrongTest123!'}).json()

def test_rate_limit_and_origin(client):
    register(client)
    for _ in range(10):client.post('/api/auth/login',json={'email':'new@example.test','password':'wrong'})
    assert client.post('/api/auth/login',json={'email':'new@example.test','password':'wrong'}).status_code==429
    assert client.post('/api/auth/logout',json={},headers={'Origin':'https://untrusted.example'}).status_code==403

def test_pending_setup_does_not_enable_2fa(client):
    register(client)
    client.post('/api/auth/2fa/setup',json={'password':'StrongTest123!'})
    assert not client.get('/api/auth/me').json()['user']['two_factor_enabled']
    assert client.post('/api/auth/2fa/enable',json={'code':'000000'}).status_code==401

def test_totp_rfc6238_vectors():
    secret=base64.b32encode(b'12345678901234567890').decode()
    assert auth.totp(secret,59//30,8)=='94287082'
    assert auth.totp(secret,1111111109//30,8)=='07081804'
    assert auth.totp(secret,20000000000//30,8)=='65353130'
