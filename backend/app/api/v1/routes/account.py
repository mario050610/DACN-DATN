from fastapi import APIRouter,Request,Response,HTTPException
from .auth import database,current_user,origin_guard,user_info
from .community import init,profile_data
from . import verification
from app.services.account_profiles import Details,private_data,save_details
from app.services import lifecycle as core
router=APIRouter(prefix='/account',tags=['Role profiles'])
def details(db,u):
 init(db);verification.init(db);legal=verification.read(db,u['id']);status=(legal or {}).get('status','not_submitted')
 return {'user':user_info(u),'phone':u['phone'],'profile':{**private_data(db,u['id']),**profile_data(db,u['id']).get('business',{})},'avatar':profile_data(db,u['id']).get('avatar'),'verificationStatus':status,'cooperationStatus':'active' if status=='approved' else 'pending_review' if status=='submitted' else 'not_verified','legalProfile':legal if u['role'] in ('seller','partner') else None}
@router.get('/me')
def mine(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:return details(db,current_user(db,request))
@router.post('/me')
def update(payload:Details,request:Request):
 origin_guard(request)
 with database() as db:
  u=current_user(db,request)
  if u['role']=='seller' and (len(payload.storeName)<2 or not payload.businessType or not payload.mainCategory):raise HTTPException(422,'Cần tên cửa hàng, loại hình kinh doanh và danh mục chính.')
  if u['role']=='partner' and (len(payload.organizationName)<2 or not payload.partnerType):raise HTTPException(422,'Cần tên tổ chức và loại hình đối tác.')
  save_details(db,u,payload);return details(db,db.execute('SELECT * FROM accounts WHERE id=?',(u['id'],)).fetchone())
@router.get('/activity')
def activity(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  u=current_user(db,request);s,_=core.load(db);init(db)
  own=core.scoped(s,u)['orders'] if u['role']=='customer' else []
  feedback=[{'id':f['id'],'productId':f.get('productId') or next((c['productId'] for c in s['campaigns'] if c['id']==f['campaignId']),None),'text':f['text'],'stage':'PRE_PRODUCTION','at':f['at'],'status':f['status']} for f in core.items(db,'feedback') if f['authorId']==u['id']]
  feedback +=[{'id':f['id'],'productId':f['productId'],'text':f['text'],'stage':'POST_PRODUCTION','at':f['at'],'status':f['status'],'stars':f['stars']} for f in core.items(db,'review') if f['authorId']==u['id']]
  follows=[dict(r) for r in db.execute('SELECT target,created FROM community_follows WHERE owner=?',(u['id'],))]
  return {'orders':own,'feedback':sorted(feedback,key=lambda x:x['at'],reverse=True),'followingProfiles':follows,'followingProducts':[f for f in core.items(db,'productFollow') if f['userId']==u['id'] and f.get('following')]}
