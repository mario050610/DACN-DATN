"""Public projections and stage-aware feedback; reuse lifecycle_items storage."""
import uuid
from fastapi import HTTPException
from . import lifecycle as core

CATEGORIES={'general':'Góp ý chung','design':'Thiết kế','color':'Màu sắc','size':'Kích thước','features':'Tính năng','price':'Giá bán','quality':'Chất lượng kỳ vọng'}
def open_feedback(s,cid):
 c=next((c for c in s['campaigns'] if c['id']==cid),None)
 return bool(c and c['status'] in ('Đang hoạt động','Đã lên lịch','Thành công') and not any(r['campaignId']==cid and r['status'] not in ('Chờ tiếp nhận','Đã tiếp nhận') for r in s['productionRequests']))
def public_identity(db,uid,fallback):
 from app.api.v1.routes.community import init,profile_data
 init(db);p=profile_data(db,uid);row=db.execute('SELECT name FROM accounts WHERE id=?',(uid,)).fetchone()
 return {'displayName':p.get('displayName') or (row['name'] if row else fallback),'avatar':p.get('avatar')}
def public_feedback(db,s,f,viewer,stage='PRE_PRODUCTION'):
 cid=f.get('campaignId');c=next((c for c in s['campaigns'] if c['id']==cid),None);owner=f['authorId'];identity=public_identity(db,owner,f.get('author','Thành viên PREORA'))
 editable=stage=='PRE_PRODUCTION' and viewer['id']==owner and viewer['role']=='customer' and open_feedback(s,cid) and not f.get('reply') and f['status']=='published'
 out={'id':f['id'],'productId':f.get('productId') or (c['productId'] if c else None),'stage':stage,'content':f['text'],'category':f.get('category','general'),'createdAt':f['at'],'updatedAt':f.get('updatedAt',f['at']),'author':identity,'canEdit':bool(editable),'canDelete':bool(editable)}
 if stage=='POST_PRODUCTION':out.update(stars=f['stars'],verifiedPurchase=f.get('verifiedPurchase',False))
 if f.get('reply'):
  seller=(c or {}).get('sellerId') or next((p['sellerId'] for p in s['products'] if p['id']==f.get('productId')),'')
  out['reply']={'content':f['reply'],'createdAt':f.get('repliedAt'),'author':public_identity(db,seller,'Người bán'),'handlingStatus':f.get('handlingStatus','considering')}
 return out

def command(db,s,u,action,p,text):
 uid=u['id'];at=core.now()
 if action in ('feedback.edit','feedback.delete'):
  if u['role']!='customer':core.fail('Chỉ khách được quản lý góp ý của mình.',403)
  f=core.get(db,'feedback',p.get('id'))
  if f['authorId']!=uid:core.fail('Không có quyền sửa góp ý này.',403)
  if f['status']!='published' or not open_feedback(s,f['campaignId']) or f.get('reply'):core.fail('Góp ý chỉ sửa/xóa trước sản xuất và trước khi người bán phản hồi.')
  if action.endswith('delete'):f['status']='deleted'
  else:f['text']=text(p,'text',5);f['category']=category(p)
  f['updatedAt']=at;core.put(db,'feedback',f)
 elif action=='feedback.report':
  f=core.get(db,'feedback',p.get('id'))
  if f['status']!='published':core.fail('Góp ý không còn công khai.',404)
  if any(v['feedbackId']==f['id'] and v['reporter']==uid and v['status']=='open' for v in core.items(db,'feedbackReport')):core.fail('Bạn đã báo cáo góp ý này.')
  core.put(db,'feedbackReport',{'id':uuid.uuid4().hex,'feedbackId':f['id'],'reason':text(p,'reason',10),'reporter':uid,'at':at,'status':'open'})
 elif action=='feedback.moderate':
  if u['role']!='admin':core.fail('Chỉ quản trị viên được kiểm duyệt.',403)
  f=core.get(db,'feedback',p.get('id'));reason=text(p,'reason',10);hide=p.get('hide')
  if type(hide)!=bool:core.fail('Cần chọn quyết định kiểm duyệt.',422)
  if f['status']=='deleted':core.fail('Không khôi phục góp ý tác giả đã xóa.')
  f['status']='hidden' if hide else 'published';f['moderation']={'reason':reason,'at':at,'actor':uid};core.put(db,'feedback',f)
  core.put(db,'feedbackDecision',{'id':uuid.uuid4().hex,'feedbackId':f['id'],'reason':reason,'hidden':hide,'at':at,'reviewer':uid})
  for report in core.items(db,'feedbackReport'):
   if report['feedbackId']==f['id'] and report['status']=='open':report.update(status='resolved',decision=reason,decidedAt=at);core.put(db,'feedbackReport',report)

def category(p):
 value=p.get('category','general')
 if not isinstance(value,str) or value not in CATEGORIES:core.fail('Loại góp ý không hợp lệ.',422)
 return value

def completion_time(request):
 dates=[h['at'] for h in request.get('history',[]) if h.get('progress')==100 and h.get('status') in ('Đang sản xuất','Đang vận chuyển','Hoàn thành') and h.get('at')]
 return min(dates) if dates else None
def production_info(s,pid):
 campaigns=[c for c in s['campaigns'] if c['productId']==pid];cids={c['id'] for c in campaigns};requests=[r for r in s['productionRequests'] if r['campaignId'] in cids]
 complete=[r for r in requests if r['progress']==100 and r['status'] in ('Đang sản xuất','Đang vận chuyển','Hoàn thành')]
 stamps=[completion_time(r) for r in complete if completion_time(r)]
 linked=[o for o in s['orders'] if o['campaignId'] in cids and o['orderStatus'] not in ('Đã hủy','Đã hoàn tiền','Đang hoàn tiền')]
 return {'produced':bool(complete),'inProduction':any(r['status'] in ('Đã tiếp nhận','Đang sản xuất') and r['progress']<100 for r in requests),'preorderOpen':any(c['status']=='Đang hoạt động' and c['startDate']<=core.today()<=c['endDate'] for c in campaigns),'closed':bool(campaigns) and all(c['status'] not in ('Đang hoạt động','Đã lên lịch') for c in campaigns),'delivered':bool(linked) and all(o['orderStatus']=='Đã giao' for o in linked),'completedAt':max(stamps) if stamps else None,'producedQuantity':sum(r['quantity'] for r in complete),'successfulPreorders':sum(c.get('finalDemand',c['currentOrders']) for c in campaigns if c['status']=='Thành công'),'requestIds':[r['id'] for r in complete]}

def produced(db,s,seller_id='',partner_id=''):
 public={p['id'] for p in core.scoped(s,{'id':'','role':'customer'})['products']};releases=core.items(db,'release');items=[];stages={}
 for p in s['products']:
  if p['id'] not in public or seller_id and p['sellerId']!=seller_id:continue
  info=production_info(s,p['id']);stages[str(p['id'])]={k:v for k,v in info.items() if k!='requestIds'}
  if not info['produced']:continue
  qualified=[r for r in s['productionRequests'] if r['id'] in info['requestIds'] and(not partner_id or r['partnerId']==partner_id)]
  if not qualified:continue
  relevant={r['id'] for r in qualified};photos=sorted([r for r in releases if r['requestId'] in relevant],key=lambda r:(r['at'],r['id']),reverse=True)
  owner=public_identity(db,p['sellerId'],next((x['name'] for x in s['sellers'] if x['id']==p['sellerId']),p['sellerId']))
  dates=[completion_time(r) for r in qualified if completion_time(r)]
  items.append({'productId':p['id'],'name':p['name'],'category':p['category'],'price':p['price'],'seller':{'id':p['sellerId'],**owner},'image':photos[0]['image'] if photos else None,'designImage':p['image'],'imageType':'actual' if photos else 'design','status':'Đã sản xuất','completedAt':max(dates) if dates else None,'producedQuantity':sum(r['quantity'] for r in qualified),'successfulPreorders':info['successfulPreorders'],'simulation':all(c.get('dataOrigin','demo')=='demo' for c in s['campaigns'] if c['productId']==p['id']),'partners':sorted({r['partnerId'] for r in qualified})})
 return sorted(items,key=lambda x:(x['completedAt'] or '',x['productId']),reverse=True),stages
