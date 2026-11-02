import math,uuid
from datetime import date,datetime,timezone
from fastapi import APIRouter,Request,Response,HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel,Field,ConfigDict
from urllib.parse import urlsplit
from .auth import database,current_user,origin_guard
from app.services import lifecycle as core
from app.services import product_community as pc
from typing import Literal
from fastapi import Query
router=APIRouter(prefix='/lifecycle',tags=['Lifecycle'])
class Command(BaseModel):
 model_config=ConfigDict(extra='forbid')
 action:str=Field(max_length=60)
 revision:int=Field(ge=1)
 payload:dict=Field(default_factory=dict)
def text(p,k,minimum=1,maximum=2000):
 v=p.get(k)
 if not isinstance(v,str) or not minimum<=len(v.strip())<=maximum:core.fail('Thông tin '+k+' không hợp lệ.',422)
 return v.strip()
def number(p,k,minimum=0,maximum=100000000,integer=False):
 v=p.get(k)
 if type(v) not in (int,float) or not math.isfinite(v) or not minimum<=v<=maximum or(integer and int(v)!=v):core.fail('Giá trị '+k+' không hợp lệ.',422)
 return int(v) if integer else v
def day(p,k):
 v=text(p,k,10,10)
 try:date.fromisoformat(v)
 except ValueError:core.fail('Ngày không hợp lệ.',422)
 return v
def video(p):
 v=p.get('videoUrl','')
 if not isinstance(v,str) or len(v)>2000:core.fail('Link video không hợp lệ.',422)
 if v:
  parsed=urlsplit(v)
  if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:core.fail('Video cần link HTTPS không kèm thông tin đăng nhập.',422)
 return v
def role(u,r):
 if u['role'] not in r:core.fail('Vai trò không có quyền thực hiện.',403)
def photo(db,u,p,kind,parent):
 from .community import init,image,Image
 init(db)
 if not p:core.fail('Cần ảnh thực tế.',422)
 try:payload=Image.model_validate(p)
 except ValueError:core.fail('Ảnh không hợp lệ.',422)
 return image(db,u['id'],kind,parent,payload)
def viewer(db,request):
 try:return current_user(db,request)
 except HTTPException:return {'id':'','role':'customer'}
def result(db,s,u):
 u=dict(u);_,rev=core.load(db);scoped=core.scoped(s,u);users={v['id']:v for v in scoped['users']}
 for row in db.execute('SELECT id,name,role FROM accounts'):
  users[row['id']]={**dict(row),'email':u.get('email','') if row['id']==u['id'] else '', 'notificationEmail':False}
 from .verification import init as legal_init,read as legal_read
 legal_init(db);shops={v['id']:v for v in scoped['sellers']}
 for row in db.execute("SELECT id,name FROM accounts WHERE role='seller'"):
  who=pc.public_identity(db,row['id'],row['name']);shops[row['id']]={'id':row['id'],'name':who['displayName'],'verified':(legal_read(db,row['id']) or {}).get('status')=='approved'}
 scoped['sellers']=list(shops.values());scoped['users']=list(users.values());return {'revision':rev,'state':scoped,'storage':'backend-sqlite'}
@router.get('/state')
def state(request:Request,response:Response,since:int=0):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  core.initialize(db);db.commit();db.execute('BEGIN IMMEDIATE');s,rev=core.load(db);core.settle(db,s);_,rev=core.load(db)
  if rev==since:return {'revision':rev,'unchanged':True}
  return JSONResponse(result(db,s,viewer(db,request)),headers={'Cache-Control':'no-store'})

@router.post('/commands')
def command(body:Command,request:Request):
 origin_guard(request)
 with database() as db:
  u=current_user(db,request);core.initialize(db);db.commit();db.execute('BEGIN IMMEDIATE');s,rev=core.load(db)
  if body.revision!=rev:raise HTTPException(409,'Dữ liệu đã thay đổi. Tải lại rồi thực hiện lại thao tác.',headers={'X-PREORA-Conflict':'revision'})
  a=body.action;p=body.payload;uid=u['id'];at=core.now();output={}
  if a=='product.create':
   role(u,['seller']);obj={'id':max(v['id'] for v in s['products'])+1,'sellerId':uid,'name':text(p,'name',2,200),'category':text(p,'category',2,100),'description':text(p,'description',2,5000),'price':number(p,'price',1),'manufacturingDays':number(p,'manufacturingDays',1,365,True),'image':'/products/preora-1.jpg','status':'Bản nháp'};s['products'].append(obj);output=obj
  elif a=='campaign.create':
   role(u,['seller']);prod=core.find(s,'products',p.get('productId'));core.authorize(u,prod);start=day(p,'startDate');end=day(p,'endDate');moq=number(p,'moq',1,1000000,True);target=number(p,'target',moq,10000000,True)
   if end<start:core.fail('Ngày kết thúc phải sau ngày bắt đầu.',422)
   c={'id':'CD-'+uuid.uuid4().hex[:12].upper(),'sellerId':uid,'productId':prod['id'],'name':text(p,'name',2,200),'description':text(p,'description',2,5000),'price':number(p,'price',1),'moq':moq,'target':target,'startDate':start,'endDate':end,'currentOrders':0,'dailyObservations':[],'status':'Chờ duyệt' if p.get('submit') else 'Bản nháp','dataOrigin':'live','events':[{'status':'Tạo chiến dịch','at':at}]};s['campaigns'].append(c);output=c
   from .seller_training import initialize_scopes
   initialize_scopes(db);db.execute('INSERT INTO seller_product_scopes VALUES(?,?) ON CONFLICT(id) DO NOTHING',(prod['id'],uid));db.execute('INSERT INTO seller_campaign_scopes VALUES(?,?,?)',(c['id'],uid,prod['id']))
  elif a in ('campaign.approve','campaign.reject','campaign.activate','campaign.cancel','campaign.finish'):
   c=core.find(s,'campaigns',p.get('id'))
   if a in ('campaign.approve','campaign.reject'):
    role(u,['admin'])
    if c['status']!='Chờ duyệt':core.fail('Chiến dịch không ở trạng thái chờ duyệt.')
    c['status']=('Đang hoạt động' if c['startDate']<=core.today() else 'Đã lên lịch') if a.endswith('approve') else 'Bị từ chối'
    if a.endswith('reject'):c['rejectionReason']=text(p,'reason',10)
    else:core.find(s,'products',c['productId'])['status']='Đang bán'
   else:
    role(u,['seller']);core.authorize(u,c)
    if a.endswith('activate'):
     if c['status']!='Đã lên lịch' or not c['startDate']<=core.today()<=c['endDate']:core.fail('Chưa đến thời gian kích hoạt.')
     c['status']='Đang hoạt động'
    elif a.endswith('finish'):
     if c['status']!='Đang hoạt động' or c['endDate']>=core.today():core.fail('Chưa thể kết thúc chiến dịch.')
     c['finalDemand']=c['currentOrders'];c['finalizedAt']=at;c['status']='Thành công' if c['currentOrders']>=c['moq'] else 'Không đạt MOQ'
    else:
     if c['status'] not in ('Bản nháp','Chờ duyệt','Đã lên lịch','Đang hoạt động','Thành công') or any(r['campaignId']==c['id'] for r in s['productionRequests']):core.fail('Không thể hủy sau khi đã phân công sản xuất.')
     c['status']='Đã hủy'
   c.setdefault('events',[]).append({'status':c['status'],'at':at})
   if c['status'] in ('Đã hủy','Không đạt MOQ'):core.order_status(s,c['id'],'Đang hoàn tiền','Đang hoàn tiền')
   core.announce(db,s,c,'Chiến dịch: '+c['status'])
  elif a in ('feedback.edit','feedback.delete','feedback.report','feedback.moderate'):
   pc.command(db,s,u,a,p,text)
  elif a=='product.follow':
   role(u,['customer']);prod=core.find(s,'products',p.get('productId'))
   if prod['id'] not in {x['id'] for x in core.scoped(s,{'id':'','role':'customer'})['products']}:core.fail('Không có sản phẩm công khai.',404)
   if type(p.get('following'))!=bool:core.fail('Trạng thái theo dõi không hợp lệ.',422)
   core.put(db,'productFollow',{'id':uid+':'+str(prod['id']),'userId':uid,'productId':prod['id'],'following':p['following'],'at':at})
  elif a=='feedback.create':
   role(u,['customer']);c=core.find(s,'campaigns',p.get('campaignId'))
   if p.get('stage','PRE_PRODUCTION')!='PRE_PRODUCTION':core.fail('Dùng luồng đánh giá sau nhận hàng để chấm sao.',422)
   if c['status'] not in ('Đã lên lịch','Đang hoạt động','Thành công') or any(r['campaignId']==c['id'] and r['status'] not in ('Chờ tiếp nhận','Đã tiếp nhận') for r in s['productionRequests']):core.fail('Feedback trước sản xuất đã đóng.')
   existing=[f for f in core.items(db,'feedback') if f['authorId']==uid and f['campaignId']==c['id']]
   if len(existing)>=20:core.fail('Tối đa 20 góp ý cho mỗi chiến dịch.',429)
   plans=[x for x in core.items(db,'plan') if x['campaignId']==c['id']]
   obj={'id':uuid.uuid4().hex,'campaignId':c['id'],'authorId':uid,'author':u['name'],'text':text(p,'text',5),'version':max([v['version'] for v in plans],default=0),'at':at,'updatedAt':at,'stage':'PRE_PRODUCTION','productId':c['productId'],'category':pc.category(p),'status':'published'};core.put(db,'feedback',obj)
  elif a=='feedback.reply':
   f=core.get(db,'feedback',p.get('id'));c=core.find(s,'campaigns',f['campaignId']);core.authorize(u,c);f['reply']=text(p,'text',2);f['repliedAt']=at
   if f['status']!='published':core.fail('Góp ý không còn công khai.')
   handling=p.get('handlingStatus','considering')
   if handling not in ('received','considering','accepted','not_adopted'):core.fail('Trạng thái xử lý góp ý không hợp lệ.',422)
   f['handlingStatus']=handling;core.put(db,'feedback',f)
  elif a=='plan.publish':
   role(u,['seller']);c=core.find(s,'campaigns',p.get('campaignId'));core.authorize(u,c)
   if any(r['campaignId']==c['id'] and r['status'] not in ('Chờ tiếp nhận','Đã tiếp nhận') for r in s['productionRequests']):core.fail('Đã bắt đầu sản xuất; dùng điều chỉnh kế hoạch, không thay thiết kế.')
   if c['status'] not in ('Đang hoạt động','Thành công','Đã lên lịch'):core.fail('Chiến dịch chưa được duyệt.')
   version=1+max([x['version'] for x in core.items(db,'plan') if x['campaignId']==c['id']],default=0)
   obj={'id':uuid.uuid4().hex,'campaignId':c['id'],'version':version,'specification':text(p,'specification',10,5000),'feedbackSummary':text(p,'feedbackSummary',10),'reason':text(p,'reason',10),'productionDate':day(p,'productionDate'),'deliveryDate':day(p,'deliveryDate'),'at':at,'sellerId':uid}
   if obj['productionDate']<core.today() or obj['deliveryDate']<obj['productionDate']:core.fail('Kiểm tra lịch sản xuất và giao hàng.',422)
   core.put(db,'plan',obj);core.announce(db,s,c,'Phương án sản xuất phiên bản '+str(version)+' cần xác nhận. Bạn có thể hủy/đề nghị hoàn tiền trước sản xuất.')
  elif a=='plan.respond':
   role(u,['customer']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o,'customerId');plan=core.get(db,'plan',p.get('planId'))
   latest=max((v['version'] for v in core.items(db,'plan') if v['campaignId']==o['campaignId']),default=0)
   if plan['campaignId']!=o['campaignId'] or plan['version']!=latest:core.fail('Chỉ xác nhận phiên bản mới nhất của đúng chiến dịch.')
   if any(r['campaignId']==o['campaignId'] and r['status'] not in ('Chờ tiếp nhận','Đã tiếp nhận') for r in s['productionRequests']):core.fail('Đã bắt đầu sản xuất.')
   if o['paymentStatus']!='Đã thanh toán':core.fail('Đơn không còn đủ điều kiện xác nhận.')
   accept=p.get('accept')
   if type(accept)!=bool:core.fail('Chọn đồng ý hoặc yêu cầu hoàn tiền.',422)
   core.put(db,'consent',{'id':o['id'],'orderId':o['id'],'planId':plan['id'],'accepted':accept,'at':at})
   if not accept:
    o['orderStatus']='Đang hoàn tiền';o['paymentStatus']='Đang hoàn tiền';core.event(o,'Không đồng ý thay đổi phương án; yêu cầu hoàn tiền');c=core.find(s,'campaigns',o['campaignId']);c['currentOrders']=max(0,c['currentOrders']-o['quantity']);core.announce(db,s,c,'Khách từ chối phương án: cần xem lại lượng đặt hợp lệ và kế hoạch sản xuất.')
  elif a=='rfq.create':
   role(u,['seller']);c=core.find(s,'campaigns',p.get('campaignId'));core.authorize(u,c)
   if c['status']!='Thành công' or c['currentOrders']<c['moq']:core.fail('Chiến dịch phải thành công và đạt MOQ.')
   if any(r['campaignId']==c['id'] for r in s['productionRequests']) or any(r['campaignId']==c['id'] and r['status']=='open' for r in core.items(db,'rfq')):core.fail('Đã có yêu cầu hoặc lệnh sản xuất.')
   if not any(v['campaignId']==c['id'] for v in core.items(db,'plan')):core.fail('Cần công bố phương án sản xuất trước.')
   obj={'id':uuid.uuid4().hex,'campaignId':c['id'],'sellerId':uid,'quantity':number(p,'quantity',c['currentOrders'],10000000,True),'deadline':day(p,'deadline'),'notes':text(p,'notes',5),'status':'open','at':at}
   if obj['deadline']<core.today():core.fail('Hạn sản xuất phải từ hôm nay.',422)
   core.put(db,'rfq',obj)
  elif a=='quote.create':
   role(u,['partner']);rfq=core.get(db,'rfq',p.get('rfqId'))
   if rfq['status']!='open':core.fail('Yêu cầu đã đóng.')
   if any(q['rfqId']==rfq['id'] and q['partnerId']==uid for q in core.items(db,'quote')):core.fail('Bạn đã báo giá cho yêu cầu này.')
   c=core.find(s,'campaigns',rfq['campaignId']);prod=core.find(s,'products',c['productId']);completion=day(p,'completion')
   if not core.today()<=completion<=rfq['deadline']:core.fail('Ngày hoàn thành vượt thời hạn.',422)
   caps=core.capacity(db,uid,prod['category'],core.today(),completion,rfq['quantity'])
   if not any(v['enough'] for v in caps):core.fail('Năng lực theo nhóm hàng và thời gian chưa đủ. Cập nhật năng lực trước khi báo giá.')
   core.put(db,'quote',{'id':uuid.uuid4().hex,'rfqId':rfq['id'],'partnerId':uid,'partner':u['name'],'unitPrice':number(p,'unitPrice',1),'completion':completion,'notes':text(p,'notes',5),'status':'submitted','capacity':caps,'at':at})
  elif a=='quote.accept':
   role(u,['seller']);q=core.get(db,'quote',p.get('id'));r=core.get(db,'rfq',q['rfqId']);core.authorize(u,r);c=core.find(s,'campaigns',r['campaignId'])
   if r['status']!='open' or c['status']!='Thành công' or c['currentOrders']<c['moq'] or any(x['campaignId']==c['id'] for x in s['productionRequests']):core.fail('Yêu cầu không còn khả dụng hoặc lượng đặt hợp lệ đã giảm dưới MOQ.')
   prod=core.find(s,'products',c['productId']);caps=core.capacity(db,q['partnerId'],prod['category'],core.today(),q['completion'],r['quantity'])
   # Avoid assigning two simultaneous jobs against the same self-declared line.
   if any(x['partnerId']==q['partnerId'] and x['status']!='Hoàn thành' and core.find(s,'products',core.find(s,'campaigns',x['campaignId'])['productId'])['category']==prod['category'] for x in s['productionRequests']):core.fail('Đối tác đang có lệnh cùng nhóm hàng. Cần hoàn tất lệnh hoặc chọn đối tác khác để tránh chồng công suất.')
   if not any(v['enough'] for v in caps):core.fail('Năng lực không còn đủ; cần báo giá lại.')
   rid='MFG-'+uuid.uuid4().hex[:12].upper();s['productionRequests'].append({'id':rid,'campaignId':c['id'],'sellerId':uid,'partnerId':q['partnerId'],'quantity':r['quantity'],'status':'Chờ tiếp nhận','progress':0,'createdAt':at,'updatedAt':at,'estimatedCompletion':q['completion'],'history':[{'status':'Chờ tiếp nhận','progress':0,'at':at}],'quoteId':q['id']});r['status']='assigned';q['status']='accepted';core.put(db,'rfq',r);core.put(db,'quote',q);core.announce(db,s,c,'Đã chọn đối tác và tạo lệnh sản xuất '+rid)
  elif a in ('production.update','production.plan'):
   role(u,['partner']);r=core.find(s,'productionRequests',p.get('id'));core.authorize(u,r,'partnerId');c=core.find(s,'campaigns',r['campaignId'])
   if r['status']=='Hoàn thành':core.fail('Lệnh đã hoàn thành.')
   if a=='production.plan':
    newdate=day(p,'date');reason=text(p,'reason',10)
    if newdate<core.today():core.fail('Không chọn ngày trong quá khứ.',422)
    r.setdefault('history',[]).append({'status':'Điều chỉnh kế hoạch','progress':r['progress'],'at':at,'previousCompletion':r['estimatedCompletion'],'estimatedCompletion':newdate,'note':reason});r['estimatedCompletion']=newdate;core.announce(db,s,c,'Điều chỉnh lịch sản xuất: '+newdate+' · '+reason)
   else:
    status=text(p,'status');progress=number(p,'progress',0,100,True);allowed={'Chờ tiếp nhận':['Đã tiếp nhận'],'Đã tiếp nhận':['Đang sản xuất'],'Đang sản xuất':['Đang sản xuất','Đang vận chuyển'],'Đang vận chuyển':['Hoàn thành']}
    if status not in allowed.get(r['status'],[]) or progress<r['progress']:core.fail('Bước hoặc phần trăm sản xuất không hợp lệ.')
    if status=='Đang sản xuất' and r['status']=='Đã tiếp nhận':
     if c['currentOrders']<c['moq']:core.fail('Lượng đặt hợp lệ đã giảm dưới MOQ. Cần xử lý kế hoạch trước sản xuất.')
     plans=[v for v in core.items(db,'plan') if v['campaignId']==c['id']]
     if not plans:core.fail('Cần phương án sản xuất được công bố.')
     plan=max(plans,key=lambda v:v['version']);consents={v['orderId']:v for v in core.items(db,'consent')}
     if any(consents.get(o['id'],{}).get('planId')!=plan['id'] or not consents.get(o['id'],{}).get('accepted') for o in s['orders'] if o['campaignId']==c['id'] and o['paymentStatus']=='Đã thanh toán'):core.fail('Còn khách đã thanh toán chưa xác nhận phương án mới nhất.')
    if status in ('Đang vận chuyển','Hoàn thành') and progress!=100:core.fail('Cần hoàn thành 100% sản lượng trước vận chuyển.')
    r['status']=status;r['progress']=progress;r.setdefault('history',[]).append({'status':status,'progress':progress,'at':at})
    if status=='Đang sản xuất':core.order_status(s,c['id'],'Đang sản xuất')
    elif status=='Đang vận chuyển':core.order_status(s,c['id'],'Đang vận chuyển')
    # Completing a factory job does not confirm customer delivery.
   r['updatedAt']=at
  elif a=='release.publish':
   role(u,['seller','partner']);r=core.find(s,'productionRequests',p.get('requestId'))
   if uid not in (r['sellerId'],r['partnerId']):core.fail('Không phải bên của lệnh sản xuất.',403)
   if r['progress']!=100 or r['status'] not in ('Đang vận chuyển','Hoàn thành'):core.fail('Chỉ công bố thành phẩm khi đã hoàn thành sản lượng.')
   c=core.find(s,'campaigns',r['campaignId']);mid=photo(db,u,p.get('photo'),'actual',r['id']);core.put(db,'release',{'id':uuid.uuid4().hex,'requestId':r['id'],'campaignId':c['id'],'productId':c['productId'],'caption':text(p,'caption',5),'specification':text(p,'specification',10,5000),'image':mid,'videoUrl':video(p),'at':at,'authorId':uid});core.announce(db,s,c,'Đã công bố ảnh và thông số thành phẩm thực tế.')
  elif a=='shipment.create':
   role(u,['seller']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o)
   if o['orderStatus'] not in ('Đang sản xuất','Đang vận chuyển') or o['paymentStatus']!='Đã thanh toán':core.fail('Đơn chưa đủ điều kiện giao hàng.')
   if not any(v['campaignId']==o['campaignId'] for v in core.items(db,'release')):core.fail('Cần công bố thành phẩm thực tế trước giao hàng.')
   if any(x['orderId']==o['id'] and x['status']!='cancelled' for x in core.items(db,'shipment')):core.fail('Đơn đã có vận đơn.')
   ship={'id':uuid.uuid4().hex,'orderId':o['id'],'carrier':text(p,'carrier',2,100),'tracking':text(p,'tracking',3,100),'expected':day(p,'expected'),'status':'shipping','at':at,'events':[{'status':'Đã giao cho vận chuyển','at':at}]}
   if ship['expected']<core.today():core.fail('Ngày giao dự kiến không hợp lệ.',422)
   core.put(db,'shipment',ship);o['orderStatus']='Đang vận chuyển';core.event(o,'Đã tạo vận đơn '+ship['tracking'])
  elif a=='shipment.receive':
   role(u,['customer']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o,'customerId');ship=next((v for v in core.items(db,'shipment') if v['orderId']==o['id']),None)
   if not ship or ship['status']!='shipping' or o['paymentStatus']!='Đã thanh toán':core.fail('Không có vận đơn đang giao.')
   ship['status']='received';ship['events'].append({'status':'Khách xác nhận đã nhận hàng','at':at});core.put(db,'shipment',ship);o['orderStatus']='Đã giao';o['receivedAt']=at;core.event(o,'Khách đã xác nhận nhận hàng')
  elif a=='review.create':
   role(u,['customer']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o,'customerId')
   if o['orderStatus']!='Đã giao' or not o.get('receivedAt') or o['paymentStatus']!='Đã thanh toán':core.fail('Chỉ đánh giá sau khi xác nhận nhận hàng.')
   if any(v['orderId']==o['id'] for v in core.items(db,'review')):core.fail('Mỗi đơn chỉ đánh giá một lần.')
   stars=number(p,'stars',1,5,True);review={'id':uuid.uuid4().hex,'orderId':o['id'],'productId':o['productId'],'authorId':uid,'author':u['name'],'stars':stars,'text':text(p,'text',5),'videoUrl':video(p),'at':at,'status':'published','verifiedPurchase':not o['id'].startswith(('PR-SAMPLE','PR-SIM','PR-DEMO'))}
   if p.get('photo'):review['image']=photo(db,u,p['photo'],'review',review['id'])
   core.put(db,'review',review)
  elif a=='review.reply':
   r=core.get(db,'review',p.get('id'));prod=core.find(s,'products',r['productId']);core.authorize(u,prod);r['reply']=text(p,'text',2);r['repliedAt']=at;core.put(db,'review',r)
  elif a=='review.report':
   r=core.get(db,'review',p.get('id'));core.put(db,'reviewReport',{'id':uuid.uuid4().hex,'reviewId':r['id'],'reason':text(p,'reason',10),'reporter':uid,'at':at,'status':'open'})
  elif a=='review.moderate':
   role(u,['admin']);r=core.get(db,'reviewReport',p.get('id'))
   if r['status']!='open':core.fail('Báo cáo đã xử lý.')
   r.update(status='resolved',reasonDecision=text(p,'reason',10),reviewer=uid,decidedAt=at);core.put(db,'reviewReport',r)
   if p.get('hide') is True:review=core.get(db,'review',r['reviewId']);review['status']='hidden';core.put(db,'review',review)
  elif a=='return.create':
   role(u,['customer']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o,'customerId')
   if o['orderStatus']!='Đã giao' or not o.get('receivedAt') or (datetime.now(timezone.utc)-datetime.fromisoformat(o['receivedAt'])).days>14 or o['paymentStatus']!='Đã thanh toán':core.fail('Chỉ yêu cầu đổi trả trong 14 ngày sau nhận hàng.')
   if any(v['orderId']==o['id'] and v['status']!='rejected' for v in core.items(db,'return')):core.fail('Đã có yêu cầu đổi trả.')
   core.put(db,'return',{'id':uuid.uuid4().hex,'orderId':o['id'],'customerId':uid,'sellerId':o['sellerId'],'reason':text(p,'reason',10),'status':'requested','at':at,'history':[{'status':'requested','at':at}]})
  elif a=='return.decide':
   role(u,['seller','admin']);r=core.get(db,'return',p.get('id'));core.authorize(u,r,admin=True);status=text(p,'status');reason=text(p,'reason',10)
   allowed={'requested':['approved','rejected'],'approved':['received'],'received':['refunding']}
   if status not in allowed.get(r['status'],[]):core.fail('Bước đổi trả không hợp lệ.')
   r['status']=status;r['history'].append({'status':status,'reason':reason,'at':at,'actor':uid});core.put(db,'return',r)
   if status=='refunding':o=core.find(s,'orders',r['orderId']);o['orderStatus']='Đang hoàn tiền';o['paymentStatus']='Đang hoàn tiền';core.event(o,'Đã nhận hàng trả; chờ hoàn tiền')
  elif a=='payment.sandbox':
   role(u,['customer']);o=core.find(s,'orders',p.get('orderId'));core.authorize(u,o,'customerId');key=text(p,'key',8,100);outcome=text(p,'outcome')
   if outcome not in ('success','failed'):core.fail('Kết quả sandbox không hợp lệ.',422)
   previous=next((v for v in core.items(db,'sandboxPayment') if v['id']==uid+':'+key),None)
   if previous:
    if previous['orderId']!=o['id'] or previous['outcome']!=outcome:core.fail('Khóa giao dịch đã dùng cho nội dung khác.')
    return {**result(db,s,u),'result':previous}
   if o['paymentStatus']!='Chờ thanh toán' or o['orderStatus'] in ('Đã hủy','Đã hoàn tiền','Đang hoàn tiền'):core.fail('Đơn không còn chờ thanh toán.')
   c=core.find(s,'campaigns',o['campaignId'])
   if c['status']!='Đang hoạt động' or not c['startDate']<=core.today()<=c['endDate']:core.fail('Chiến dịch không còn nhận thanh toán.')
   output={'id':uid+':'+key,'orderId':o['id'],'amount':o['total'],'outcome':outcome,'simulation':True,'at':at};core.put(db,'sandboxPayment',output)
   if outcome=='success':o['paymentStatus']='Đã thanh toán';core.event(o,'Thanh toán sandbox nội bộ thành công','payment')
   else:core.event(o,'Thanh toán sandbox thất bại; chưa ghi nhận tiền','payment')
  elif a=='refund.complete':
   role(u,['admin']);o=core.find(s,'orders',p.get('id'))
   if o['paymentStatus']!='Đang hoàn tiền':core.fail('Đơn không chờ hoàn tiền.')
   o['paymentStatus']='Đã hoàn tiền';o['orderStatus']='Đã hoàn tiền';core.event(o,'Hoàn tiền mô phỏng đã đối soát','payment')
   for ret in core.items(db,'return'):
    if ret['orderId']==o['id'] and ret['status']=='refunding':ret['status']='refunded';ret['history'].append({'status':'refunded','reason':'Đã đối soát hoàn tiền mô phỏng','at':at,'actor':uid});core.put(db,'return',ret)
   for pay in s['payments']:
    if pay['orderId']==o['id']:pay['status']='Đã hoàn tiền'
  else:core.fail('Thao tác không được hỗ trợ.',422)
  core.save(db,s)
  return JSONResponse({**result(db,s,u),'result':output},headers={'Cache-Control':'no-store'})

@router.get('/products/{pid}')
def experience(pid:int,request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  s,_=core.load(db);u=viewer(db,request);prod=core.find(s,'products',pid)
  publicids={p['id'] for p in core.scoped(s,u)['products']}
  if pid not in publicids:core.fail('Không có sản phẩm công khai.',404)
  cids={c['id'] for c in core.scoped(s,u)['campaigns'] if c['productId']==pid};reviews=[r for r in core.items(db,'review') if r['productId']==pid and r['status']=='published'];plans=[r for r in core.items(db,'plan') if r['campaignId'] in cids]
  return {'feedback':[{'id':r['id'],'text':r['text'],'author':pc.public_identity(db,r['authorId'],r.get('author','Thành viên'))['displayName'],'at':r['at'],'version':r.get('version',0),'reply':r.get('reply'),'repliedAt':r.get('repliedAt')} for r in core.items(db,'feedback') if r['campaignId'] in cids and r['status']=='published'],'plans':sorted(plans,key=lambda r:r['version'],reverse=True),'releases':[r for r in core.items(db,'release') if r['productId']==pid],'reviews':[{**{k:r[k] for k in ('id','text','stars','at','verifiedPurchase') if k in r},'author':pc.public_identity(db,r['authorId'],r.get('author','Thành viên'))['displayName'],**{k:r[k] for k in ('image','videoUrl','reply','repliedAt') if k in r}} for r in reviews],'rating':{'count':len(reviews),'average':sum(r['stars'] for r in reviews)/len(reviews) if reviews else None,'distribution':{str(i):sum(r['stars']==i for r in reviews) for i in range(1,6)}},'eligibleOrders':[o for o in s['orders'] if o['productId']==pid and o['customerId']==u['id'] and o.get('receivedAt') and o['orderStatus']=='Đã giao' and o['paymentStatus']=='Đã thanh toán' and not any(r['orderId']==o['id'] for r in core.items(db,'review'))],'lifecycle':{k:v for k,v in pc.production_info(s,pid).items() if k!='requestIds'},'feedbackOpenCampaigns':[{'id':c['id'],'name':c['name']} for c in s['campaigns'] if c['productId']==pid and c['id'] in cids and pc.open_feedback(s,c['id'])],'followingProduct':any(v['userId']==u['id'] and v['productId']==pid and v.get('following') for v in core.items(db,'productFollow')),'ownOrders':[{'id':o['id'],'campaignId':o['campaignId'],'orderStatus':o['orderStatus'],'paymentStatus':o['paymentStatus']} for o in s['orders'] if o['productId']==pid and o['customerId']==u['id']]}

@router.get('/workspace')
def workspace(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  u=current_user(db,request);s,_=core.load(db);uid=u['id'];r=u['role'];owned={o['id'] for o in core.scoped(s,u)['orders']};rfqs=[x for x in core.items(db,'rfq') if r=='admin' or x['sellerId']==uid or(r=='partner' and x['status']=='open') or(r=='partner' and any(q['rfqId']==x['id'] and q['partnerId']==uid for q in core.items(db,'quote')))];rids={x['id'] for x in rfqs}
  return {'rfqs':rfqs,'quotes':[x for x in core.items(db,'quote') if x['rfqId'] in rids and (r in ('seller','admin') or x['partnerId']==uid)],'shipments':[x for x in core.items(db,'shipment') if x['orderId'] in owned],'returns':[x for x in core.items(db,'return') if r=='admin' or uid in (x['customerId'],x['sellerId'])],'notices':[x for x in core.items(db,'notice') if x['userId']==uid][-50:],'reviewReports':core.items(db,'reviewReport') if r=='admin' else [],'feedbackReports':[{**report,'content':core.get(db,'feedback',report['feedbackId'])['text'],'productId':core.get(db,'feedback',report['feedbackId']).get('productId') or next((c['productId'] for c in s['campaigns'] if c['id']==core.get(db,'feedback',report['feedbackId'])['campaignId']),None)} for report in core.items(db,'feedbackReport')] if r=='admin' else [],'consents':[x for x in core.items(db,'consent') if x['orderId'] in owned]}

@router.get('/produced')
def produced(response:Response,sellerId:str='',partnerId:str='',page:int=Query(1,ge=1),pageSize:int=Query(12,ge=1,le=48),q:str=Query('',max_length=100),sort:Literal['newest','price_asc','price_desc']='newest'):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  s,_=core.load(db);all_items,stages=pc.produced(db,s,sellerId,partnerId);rows=[r for r in all_items if q.casefold() in (r['name']+' '+r['category']).casefold()]
  if sort!='newest':rows.sort(key=lambda r:(r['price'],r['productId']),reverse=sort=='price_desc')
  total=len(rows);rows=rows[(page-1)*pageSize:page*pageSize];ids={r['productId'] for r in rows};rids={r['id'] for r in s['productionRequests'] if (not partnerId or r['partnerId']==partnerId)}
  return {'items':rows,'total':total,'page':page,'pageSize':pageSize,'hasMore':page*pageSize<total,'stages':stages,'products':[p for p in s['products'] if p['id'] in ids],'releases':[r for r in core.items(db,'release') if r['productId'] in ids and r['requestId'] in rids]}

@router.get('/products/{pid}/feedback')
def public_feedback(pid:int,request:Request,response:Response,stage:Literal['PRE_PRODUCTION','POST_PRODUCTION']='PRE_PRODUCTION',page:int=Query(1,ge=1),pageSize:int=Query(8,ge=1,le=50),sort:Literal['newest','oldest']='newest',category:str=Query('',max_length=30)):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  s,_=core.load(db);u=viewer(db,request)
  if pid not in {p['id'] for p in core.scoped(s,u)['products']}:core.fail('Không tìm thấy sản phẩm công khai.',404)
  cids={c['id'] for c in core.scoped(s,u)['campaigns'] if c['productId']==pid};rows=[r for r in core.items(db,'feedback' if stage=='PRE_PRODUCTION' else 'review') if r['status']=='published' and ((r['campaignId'] in cids) if stage=='PRE_PRODUCTION' else r['productId']==pid)]
  if category and category not in pc.CATEGORIES:core.fail('Loại góp ý không hợp lệ.',422)
  total_all=len(rows)
  if category:rows=[r for r in rows if r.get('category','general')==category]
  rows.sort(key=lambda r:(r['at'],r['id']),reverse=sort=='newest');total=len(rows)
  return {'items':[pc.public_feedback(db,s,r,u,stage) for r in rows[(page-1)*pageSize:page*pageSize]],'total':total,'totalAll':total_all,'page':page,'pageSize':pageSize,'hasMore':page*pageSize<total,'stage':stage,'categories':pc.CATEGORIES}

@router.get('/evaluation')
def evaluation(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 from app.services import training_jobs as jobs
 with database() as db:
  u=current_user(db,request);role(u,['seller','admin']);s,_=core.load(db);campaigns={c['id']:c for c in s['campaigns'] if u['role']=='admin' or c['sellerId']==u['id']}
  # Read saved worker outputs, never accept client-supplied model predictions or final outcomes.
  with jobs.database() as jdb:rows=jdb.execute("SELECT * FROM jobs WHERE status='succeeded' ORDER BY created DESC LIMIT 500").fetchall()
  for row in rows:
   job=jobs.serialize(row);req=job['request'];c=campaigns.get(req.get('campaignId'));raw=job['result'] or {};f=raw.get('full',raw)
   if not c or not isinstance(f,dict) or not isinstance(f.get('predictedFinalDemand'),(int,float)):continue
   if u['role']=='seller' and req.get('ownerId') not in (None,u['id']):continue
   obj={'id':job['id'],'campaignId':c['id'],'predicted':f['predictedFinalDemand'],'snapshotDate':req.get('currentDate'),'createdAt':datetime.fromtimestamp(job['created'],timezone.utc).isoformat(),'model':f.get('modelVersion',''),'synthetic':f.get('provenance',{}).get('synthetic',True),'currentOrders':req.get('currentOrders',0),'endDate':req.get('endDate'),'startDate':req.get('startDate')};core.put(db,'prediction',obj)
  evaluated=[]
  for snap in core.items(db,'prediction'):
   c=campaigns.get(snap['campaignId'])
   if not c:continue
   final=c['status'] in ('Thành công','Không đạt MOQ') and c['endDate']<core.today();actual=c.get('finalDemand',c['currentOrders']) if final else None
   try:elapsed=max(1,(date.fromisoformat(snap['snapshotDate'])-date.fromisoformat(snap['startDate'])).days+1);duration=max(elapsed,(date.fromisoformat(snap['endDate'])-date.fromisoformat(snap['startDate'])).days+1);baseline=snap['currentOrders']/elapsed*duration
   except (ValueError,TypeError):baseline=None
   evaluated.append({**snap,'campaignName':c['name'],'actual':actual,'error':snap['predicted']-actual if actual is not None else None,'baseline':baseline,'outcomeOrigin':c.get('dataOrigin','demo'),'evaluationMode':'retrospective' if snap['createdAt'][:10]>c['endDate'] else 'prospectiveSnapshot'})
  eligible=[v for v in evaluated if v['actual'] is not None];errors=[v['error'] for v in eligible];baseline=[abs(v['baseline']-v['actual']) for v in eligible if v['baseline'] is not None]
  return {'predictions':evaluated,'metrics':{'count':len(errors),'mae':sum(abs(v) for v in errors)/len(errors) if errors else None,'rmse':math.sqrt(sum(v*v for v in errors)/len(errors)) if errors else None,'baselineMae':sum(baseline)/len(baseline) if baseline else None},'statement':'Sai số trên snapshot đã kết thúc; nhiều snapshot cùng chiến dịch có tương quan. Không gộp bằng chứng mô phỏng thành kiểm chứng trên dữ liệu thật.'}

@router.get('/alerts')
def alerts(request:Request,response:Response):
 response.headers['Cache-Control']='no-store'
 with database() as db:
  u=current_user(db,request);role(u,['seller','partner','admin']);s,_=core.load(db);sc=core.scoped(s,u);out=[]
  for c in sc['campaigns']:
   if u['role']=='seller' and c['sellerId']!=u['id']:continue
   if u['role']=='partner':continue
   if c['status']=='Đang hoạt động':
    left=max(0,(date.fromisoformat(c['endDate'])-date.fromisoformat(core.today())).days);elapsed=max(1,(date.fromisoformat(core.today())-date.fromisoformat(c['startDate'])).days+1);estimate=c['currentOrders']/elapsed*(left+elapsed)
    if estimate<c['moq']:out.append({'id':c['id']+'-moq','title':'Nguy cơ không đạt MOQ','evidence':f"Tốc độ hiện tại ước tính {estimate:.0f} / MOQ {c['moq']}; còn {left} ngày. Đây là quy tắc tốc độ, không phải xác suất ML.",'path':'seller-campaign-detail/'+c['id'] if u['role']=='seller' else 'admin-campaign-detail?campaign='+c['id']})
   orders=[o for o in s['orders'] if o['campaignId']==c['id']];cancelled=sum(o['quantity'] for o in orders if o['orderStatus'] in ('Đã hủy','Đang hoàn tiền','Đã hoàn tiền'));total=sum(o['quantity'] for o in orders)
   if total and cancelled/total>=.15:out.append({'id':c['id']+'-cancel','title':'Tỷ lệ hủy/hoàn tiền cao','evidence':f'{cancelled}/{total} sản phẩm trong đơn ghi nhận ({cancelled/total:.0%}); kiểm tra nguyên nhân.','path':'seller-orders' if u['role']=='seller' else 'admin-transactions'})
  for r in sc['productionRequests']:
   if r['status']!='Hoàn thành' and r['estimatedCompletion']<core.today():out.append({'id':r['id']+'-late','title':'Lệnh sản xuất quá hạn','evidence':r['id']+' · Hạn '+r['estimatedCompletion']+' · '+r['status'],'path':('partner-production' if u['role']=='partner' else 'seller-production' if u['role']=='seller' else 'admin-production')+'?request='+r['id']})
   if r['status'] in ('Chờ tiếp nhận','Đã tiếp nhận'):
    prod=core.find(s,'products',core.find(s,'campaigns',r['campaignId'])['productId']);caps=core.capacity(db,r['partnerId'],prod['category'],core.today(),r['estimatedCompletion'],r['quantity'])
    if not any(v['enough'] for v in caps):out.append({'id':r['id']+'-capacity','title':'Cần đối chiếu lại công suất sản xuất','evidence':r['id']+' · Nhóm '+prod['category']+' · Chưa có khai báo đủ năng lực trong khoảng thời gian còn lại.','path':'partner-capacity' if u['role']=='partner' else u['role']+'-lifecycle'})
  return {'alerts':out,'rules':'Ngưỡng hủy/hoàn tiền 15%; tốc độ MOQ và hạn sản xuất là cảnh báo quy tắc, cần người phụ trách xem xét.'}
