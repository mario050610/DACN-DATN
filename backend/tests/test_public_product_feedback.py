import json
from test_training import client,login
from test_lifecycle import fixture,send
from test_role_profiles import registration
from app.api.v1.routes.auth import database
from app.services import lifecycle as core

def feedback(c,cid,text='Tôi đề nghị cải thiện màu sắc và chất liệu',**extra):
 send(c,'feedback.create',{'campaignId':cid,'text':text,'category':'design',**extra});return c.get('/api/lifecycle/products/9991/feedback').json()['items'][0]

def test_feedback_public_pagination_privacy_and_stage(client):
 cid=fixture(client);login(client,'customer');client.post('/api/community/me/profile',json={'displayName':'Tên cộng đồng','bio':'','field':'','location':''})
 for i in range(9):feedback(client,cid,'Ý kiến cộng đồng thứ '+str(i))
 first=client.get('/api/lifecycle/products/9991/feedback?page=1&pageSize=3&sort=oldest').json();assert first['total']==9 and first['hasMore'] and len(first['items'])==3 and first['items'][0]['content'].endswith('0')
 client.cookies.clear();r=client.get('/api/lifecycle/products/9991/feedback?page=2&pageSize=3&sort=newest');assert r.status_code==200;r=r.json();assert r['items'][0]['content'].endswith('5');assert r['items'][0]['author']['displayName']=='Tên cộng đồng'
 assert set(r['items'][0])=={'id','productId','stage','content','category','createdAt','updatedAt','author','canEdit','canDelete'}
 assert not r['items'][0]['canEdit'] and not r['items'][0]['canDelete']
 assert not any(k in json.dumps(r) for k in ['customer@preora.demo','phone','shippingAddress','authorId','moderation','password'])
 assert client.get('/api/lifecycle/products/9991/feedback?stage=POST_PRODUCTION').json()['total']==0
 assert client.get('/api/lifecycle/products/9991').json()['rating']['count']==0
 assert client.post('/api/lifecycle/commands',json={'action':'feedback.create','payload':{'campaignId':cid,'text':'Anonymous must not post'},'revision':1}).status_code==401
 assert client.get('/api/lifecycle/products/9991/feedback?pageSize=10000').status_code==422
 assert client.get('/api/lifecycle/products/9991/feedback?sort=invalid').status_code==422

def test_owner_edit_delete_reply_and_feedback_survives_production(client):
 cid=fixture(client);login(client,'customer');f=feedback(client,cid);send(client,'feedback.edit',{'id':f['id'],'text':'Nội dung góp ý đã sửa theo ý kiến của tôi','category':'color'})
 assert client.get('/api/lifecycle/products/9991/feedback').json()['items'][0]['category']=='color'
 assert client.post('/api/auth/register',json=registration(email='other@example.test')).status_code==200
 send(client,'feedback.edit',{'id':f['id'],'text':'Cannot edit another customer'},403);send(client,'feedback.delete',{'id':f['id']},403)
 login(client,'seller');send(client,'feedback.reply',{'id':f['id'],'text':'Đã tiếp nhận và đưa vào phương án sản xuất','handlingStatus':'accepted'})
 login(client,'customer');send(client,'feedback.edit',{'id':f['id'],'text':'Cannot change context after reply'},409)
 f2=feedback(client,cid,'Góp ý khác có thể xóa trước phản hồi');send(client,'feedback.delete',{'id':f2['id']});assert client.get('/api/lifecycle/products/9991/feedback').json()['total']==1
 with database() as db:
  s,_=core.load(db);s['productionRequests'].append({'id':'MFG-PUBLIC','campaignId':cid,'sellerId':'seller-aurora','partnerId':'partner-demo','quantity':2,'status':'Hoàn thành','progress':100,'estimatedCompletion':'2026-12-01','updatedAt':core.now(),'history':[{'status':'Đang sản xuất','progress':100,'at':'2026-11-02T02:00:00+00:00'}]});core.save(db,s)
 client.cookies.clear();public=client.get('/api/lifecycle/products/9991/feedback').json();assert public['total']==1 and public['items'][0]['reply']['handlingStatus']=='accepted'
 assert client.get('/api/lifecycle/products/9991').json()['feedbackOpenCampaigns']==[]
 login(client,'customer');send(client,'feedback.create',{'campaignId':cid,'text':'No new feedback after production'},409)
 made=client.get('/api/lifecycle/produced?sellerId=seller-aurora').json();item=next(p for p in made['items'] if p['productId']==9991);assert item['producedQuantity']==2 and item['completedAt']=='2026-11-02T02:00:00+00:00' and item['imageType']=='design'
 assert any(p['productId']==9991 for p in client.get('/api/lifecycle/produced?partnerId=partner-demo').json()['items']);assert not any(p['productId']==9991 for p in client.get('/api/lifecycle/produced?partnerId=other-partner').json()['items'])

def test_moderation_requires_admin_reason_and_keeps_original(client):
 cid=fixture(client);login(client,'customer');f=feedback(client,cid);send(client,'feedback.report',{'id':f['id'],'reason':'Nội dung cần được đối chiếu quy tắc cộng đồng'})
 login(client,'seller');send(client,'feedback.moderate',{'id':f['id'],'reason':'Seller cannot hide customer feedback','hide':True},403);send(client,'feedback.edit',{'id':f['id'],'text':'Seller cannot edit customer feedback'},403)
 login(client,'admin');assert client.get('/api/lifecycle/workspace').json()['feedbackReports'];send(client,'feedback.moderate',{'id':f['id'],'reason':'short','hide':True},422);send(client,'feedback.moderate',{'id':f['id'],'reason':'Đối chiếu quy tắc và ẩn nội dung vi phạm','hide':True})
 client.cookies.clear();assert client.get('/api/lifecycle/products/9991/feedback').json()['total']==0
 with database() as db:assert core.get(db,'feedback',f['id'])['text']==f['content']

def test_unfinished_production_does_not_become_produced(client):
 cid=fixture(client)
 with database() as db:
  s,_=core.load(db);s['productionRequests'].append({'id':'MFG-NOTDONE','campaignId':cid,'sellerId':'seller-aurora','partnerId':'partner-demo','quantity':2,'status':'Đang sản xuất','progress':99,'estimatedCompletion':'2026-12-01','updatedAt':core.now()});core.save(db,s)
 assert not any(p['productId']==9991 for p in client.get('/api/lifecycle/produced').json()['items'])
