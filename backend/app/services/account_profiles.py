"""Additive account migration; public role fields reuse community_profiles."""
import json,re
from datetime import datetime,timezone
from pydantic import BaseModel,ConfigDict,Field,field_validator
from typing import Literal

TERMS_VERSION='2026-11-02'
def migrate(db):
 columns={r[1] for r in db.execute('PRAGMA table_info(accounts)')}
 for name,definition in [('phone',"TEXT NOT NULL DEFAULT ''"),('terms_version',"TEXT NOT NULL DEFAULT ''"),('terms_accepted_at','TEXT'),('created_at','TEXT')]:
  if name not in columns:db.execute(f'ALTER TABLE accounts ADD COLUMN {name} {definition}')
 db.execute('CREATE TABLE IF NOT EXISTS account_details(owner TEXT PRIMARY KEY REFERENCES accounts(id),data TEXT NOT NULL)')
def normalize_phone(value):
 cleaned=re.sub(r'[\s().-]','',value)
 if not re.fullmatch(r'\+?[0-9]{8,15}',cleaned):raise ValueError('Số điện thoại cần 8–15 chữ số, có thể bắt đầu bằng +.')
 return cleaned
class Details(BaseModel):
 model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
 name:str=Field(min_length=2,max_length=100)
 phone:str=Field(min_length=8,max_length=30)
 shippingAddress:str=Field(default='',max_length=500)
 storeName:str=Field(default='',max_length=150)
 businessType:Literal['','individual','household','company']=''
 mainCategory:str=Field(default='',max_length=100)
 description:str=Field(default='',max_length=2000)
 businessAddress:str=Field(default='',max_length=300)
 organizationName:str=Field(default='',max_length=150)
 partnerType:Literal['','manufacturing','supplier','logistics','other']=''
 contactPerson:str=Field(default='',max_length=100)
 activityField:str=Field(default='',max_length=150)
 capabilities:str=Field(default='',max_length=2000)
 serviceArea:str=Field(default='',max_length=200)
 @field_validator('phone')
 @classmethod
 def phone_valid(cls,v):return normalize_phone(v)

def private_data(db,uid):
 row=db.execute('SELECT data FROM account_details WHERE owner=?',(uid,)).fetchone();return json.loads(row['data']) if row else {}
def save_details(db,user,payload):
 from app.api.v1.routes.community import init,profile_data,put_profile
 init(db);uid=user['id'];role=user['role'];public=profile_data(db,uid);values=payload.model_dump()
 keys=['storeName','businessType','mainCategory','description','businessAddress'] if role=='seller' else ['organizationName','partnerType','contactPerson','activityField','capabilities','serviceArea'] if role=='partner' else []
 business={k:values[k] for k in keys}
 public={**public,'business':business,'updatedAt':datetime.now(timezone.utc).isoformat()}
 if business.get('storeName') or business.get('organizationName'):public['displayName']=business.get('storeName') or business['organizationName']
 put_profile(db,uid,public)
 private={'shippingAddress':payload.shippingAddress if role=='customer' else ''}
 db.execute('INSERT INTO account_details VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',(uid,json.dumps(private,ensure_ascii=False)))
 db.execute('UPDATE accounts SET name=?,phone=? WHERE id=?',(payload.name,payload.phone,uid))
 if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='lifecycle_state'").fetchone():db.execute('UPDATE lifecycle_state SET revision=revision+1 WHERE id=1')
