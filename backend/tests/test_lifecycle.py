import base64,importlib,json
from datetime import date,timedelta
from test_training import client,login
from app.api.v1.routes.auth import database
from app.services import lifecycle as core
PNG=base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()

def send(c,a,p,status=200):
 revision=c.get('/api/lifecycle/state').json()['revision'];r=c.post('/api/lifecycle/commands',json={'action':a,'payload':p,'revision':revision});assert r.status_code==status,r.text;return r.json()
def fixture(c):
 login(c,'seller')
 with database() as db:
  s,_=core.load(db);s['products'].append({'id':9991,'sellerId':'seller-aurora','name':'Sản phẩm tích hợp','category':'Integration','price':100000,'image':'/products/preora-1.jpg','description':'Sản phẩm kiểm thử','manufacturingDays':5,'status':'Đang bán'})
  s['campaigns'].append({'id':'CD-INTEGRATION','productId':9991,'sellerId':'seller-aurora','name':'Chiến dịch tích hợp','description':'Thử nghiệm','price':100000,'moq':1,'target':10,'currentOrders':2,'startDate':str(date.today()-timedelta(days=10)),'endDate':str(date.today()-timedelta(days=1)),'status':'Thành công','dataOrigin':'live','dailyObservations':[]})
  s['orders'].append({'id':'PR-INTEGRATION','customerId':'customer-demo','sellerId':'seller-aurora','campaignId':'CD-INTEGRATION','productId':9991,'quantity':2,'unitPrice':100000,'total':200000,'variant':'Standard','createdAt':core.now(),'orderStatus':'Chờ kết quả chiến dịch','paymentStatus':'Đã thanh toán'});s['payments'].append({'id':'PAY-INTEGRATION','orderId':'PR-INTEGRATION','amount':200000,'status':'Đã thanh toán'});core.save(db,s)
 return 'CD-INTEGRATION'
def plan(c,cid):return send(c,'plan.publish',{'campaignId':cid,'specification':'Thiết kế cuối cùng, vật liệu và màu sắc','feedbackSummary':'Đã tiếp nhận góp ý về màu sắc và bao bì','reason':'Chốt bản thiết kế để chuẩn bị sản xuất','productionDate':str(date.today()),'deliveryDate':str(date.today()+timedelta(days=30))})
def prepare(c):
 cid=fixture(c);plan(c,cid);pid=c.get('/api/lifecycle/products/9991').json()['plans'][0]['id'];send(c,'rfq.create',{'campaignId':cid,'quantity':2,'deadline':str(date.today()+timedelta(days=30)),'notes':'Vật liệu và đóng gói theo thiết kế'})
 login(c,'partner');rfq=c.get('/api/lifecycle/workspace').json()['rfqs'][0]['id'];row={'id':'line1','category':'Integration','productType':'Mẫu thử','dailyUnits':10,'batchSize':1,'leadDays':0,'committedUnits':0,'availableFrom':str(date.today()),'availableTo':str(date.today()+timedelta(days=40)),'weekdays':[0,1,2,3,4,5,6]};assert c.post('/api/community/me/capacity',json={'rows':[row]}).status_code==200
 send(c,'quote.create',{'rfqId':rfq,'unitPrice':40000,'completion':str(date.today()+timedelta(days=10)),'notes':'Báo giá gồm vật liệu và đóng gói'})
 login(c,'seller');qid=c.get('/api/lifecycle/workspace').json()['quotes'][0]['id'];send(c,'quote.accept',{'id':qid});requests=c.get('/api/lifecycle/state').json()['state']['productionRequests'];rid=next(r['id'] for r in requests if r['campaignId']==cid)
 return cid,pid,rid

def test_end_to_end_feedback_to_verified_review(client):
 cid=fixture(client);login(client,'customer');send(client,'feedback.create',{'campaignId':cid,'text':'Đề nghị bổ sung bao bì chắc chắn'})
 login(client,'seller');feedback=client.get('/api/lifecycle/products/9991').json()['feedback'][0];send(client,'feedback.reply',{'id':feedback['id'],'text':'Đã tiếp nhận yêu cầu bao bì'})
 # Separate preparation preserves a single campaign and lets us test the full production flow.
 plan(client,cid);pid=client.get('/api/lifecycle/products/9991').json()['plans'][0]['id'];send(client,'rfq.create',{'campaignId':cid,'quantity':2,'deadline':str(date.today()+timedelta(days=30)),'notes':'In mẫu và đóng gói theo thiết kế'})
 login(client,'partner');rid=client.get('/api/lifecycle/workspace').json()['rfqs'][0]['id']
 send(client,'quote.create',{'rfqId':rid,'unitPrice':10000,'completion':str(date.today()+timedelta(days=10)),'notes':'Năng lực chưa được khai báo'},409)
 row={'id':'line1','category':'Integration','productType':'Mẫu thử','dailyUnits':10,'batchSize':1,'leadDays':0,'committedUnits':0,'availableFrom':str(date.today()),'availableTo':str(date.today()+timedelta(days=40)),'weekdays':[0,1,2,3,4,5,6]};assert client.post('/api/community/me/capacity',json={'rows':[row]}).status_code==200
 send(client,'quote.create',{'rfqId':rid,'unitPrice':40000,'completion':str(date.today()+timedelta(days=10)),'notes':'Báo giá có năng lực đủ đáp ứng'})
 login(client,'seller');qid=client.get('/api/lifecycle/workspace').json()['quotes'][0]['id'];send(client,'quote.accept',{'id':qid});rid=next(r['id'] for r in client.get('/api/lifecycle/state').json()['state']['productionRequests'] if r['campaignId']==cid)
 login(client,'partner');send(client,'production.update',{'id':rid,'status':'Đã tiếp nhận','progress':0});send(client,'production.update',{'id':rid,'status':'Đang sản xuất','progress':0},409)
 login(client,'customer');send(client,'review.create',{'orderId':'PR-INTEGRATION','stars':5,'text':'Chưa nhận hàng không được đánh giá'},409);send(client,'plan.respond',{'orderId':'PR-INTEGRATION','planId':pid,'accept':True})
 login(client,'partner');send(client,'production.update',{'id':rid,'status':'Đang sản xuất','progress':0});send(client,'release.publish',{'requestId':rid,'photo':{'content':PNG},'caption':'Ảnh thành phẩm','specification':'Vật liệu đã hoàn thiện theo thiết kế'},409)
 send(client,'production.update',{'id':rid,'status':'Đang sản xuất','progress':100});send(client,'production.update',{'id':rid,'status':'Đang vận chuyển','progress':100});send(client,'production.update',{'id':rid,'status':'Hoàn thành','progress':100})
 login(client,'customer');assert next(o for o in client.get('/api/lifecycle/state').json()['state']['orders'] if o['id']=='PR-INTEGRATION')['orderStatus']!='Đã giao'
 login(client,'partner');send(client,'release.publish',{'requestId':rid,'photo':{'content':PNG},'caption':'Thành phẩm hoàn thiện thực tế','specification':'Vật liệu và thông số cuối cùng đúng phương án'})
 assert any(p['id']==9991 for p in client.get('/api/lifecycle/produced').json()['products'])
 login(client,'seller');send(client,'shipment.create',{'orderId':'PR-INTEGRATION','carrier':'Test carrier','tracking':'TRACK-123','expected':str(date.today()+timedelta(days=3))})
 login(client,'customer');send(client,'shipment.receive',{'orderId':'PR-INTEGRATION'});send(client,'review.create',{'orderId':'PR-INTEGRATION','stars':5,'text':'Sản phẩm thực tế hoàn thiện tốt','photo':{'content':PNG}});send(client,'review.create',{'orderId':'PR-INTEGRATION','stars':4,'text':'Không được đánh giá trùng'},409)
 public=client.get('/api/lifecycle/products/9991').json();assert public['rating']['average']==5 and public['rating']['count']==1 and public['reviews'][0]['verifiedPurchase'];assert 'orderId' not in public['reviews'][0]
 send(client,'return.create',{'orderId':'PR-INTEGRATION','reason':'Phát hiện phụ kiện cần kiểm tra lại sau nhận hàng'})
 login(client,'seller');returnid=client.get('/api/lifecycle/workspace').json()['returns'][0]['id']
 for step in ['approved','received','refunding']:send(client,'return.decide',{'id':returnid,'status':step,'reason':'Đã kiểm tra và chuyển đúng bước xử lý'})
 login(client,'admin');send(client,'refund.complete',{'id':'PR-INTEGRATION'});assert next(o for o in client.get('/api/lifecycle/state').json()['state']['orders'] if o['id']=='PR-INTEGRATION')['paymentStatus']=='Đã hoàn tiền'

def test_permissions_versions_and_private_state(client):
 cid=fixture(client);revision=client.get('/api/lifecycle/state').json()['revision'];plan(client,cid)
 assert client.post('/api/lifecycle/commands',json={'action':'campaign.cancel','revision':revision,'payload':{'id':cid}}).status_code==409
 login(client,'customer');send(client,'plan.publish',{'campaignId':cid},403);send(client,'shipment.receive',{'orderId':'PR-INTEGRATION'},409)
 customer=client.get('/api/lifecycle/state').json()['state'];assert all(o['customerId']=='customer-demo' for o in customer['orders']);assert all(not u['email'] for u in customer['users'] if u['id']!='customer-demo')
 login(client,'partner');assert not client.get('/api/lifecycle/state').json()['state']['orders']
 login(client,'seller');send(client,'feedback.create',{'campaignId':cid,'text':'Sellers cannot pretend to be buyers'},403)
 client.cookies.clear();public=client.get('/api/lifecycle/state').json()['state'];assert not public['orders'] and not public['payments'];assert client.post('/api/lifecycle/commands',json={'revision':1,'action':'product.create'}).status_code==401

def test_new_plan_invalidates_old_consent(client):
 cid,pid,rid=prepare(client);login(client,'customer');send(client,'plan.respond',{'orderId':'PR-INTEGRATION','planId':pid,'accept':True})
 login(client,'seller');plan(client,cid)
 login(client,'customer');send(client,'plan.respond',{'orderId':'PR-INTEGRATION','planId':pid,'accept':True},409)
 login(client,'partner');send(client,'production.update',{'id':rid,'status':'Đã tiếp nhận','progress':0});send(client,'production.update',{'id':rid,'status':'Đang sản xuất','progress':0},409)

def test_sandbox_is_idempotent_and_scoped(client):
 fixture(client)
 with database() as db:
  s,_=core.load(db);o=core.find(s,'orders','PR-INTEGRATION');o['paymentStatus']='Chờ thanh toán';c=core.find(s,'campaigns','CD-INTEGRATION');c.update(status='Đang hoạt động',endDate=str(date.today()+timedelta(days=5)));core.save(db,s)
 login(client,'customer');p={'orderId':'PR-INTEGRATION','key':'sandbox-unique-1','outcome':'success'};send(client,'payment.sandbox',p);send(client,'payment.sandbox',p)
 send(client,'payment.sandbox',{**p,'outcome':'failed'},409)
 o=next(o for o in client.get('/api/lifecycle/state').json()['state']['orders'] if o['id']=='PR-INTEGRATION');assert len([e for e in o['events'] if 'sandbox' in e['title']])==1

def test_ai_evaluation_waits_for_actual_outcome(client):
 from app.services import training_jobs as jobs
 cid=fixture(client);job=jobs.create({'campaignId':cid,'ownerId':'seller-aurora','currentDate':str(date.today()-timedelta(days=3)),'startDate':str(date.today()-timedelta(days=10)),'endDate':str(date.today()-timedelta(days=1)),'currentOrders':1});jobs.update(job,status='succeeded',result={'predictedFinalDemand':3,'modelVersion':'fixture','provenance':{'synthetic':False}})
 data=client.get('/api/lifecycle/evaluation').json();assert data['metrics']['count']==1 and data['metrics']['mae']==1 and data['predictions'][0]['actual']==2
 login(client,'customer');assert client.get('/api/lifecycle/evaluation').status_code==403
