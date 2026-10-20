"""Local persistent authentication. Business data still uses the demo store."""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import struct
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from typing import Literal
from app.core.config import CORS_ORIGINS

router = APIRouter(prefix='/auth', tags=['Accounts & security'])
COOKIE = 'preora_session'
ITERATIONS = 600_000

@router.get('/admin/users')
def admin_users(request: Request,response: Response):
    response.headers['Cache-Control']='no-store'
    with database() as db:
        user=current_user(db,request)
        if user['role']!='admin':raise HTTPException(403,'Chỉ quản trị viên được tra cứu tài khoản.')
        return {'users':[user_info(row) for row in db.execute('SELECT * FROM accounts ORDER BY name,id').fetchall()]}

def password_hash(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
    return f'pbkdf2_sha256${ITERATIONS}${salt}${digest}'

def verify_password(password, encoded):
    try:
        _, iterations, salt, expected = encoded.split('$')
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError): return False

def digest(value): return hashlib.sha256(value.encode()).hexdigest()

def totp(secret, step, digits=6):
    key = base64.b32decode(secret + '=' * (-len(secret) % 8))
    value = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest()
    offset = value[-1] & 15
    return str((struct.unpack('>I', value[offset:offset + 4])[0] & 0x7fffffff) % (10 ** digits)).zfill(digits)

def matching_step(secret, code, last_step=-1):
    if not re.fullmatch(r'\d{6}', code): return None
    now = int(time.time() // 30)
    for step in [now, now - 1, now + 1]:
        if step > last_step and hmac.compare_digest(totp(secret, step), code): return step
    return None

@contextmanager
def database():
    path = Path(os.getenv('AUTH_DATABASE_PATH', str(Path(__file__).resolve().parents[4] / 'data' / 'accounts.sqlite3')))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript('''
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, password TEXT NOT NULL, totp_secret TEXT, pending_secret TEXT, pending_expires REAL, last_step INTEGER NOT NULL DEFAULT -1, recovery TEXT NOT NULL DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires REAL NOT NULL);
    ''')
    # Provision only the five explicit demo credentials, never reset existing passwords or 2FA.
    samples = [('customer-demo','customer@preora.demo','Nguyễn Minh Anh','customer'), ('seller-aurora','seller@preora.demo','Aurora Lab','seller'), ('seller-auralis','seller.b@preora.demo','Auralis Studio','seller'), ('admin-demo','admin@preora.demo','Lê Khánh','admin'), ('partner-demo','partner@preora.demo','VietCraft Manufacturing','partner')]
    for uid, email, name, role in samples:
        if not db.execute('SELECT 1 FROM accounts WHERE id=?', (uid,)).fetchone():
            db.execute('INSERT OR IGNORE INTO accounts(id,email,name,role,password) VALUES(?,?,?,?,?)', (uid,email,name,role,password_hash('Demo123!')))
    db.commit()
    try:
        db.execute('BEGIN IMMEDIATE')
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally: db.close()

def throttle(db, key, limit=10):
    now = time.time()
    db.execute('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.expires<? THEN 1 ELSE limits.count+1 END, expires=CASE WHEN limits.expires<? THEN excluded.expires ELSE limits.expires END', (key, now + 300, now, now))
    row = db.execute('SELECT count FROM limits WHERE key=?',(key,)).fetchone()
    db.commit()  # Persist failed attempts, including requests that later raise HTTPException.
    db.execute('BEGIN IMMEDIATE')
    if row['count'] > limit: raise HTTPException(429,'Bạn đã thử quá nhiều lần. Vui lòng đợi 5 phút.')

def origin_guard(request: Request):
    origin = request.headers.get('origin')
    if origin and origin not in CORS_ORIGINS:
        raise HTTPException(403,'Nguồn yêu cầu không hợp lệ.')

def user_info(row):
    return {'id':row['id'],'email':row['email'],'name':row['name'],'role':row['role'],'two_factor_enabled':bool(row['totp_secret'])}

def current_user(db, request):
    token=request.cookies.get(COOKIE,'')
    row=db.execute('SELECT a.* FROM accounts a JOIN sessions s ON a.id=s.user_id WHERE s.token=? AND s.expires>?',(digest(token),time.time())).fetchone()
    if not row: raise HTTPException(401,'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    return row

def issue_session(db,response,user):
    token=secrets.token_urlsafe(32)
    db.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
    db.execute('INSERT INTO sessions VALUES(?,?,?)',(digest(token),user['id'],time.time()+43200))
    response.set_cookie(COOKIE,token,httponly=True,samesite='strict',secure=os.getenv('AUTH_COOKIE_SECURE','false').lower()=='true',max_age=43200,path='/api')
    response.headers['Cache-Control']='no-store'
    return {'user':user_info(user)}

def second_factor(db,user,code):
    if not user['totp_secret']: return
    step=matching_step(user['totp_secret'],code,user['last_step'])
    if step is not None:
        db.execute('UPDATE accounts SET last_step=? WHERE id=?',(step,user['id']))
        return
    codes=json.loads(user['recovery'])
    hashed=digest(code.strip().upper())
    if hashed in codes:
        codes.remove(hashed)
        db.execute('UPDATE accounts SET recovery=? WHERE id=?',(json.dumps(codes),user['id']))
        return
    raise HTTPException(401,'Mã xác thực không đúng, đã dùng hoặc hết hạn. Hãy đợi mã mới hoặc dùng mã khôi phục.')

class Login(BaseModel):
    email: str = Field(min_length=3,max_length=254)
    password: str = Field(min_length=1,max_length=128)
class Register(Login):
    name: str = Field(min_length=2,max_length=100)
    role: Literal['customer','seller'] = 'customer'
class Verify(BaseModel):
    challenge: str = Field(min_length=20,max_length=100)
    code: str = Field(min_length=6,max_length=32)
class Reauth(BaseModel):
    password: str = Field(min_length=1,max_length=128)
    code: str = Field(default='',max_length=32)
class ChangePassword(Reauth):
    new_password: str = Field(min_length=10,max_length=128)
class Code(BaseModel):
    code: str = Field(min_length=6,max_length=32)

def validate_new_password(password):
    if len(password)<10: raise HTTPException(422,'Mật khẩu mới cần ít nhất 10 ký tự.')

@router.post('/register', dependencies=[Depends(origin_guard)])
def register(payload:Register,request:Request,response:Response):
    email=payload.email.strip().lower();name=payload.name.strip()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(name)<2: raise HTTPException(422,'Vui lòng nhập tên và email hợp lệ.')
    validate_new_password(payload.password)
    with database() as db:
        throttle(db,'register:'+str(request.client.host if request.client else 'local'),20)
        if db.execute('SELECT 1 FROM accounts WHERE email=?',(email,)).fetchone(): raise HTTPException(409,'Email này đã được đăng ký.')
        uid='user-'+secrets.token_hex(12)
        db.execute('INSERT INTO accounts(id,email,name,role,password) VALUES(?,?,?,?,?)',(uid,email,name,payload.role,password_hash(payload.password)))
        return issue_session(db,response,db.execute('SELECT * FROM accounts WHERE id=?',(uid,)).fetchone())

@router.post('/login', dependencies=[Depends(origin_guard)])
def login(payload:Login,response:Response):
    with database() as db:
        throttle(db,'login:'+digest(payload.email.strip().lower()))
        user=db.execute('SELECT * FROM accounts WHERE email=?',(payload.email.strip().lower(),)).fetchone()
        if not user or not verify_password(payload.password,user['password']): raise HTTPException(401,'Email hoặc mật khẩu không đúng.')
        if user['totp_secret']:
            challenge=secrets.token_urlsafe(32)
            db.execute('DELETE FROM challenges WHERE expires<?',(time.time(),))
            db.execute('INSERT INTO challenges VALUES(?,?,?)',(digest(challenge),user['id'],time.time()+300))
            return {'requires_two_factor':True,'challenge':challenge}
        return issue_session(db,response,user)

@router.post('/verify', dependencies=[Depends(origin_guard)])
def verify(payload:Verify,response:Response):
    with database() as db:
        challenge=db.execute('SELECT * FROM challenges WHERE token=? AND expires>?',(digest(payload.challenge),time.time())).fetchone()
        if not challenge: raise HTTPException(401,'Yêu cầu xác thực đã hết hạn. Vui lòng đăng nhập lại.')
        throttle(db,'verify:'+challenge['user_id'])
        challenge=db.execute('SELECT * FROM challenges WHERE token=? AND expires>?',(digest(payload.challenge),time.time())).fetchone()
        if not challenge: raise HTTPException(401,'Yêu cầu xác thực đã được dùng hoặc hết hạn.')
        user=db.execute('SELECT * FROM accounts WHERE id=?',(challenge['user_id'],)).fetchone()
        second_factor(db,user,payload.code)
        db.execute('DELETE FROM challenges WHERE token=?',(digest(payload.challenge),))
        return issue_session(db,response,user)

@router.get('/me')
def me(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    with database() as db:return {'user':user_info(current_user(db,request))}

@router.post('/logout', dependencies=[Depends(origin_guard)])
def logout(request:Request,response:Response):
    with database() as db:db.execute('DELETE FROM sessions WHERE token=?',(digest(request.cookies.get(COOKIE,'')),))
    response.delete_cookie(COOKIE,path='/api')
    return {'ok':True}

@router.post('/password', dependencies=[Depends(origin_guard)])
def change_password(payload:ChangePassword,request:Request,response:Response):
    validate_new_password(payload.new_password)
    with database() as db:
        user=current_user(db,request);throttle(db,'security:'+user['id'])
        user=current_user(db,request)
        if not verify_password(payload.password,user['password']): raise HTTPException(401,'Mật khẩu hiện tại không đúng.')
        second_factor(db,user,payload.code)
        if verify_password(payload.new_password,user['password']):raise HTTPException(422,'Mật khẩu mới cần khác mật khẩu hiện tại.')
        db.execute('UPDATE accounts SET password=? WHERE id=?',(password_hash(payload.new_password),user['id']))
        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        db.execute('DELETE FROM challenges WHERE user_id=?',(user['id'],))
        return issue_session(db,response,user)

@router.post('/2fa/setup', dependencies=[Depends(origin_guard)])
def setup(payload:Reauth,request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    with database() as db:
        user=current_user(db,request);throttle(db,'security:'+user['id'])
        user=current_user(db,request)
        if not verify_password(payload.password,user['password']):raise HTTPException(401,'Mật khẩu hiện tại không đúng.')
        if user['totp_secret']:raise HTTPException(409,'Xác thực hai lớp đã được bật.')
        secret=base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')
        db.execute('UPDATE accounts SET pending_secret=?,pending_expires=? WHERE id=?',(secret,time.time()+600,user['id']))
        uri=f"otpauth://totp/{quote('PREORA:'+user['email'],safe='')}?secret={secret}&issuer=PREORA&algorithm=SHA1&digits=6&period=30"
        return {'secret':secret,'uri':uri}

@router.post('/2fa/enable', dependencies=[Depends(origin_guard)])
def enable(payload:Code,request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    with database() as db:
        user=current_user(db,request);throttle(db,'security:'+user['id'])
        user=current_user(db,request)
        if not user['pending_secret'] or (user['pending_expires'] or 0)<time.time():raise HTTPException(400,'Thiết lập đã hết hạn. Hãy bắt đầu lại.')
        step=matching_step(user['pending_secret'],payload.code)
        if step is None:raise HTTPException(401,'Mã xác thực không đúng hoặc đã hết hạn.')
        codes=[secrets.token_hex(8).upper() for _ in range(8)]
        db.execute('UPDATE accounts SET totp_secret=pending_secret,pending_secret=NULL,pending_expires=NULL,last_step=?,recovery=? WHERE id=?',(step,json.dumps([digest(code) for code in codes]),user['id']))
        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        db.execute('DELETE FROM challenges WHERE user_id=?',(user['id'],))
        fresh=db.execute('SELECT * FROM accounts WHERE id=?',(user['id'],)).fetchone()
        result=issue_session(db,response,fresh)
        return {**result,'recovery_codes':codes}

@router.post('/2fa/disable', dependencies=[Depends(origin_guard)])
def disable(payload:Reauth,request:Request,response:Response):
    with database() as db:
        user=current_user(db,request);throttle(db,'security:'+user['id'])
        user=current_user(db,request)
        if not verify_password(payload.password,user['password']):raise HTTPException(401,'Mật khẩu hiện tại không đúng.')
        second_factor(db,user,payload.code)
        db.execute("UPDATE accounts SET totp_secret=NULL,pending_secret=NULL,pending_expires=NULL,last_step=-1,recovery='[]' WHERE id=?",(user['id'],))
        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        db.execute('DELETE FROM challenges WHERE user_id=?',(user['id'],))
        return issue_session(db,response,db.execute('SELECT * FROM accounts WHERE id=?',(user['id'],)).fetchone())
