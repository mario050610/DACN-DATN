"""Partner-only submissions; no access to seller-only profile endpoints."""
from fastapi import APIRouter,Request,Response,HTTPException
from .auth import database,current_user,origin_guard
from .verification import Submission,init,read,store_owned_submission
router=APIRouter(prefix='/partner-verification',tags=['Partner verification'])
@router.get('/me')
def mine(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  u=current_user(db,request)
  if u['role']!='partner':raise HTTPException(403,'Endpoint chỉ dành cho đối tác.')
  init(db);return {'profile':read(db,u['id'])}
@router.post('/me')
def submit(payload:Submission,request:Request):
 origin_guard(request)
 if not payload.confirmed:raise HTTPException(422,'Cần xác nhận quyền cung cấp tài liệu.')
 with database() as db:
  u=current_user(db,request)
  if u['role']!='partner':raise HTTPException(403,'Endpoint chỉ dành cho đối tác.')
  init(db);return store_owned_submission(db,u,payload)
@router.get('/admin')
def directory(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  u=current_user(db,request)
  if u['role']!='admin':raise HTTPException(403,'Chỉ quản trị viên được xem hồ sơ đối tác.')
  init(db);return {'partners':[{'id':r['id'],'name':r['name'],'email':r['email'],'profile':read(db,r['id'])} for r in db.execute("SELECT id,name,email FROM accounts WHERE role='partner' ORDER BY name,id")]}
