"""Account-owned legal document submissions and auditable manual review."""
import base64,hashlib,json,re,uuid
from datetime import datetime,timezone
from urllib.parse import quote
from fastapi import APIRouter,HTTPException,Request,Response
from pydantic import BaseModel,ConfigDict,Field
from .auth import database,current_user,origin_guard
router=APIRouter(prefix='/verification',tags=['Seller verification'])

def init(db):
 db.execute('CREATE TABLE IF NOT EXISTS seller_verifications(owner TEXT PRIMARY KEY,data TEXT NOT NULL)')
 db.execute('CREATE TABLE IF NOT EXISTS seller_documents(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,sha256 TEXT NOT NULL,content BLOB NOT NULL,created TEXT NOT NULL)')

def identity(db,request,role):
 user=current_user(db,request)
 if user['role']!=role:raise HTTPException(403,'Không có quyền thao tác hồ sơ này.')
 init(db);return user

def read(db,owner):
 row=db.execute('SELECT data FROM seller_verifications WHERE owner=?',(owner,)).fetchone()
 return json.loads(row['data']) if row else None

def save(db,owner,data):db.execute('INSERT INTO seller_verifications VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',(owner,json.dumps(data,ensure_ascii=False)))

class Document(BaseModel):
 name:str=Field(min_length=1,max_length=180)
 content:str=Field(min_length=1,max_length=4_200_000)

class Submission(BaseModel):
 model_config=ConfigDict(str_strip_whitespace=True)
 companyName:str=Field(min_length=2,max_length=200)
 taxId:str=Field(pattern=r'^\d{10}(?:-?\d{3})?$')
 registrationNumber:str=Field(min_length=3,max_length=100)
 representative:str=Field(min_length=2,max_length=100)
 address:str=Field(min_length=8,max_length=300)
 email:str=Field(pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$',max_length=200)
 document:Document|None=None
 confirmed:bool
 revision:int=Field(default=0,ge=0)

@router.get('/me')
def mine(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  user=identity(db,request,'seller');return {'profile':read(db,user['id'])}

@router.post('/me')
def submit(payload:Submission,request:Request):
 origin_guard(request)
 if not payload.confirmed:raise HTTPException(422,'Cần xác nhận nguồn tài liệu trước khi gửi.')
 with database() as db:
  user=identity(db,request,'seller');return store_owned_submission(db,user,payload)

def store_owned_submission(db,user,payload):
 old=read(db,user['id'])
 if payload.revision!=(old or {}).get('revision',0):raise HTTPException(409,'Hồ sơ đã thay đổi. Tải lại trước khi gửi.')
 now=datetime.now(timezone.utc).isoformat();document=(old or {}).get('document')
 if payload.document:
  try:content=base64.b64decode(payload.document.content,validate=True)
  except ValueError:raise HTTPException(422,'File không hợp lệ.')
  if not 1<=len(content)<=3_000_000:raise HTTPException(422,'File tối đa 3 MB.')
  mime='application/pdf' if content.startswith(b'%PDF-') else 'image/png' if content.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if content.startswith(b'\xff\xd8\xff') else None
  if not mime:raise HTTPException(422,'Chỉ nhận nội dung PDF, PNG hoặc JPEG.')
  doc_id=uuid.uuid4().hex;digest=hashlib.sha256(content).hexdigest();name=re.sub(r'[\r\n/\\]','_',payload.document.name)
  db.execute('INSERT INTO seller_documents VALUES(?,?,?,?,?,?,?)',(doc_id,user['id'],name,mime,digest,content,now))
  document={'id':doc_id,'name':name,'mime':mime,'sha256':digest,'uploadedAt':now,'size':len(content)}
 if not document:raise HTTPException(422,'Cần tải giấy đăng ký/giấy phép kinh doanh.')
 profile={**payload.model_dump(exclude={'document','confirmed','revision'}),'document':document,'revision':(old or {}).get('revision',0)+1,'status':'submitted','submittedAt':now,'history':(old or {}).get('history',[])+[{'status':'submitted','at':now,'actor':user['id'],'documentHash':document['sha256']}]}
 save(db,user['id'],profile);return {'profile':profile}

@router.get('/admin')
def all_profiles(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  identity(db,request,'admin');return {'sellers':[{'id':row['id'],'name':row['name'],'email':row['email'],'profile':read(db,row['id'])} for row in db.execute("SELECT id,name,email FROM accounts WHERE role='seller' ORDER BY name")]}

class Review(BaseModel):
 model_config=ConfigDict(str_strip_whitespace=True)
 status:str=Field(pattern=r'^(approved|needs_changes|rejected)$')
 note:str=Field(min_length=10,max_length=2000)
 registryReference:str=Field(default='',max_length=1000)
 checks:dict[str,bool]=Field(default_factory=dict)
 revision:int=Field(ge=1)

@router.post('/admin/{owner}')
def review(owner:str,payload:Review,request:Request):
 origin_guard(request)
 with database() as db:
  user=identity(db,request,'admin');profile=read(db,owner)
  if not profile:raise HTTPException(404,'Người bán chưa nộp hồ sơ.')
  if payload.revision!=profile['revision']:raise HTTPException(409,'Hồ sơ đã được nộp lại; cần xem bản mới.')
  required=['readable','registrationMatches','taxIdMatches','representativeMatches','legalStatusActive']
  if payload.status=='approved' and (not all(payload.checks.get(k) for k in required) or len(payload.registryReference.strip())<10):raise HTTPException(422,'Cần đối chiếu đủ checklist và ghi nguồn/mã đối chiếu trước khi xác minh.')
  event={**payload.model_dump(exclude={'revision'}),'at':datetime.now(timezone.utc).isoformat(),'actor':user['id'],'documentHash':profile['document']['sha256']}
  profile={**profile,'status':payload.status,'review':event,'history':profile['history']+[event]};save(db,owner,profile);return {'profile':profile}

@router.get('/documents/{doc_id}')
def download(doc_id:str,request:Request):
 with database() as db:
  user=current_user(db,request);init(db);doc=db.execute('SELECT * FROM seller_documents WHERE id=?',(doc_id,)).fetchone()
  if not doc or (user['role']!='admin' and doc['owner']!=user['id']):raise HTTPException(404,'Không tìm thấy tài liệu thuộc quyền tài khoản.')
  return Response(bytes(doc['content']),media_type=doc['mime'],headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(doc['name']),'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'})
