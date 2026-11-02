"""Public profiles/posts, explicit follows and account-private conversations."""
import base64,hashlib,json,time,uuid
from datetime import date,datetime,timezone
from pathlib import Path
from typing import Literal
from fastapi import APIRouter,Request,Response,HTTPException
from pydantic import BaseModel,ConfigDict,Field,model_validator
from .auth import database,current_user,origin_guard
router=APIRouter(prefix='/community',tags=['Community'])
RULE_VERSION='community-v1'
RULES=['Tôn trọng người khác; không quấy rối, đe dọa hoặc kích động thù ghét.','Không đăng thông tin sai lệch về sản phẩm, tiến độ, giá hoặc khả năng sản xuất.','Không đăng dữ liệu cá nhân, mật khẩu, OTP hay tài liệu pháp lý của người khác.','Chỉ chia sẻ nội dung/hình ảnh có quyền sử dụng; không spam, lừa đảo hoặc hàng hóa bị cấm.','Không dùng bài viết/chat để giả mạo giao dịch; dùng quy trình đặt hàng của PREORA.','Có thể báo cáo nội dung; admin xem xét và ẩn vi phạm, ghi lý do.']
SEED=json.loads((Path(__file__).resolve().parents[5]/'database/seeds/sample_data.json').read_text(encoding='utf-8'))
SEED_USERS={u['id']:{k:u[k] for k in ('id','name','role')} for u in SEED['users']}

def init(db):
 for sql in [
 'CREATE TABLE IF NOT EXISTS community_profiles(owner TEXT PRIMARY KEY,data TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS community_media(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,parent TEXT,mime TEXT NOT NULL,content BLOB NOT NULL)',
 'CREATE TABLE IF NOT EXISTS community_posts(id TEXT PRIMARY KEY,owner TEXT NOT NULL,text TEXT NOT NULL,image TEXT,status TEXT NOT NULL,created REAL NOT NULL,updated REAL NOT NULL,reason TEXT)',
 'CREATE TABLE IF NOT EXISTS community_follows(owner TEXT NOT NULL,target TEXT NOT NULL,created REAL NOT NULL,PRIMARY KEY(owner,target))',
 'CREATE TABLE IF NOT EXISTS community_messages(id TEXT PRIMARY KEY,sender TEXT NOT NULL,receiver TEXT NOT NULL,text TEXT NOT NULL,created REAL NOT NULL,seen INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS community_reports(id TEXT PRIMARY KEY,post TEXT NOT NULL,reporter TEXT NOT NULL,reason TEXT NOT NULL,created REAL NOT NULL,resolved INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS community_notifications(id TEXT PRIMARY KEY,receiver TEXT NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,entity TEXT,created REAL NOT NULL,seen INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS partner_capacity(owner TEXT PRIMARY KEY,data TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS community_decisions(id TEXT PRIMARY KEY,report TEXT NOT NULL,reviewer TEXT NOT NULL,reason TEXT NOT NULL,hidden INTEGER NOT NULL,created REAL NOT NULL)']:
  db.execute(sql)

def actor(db,request):
 user=current_user(db,request);init(db);return user

def public_user(db,uid):
 row=db.execute('SELECT id,name,role FROM accounts WHERE id=?',(uid,)).fetchone()
 if row:return {**dict(row),'activeAccount':True}
 if uid in SEED_USERS:return {**SEED_USERS[uid],'activeAccount':False}
 raise HTTPException(404,'Không tìm thấy hồ sơ.')

def profile_data(db,uid):
 row=db.execute('SELECT data FROM community_profiles WHERE owner=?',(uid,)).fetchone();return json.loads(row['data']) if row else {}

def put_profile(db,uid,data):db.execute('INSERT INTO community_profiles VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',(uid,json.dumps(data,ensure_ascii=False)))

def notify(db,receiver,who,kind,entity=''):
 if receiver!=who:db.execute('INSERT INTO community_notifications(id,receiver,actor,kind,entity,created) VALUES(?,?,?,?,?,?)',(uuid.uuid4().hex,receiver,who,kind,entity,time.time()))

def iso(t):return datetime.fromtimestamp(t,timezone.utc).isoformat()

def image(db,uid,kind,parent,payload):
 try:raw=base64.b64decode(payload.content,validate=True)
 except ValueError:raise HTTPException(422,'Nội dung ảnh không hợp lệ.')
 if not 1<=len(raw)<=2_000_000:raise HTTPException(422,'Ảnh tối đa 2 MB.')
 mime='image/png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if raw.startswith(b'\xff\xd8\xff') else 'image/webp' if raw.startswith(b'RIFF') and raw[8:12]==b'WEBP' else None
 if not mime:raise HTTPException(422,'Chỉ nhận PNG, JPEG hoặc WebP; không nhận SVG/HTML.')
 mid=uuid.uuid4().hex;db.execute('INSERT INTO community_media VALUES(?,?,?,?,?,?)',(mid,uid,kind,parent,mime,raw));return mid

class Clean(BaseModel):model_config=ConfigDict(str_strip_whitespace=True)
class Image(Clean):content:str=Field(min_length=1,max_length=2_700_000)
class Profile(Clean):
 displayName:str=Field(min_length=2,max_length=100)
 bio:str=Field(default='',max_length=1000)
 field:str=Field(default='',max_length=100)
 location:str=Field(default='',max_length=150)
class Follow(Clean):following:bool
class Post(Clean):
 text:str=Field(min_length=2,max_length=5000)
 rulesAccepted:Literal[True]
 ruleVersion:Literal['community-v1']='community-v1'
 image:Image|None=None
class Message(Clean):text:str=Field(min_length=1,max_length=2000)
class Reason(Clean):reason:str=Field(min_length=10,max_length=1000)

@router.get('/rules')
def rules():return {'version':RULE_VERSION,'rules':RULES,'moderation':'Báo cáo được đối chiếu thủ công; không tự khẳng định nội dung đúng hoặc hợp pháp.'}

@router.get('/profiles')
def directory(response:Response,q:str='',role:str='',offset:int=0):
 response.headers['Cache-Control']='no-store'
 if len(q)>100 or role not in ('','customer','seller','admin','partner') or not 0<=offset<=10000:raise HTTPException(422,'Bộ lọc không hợp lệ.')
 with database() as db:
  init(db);users={**SEED_USERS,**{r['id']:dict(r) for r in db.execute('SELECT id,name,role FROM accounts')}};items=[]
  for uid,user in users.items():
   extra=profile_data(db,uid);name=extra.get('displayName') or user['name']
   if (not role or user['role']==role) and q.casefold() in name.casefold():items.append({**user,'displayName':name,'field':extra.get('field',''),'avatar':extra.get('avatar')})
  items.sort(key=lambda u:(u['displayName'].casefold(),u['id']))
  return {'profiles':items[offset:offset+30],'hasMore':len(items)>offset+30}

@router.get('/profiles/{uid}')
def profile(uid:str,request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  init(db);user=public_user(db,uid);raw=profile_data(db,uid);extra={k:raw[k] for k in ('displayName','bio','field','location','avatar','cover','updatedAt') if k in raw}
  keys=('storeName','businessType','mainCategory','description','businessAddress') if user['role']=='seller' else ('organizationName','partnerType','contactPerson','activityField','capabilities','serviceArea') if user['role']=='partner' else ()
  extra['business']={k:raw.get('business',{})[k] for k in keys if k in raw.get('business',{})}
  from .verification import init as legal_init,read as legal_read
  legal_init(db);extra['verificationStatus']=(legal_read(db,uid) or {}).get('status','not_submitted')
  try:viewer=current_user(db,request)['id']
  except HTTPException:viewer=None
  cap=db.execute('SELECT data FROM partner_capacity WHERE owner=?',(uid,)).fetchone()
  return {**user,**extra,'followers':db.execute('SELECT COUNT(*) FROM community_follows WHERE target=?',(uid,)).fetchone()[0],'following':db.execute('SELECT COUNT(*) FROM community_follows WHERE owner=?',(uid,)).fetchone()[0],'isFollowing':bool(viewer and db.execute('SELECT 1 FROM community_follows WHERE owner=? AND target=?',(viewer,uid)).fetchone()),'postCount':db.execute("SELECT COUNT(*) FROM community_posts WHERE owner=? AND status='published'",(uid,)).fetchone()[0],'capacity':json.loads(cap['data']) if cap else []}

@router.post('/me/profile')
def update_profile(payload:Profile,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);data={**profile_data(db,who['id']),**payload.model_dump(),'updatedAt':datetime.now(timezone.utc).isoformat()};put_profile(db,who['id'],data);return data

@router.post('/me/media/{kind}')
def update_media(kind:Literal['avatar','cover'],payload:Image,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);mid=image(db,who['id'],kind,None,payload);data={**profile_data(db,who['id']),kind:mid};put_profile(db,who['id'],data);return {kind:mid}

@router.get('/media/{mid}')
def media(mid:str):
 with database() as db:
  init(db);row=db.execute('SELECT * FROM community_media WHERE id=?',(mid,)).fetchone()
  if not row:raise HTTPException(404,'Không tìm thấy ảnh.')
  if row['kind']=='post' and not db.execute("SELECT 1 FROM community_posts WHERE id=? AND status='published'",(row['parent'],)).fetchone():raise HTTPException(404,'Ảnh không còn công khai.')
  if row['kind']=='review':
   review=db.execute("SELECT data FROM lifecycle_items WHERE kind='review' AND id=?",(row['parent'],)).fetchone()
   if not review or json.loads(review['data'])['status']!='published':raise HTTPException(404,'Ảnh đánh giá không còn công khai.')
  return Response(bytes(row['content']),media_type=row['mime'],headers={'X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=60'})

@router.post('/profiles/{uid}/follow')
def follow(uid:str,payload:Follow,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);public_user(db,uid)
  if uid==who['id']:raise HTTPException(422,'Không theo dõi chính mình.')
  if payload.following:
   added=db.execute('INSERT OR IGNORE INTO community_follows VALUES(?,?,?)',(who['id'],uid,time.time())).rowcount
   if added:notify(db,uid,who['id'],'follow',who['id'])
  else:db.execute('DELETE FROM community_follows WHERE owner=? AND target=?',(who['id'],uid))
  return {'following':payload.following}

@router.get('/profiles/{uid}/posts')
def posts(uid:str,response:Response,offset:int=0):
 response.headers['Cache-Control']='no-store'
 if not 0<=offset<=10000:raise HTTPException(422,'Trang không hợp lệ.')
 with database() as db:
  init(db);public_user(db,uid);rows=db.execute("SELECT * FROM community_posts WHERE owner=? AND status='published' ORDER BY created DESC LIMIT 21 OFFSET ?",(uid,offset)).fetchall()
  return {'posts':[{**dict(r),'createdAt':iso(r['created']),'updatedAt':iso(r['updated'])} for r in rows[:20]],'hasMore':len(rows)>20}

@router.post('/posts',status_code=201)
def publish(payload:Post,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request)
  if db.execute('SELECT COUNT(*) FROM community_posts WHERE owner=? AND created>?',(who['id'],time.time()-60)).fetchone()[0]>=5:raise HTTPException(429,'Tối đa 5 bài/phút; vui lòng chờ.')
  pid=uuid.uuid4().hex;mid=image(db,who['id'],'post',pid,payload.image) if payload.image else None;now=time.time()
  db.execute('INSERT INTO community_posts VALUES(?,?,?,?,?,?,?,?)',(pid,who['id'],payload.text,mid,'published',now,now,None));return {'id':pid}

@router.patch('/posts/{pid}')
def edit(pid:str,payload:Post,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);row=db.execute("SELECT * FROM community_posts WHERE id=? AND owner=? AND status='published'",(pid,who['id'])).fetchone()
  if not row:raise HTTPException(404,'Không tìm thấy bài thuộc quyền tài khoản.')
  db.execute('UPDATE community_posts SET text=?,updated=? WHERE id=?',(payload.text,time.time(),pid));return {'updated':True}

@router.delete('/posts/{pid}')
def delete(pid:str,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request)
  if not db.execute("UPDATE community_posts SET status='deleted',updated=? WHERE id=? AND owner=? AND status='published'",(time.time(),pid,who['id'])).rowcount:raise HTTPException(404,'Không tìm thấy bài thuộc quyền tài khoản.')
  return {'deleted':True}

@router.post('/posts/{pid}/report')
def report(pid:str,payload:Reason,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);row=db.execute("SELECT owner FROM community_posts WHERE id=? AND status='published'",(pid,)).fetchone()
  if not row:raise HTTPException(404,'Bài không còn công khai.')
  db.execute('INSERT INTO community_reports VALUES(?,?,?,?,?,0)',(uuid.uuid4().hex,pid,who['id'],payload.reason,time.time()));return {'reported':True}

@router.get('/moderation')
def moderation(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  who=actor(db,request)
  if who['role']!='admin':raise HTTPException(403,'Chỉ quản trị viên được xem báo cáo.')
  return {'reports':[dict(r) for r in db.execute('SELECT r.*,p.owner,p.text,p.status FROM community_reports r JOIN community_posts p ON p.id=r.post ORDER BY r.created DESC LIMIT 100')]}

class Decision(Reason):hide:bool
@router.post('/moderation/{report_id}')
def moderate(report_id:str,payload:Decision,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request)
  if who['role']!='admin':raise HTTPException(403,'Không có quyền duyệt báo cáo.')
  row=db.execute('SELECT r.*,p.owner FROM community_reports r JOIN community_posts p ON p.id=r.post WHERE r.id=?',(report_id,)).fetchone()
  if not row:raise HTTPException(404,'Không tìm thấy báo cáo.')
  if row['resolved']:raise HTTPException(409,'Báo cáo đã được xử lý; tải lại danh sách.')
  db.execute('INSERT INTO community_decisions(id,report,reviewer,reason,hidden,created) VALUES(?,?,?,?,?,?)',(uuid.uuid4().hex,report_id,who['id'],payload.reason,int(payload.hide),time.time()))
  if payload.hide:db.execute("UPDATE community_posts SET status='hidden',reason=?,updated=? WHERE id=?",(payload.reason,time.time(),row['post']))
  db.execute('UPDATE community_reports SET resolved=1 WHERE id=?',(report_id,));notify(db,row['owner'],who['id'],'moderation',row['post']);return {'resolved':True}

@router.get('/messages')
def inbox(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  who=actor(db,request);rows=db.execute('SELECT * FROM community_messages WHERE sender=? OR receiver=? ORDER BY created DESC LIMIT 500',(who['id'],who['id'])).fetchall();threads={}
  for row in rows:
   other=row['receiver'] if row['sender']==who['id'] else row['sender']
   if other not in threads:threads[other]={**public_user(db,other),'lastText':row['text'],'createdAt':iso(row['created']),'unread':0}
   if row['receiver']==who['id'] and not row['seen']:threads[other]['unread']+=1
  return {'threads':list(threads.values())}

@router.get('/messages/{uid}')
def conversation(uid:str,request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  who=actor(db,request);other=public_user(db,uid)
  rows=db.execute('SELECT * FROM community_messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY created DESC LIMIT 100',(who['id'],uid,uid,who['id'])).fetchall()
  db.execute('UPDATE community_messages SET seen=1 WHERE sender=? AND receiver=?',(uid,who['id']))
  return {'peer':other,'messages':[{**dict(r),'createdAt':iso(r['created'])} for r in reversed(rows)]}

@router.post('/messages/{uid}',status_code=201)
def send(uid:str,payload:Message,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);other=public_user(db,uid)
  if uid==who['id']:raise HTTPException(422,'Chọn tài khoản khác để chat.')
  if not other['activeAccount']:raise HTTPException(409,'Hồ sơ mẫu chưa có tài khoản nhận tin nhắn.')
  if db.execute('SELECT COUNT(*) FROM community_messages WHERE sender=? AND created>?',(who['id'],time.time()-60)).fetchone()[0]>=30:raise HTTPException(429,'Bạn gửi quá nhanh; vui lòng chờ.')
  mid=uuid.uuid4().hex;db.execute('INSERT INTO community_messages(id,sender,receiver,text,created) VALUES(?,?,?,?,?)',(mid,who['id'],uid,payload.text,time.time()));notify(db,uid,who['id'],'message',who['id']);return {'id':mid}

@router.get('/notifications')
def notifications(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  who=actor(db,request);rows=db.execute('SELECT * FROM community_notifications WHERE receiver=? ORDER BY created DESC LIMIT 30',(who['id'],)).fetchall()
  return {'notifications':[{**dict(r),'actorName':profile_data(db,r['actor']).get('displayName') or public_user(db,r['actor'])['name'],'createdAt':iso(r['created'])} for r in rows],'unread':db.execute('SELECT COUNT(*) FROM community_notifications WHERE receiver=? AND seen=0',(who['id'],)).fetchone()[0]}

@router.post('/notifications/read')
def read_notifications(request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request);db.execute('UPDATE community_notifications SET seen=1 WHERE receiver=?',(who['id'],));return {'read':True}

class Capacity(Clean):
 id:str=Field(min_length=1,max_length=50)
 category:str=Field(min_length=2,max_length=100)
 productType:str=Field(min_length=2,max_length=100)
 dailyUnits:int=Field(ge=1,le=1000000)
 batchSize:int=Field(ge=1,le=1000000)
 leadDays:int=Field(ge=0,le=365)
 committedUnits:int=Field(ge=0,le=100000000)
 availableFrom:date
 availableTo:date
 weekdays:list[int]=Field(min_length=1,max_length=7)
 @model_validator(mode='after')
 def dates(self):
  if self.availableTo<self.availableFrom or (self.availableTo-self.availableFrom).days>730 or any(d<0 or d>6 for d in self.weekdays) or len(set(self.weekdays))!=len(self.weekdays):raise ValueError('Khoảng ngày tối đa 730 ngày và ngày làm việc không trùng, trong 0..6.')
  return self
class Capacities(Clean):rows:list[Capacity]=Field(max_length=30)
@router.post('/me/capacity')
def capacity(payload:Capacities,request:Request):
 origin_guard(request)
 with database() as db:
  who=actor(db,request)
  if who['role']!='partner':raise HTTPException(403,'Chức năng dành cho đối tác sản xuất.')
  if len({r.id for r in payload.rows})!=len(payload.rows):raise HTTPException(422,'Mã dòng năng lực không được trùng.')
  db.execute('INSERT INTO partner_capacity VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',(who['id'],json.dumps([r.model_dump(mode='json') for r in payload.rows],ensure_ascii=False)));return {'rows':payload.model_dump(mode='json')['rows']}
