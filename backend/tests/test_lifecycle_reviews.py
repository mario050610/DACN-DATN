import pytest
from test_training import client,login
from test_lifecycle import fixture,send
from app.services import lifecycle as core
from app.api.v1.routes.auth import database

@pytest.mark.parametrize('stars',[0,6,1.5,True,'5'])
def test_rating_rejects_invalid_stars(client,stars):
 fixture(client)
 with database() as db:
  s,_=core.load(db);o=core.find(s,'orders','PR-INTEGRATION');o['orderStatus']='Đã giao';o['receivedAt']=core.now();core.save(db,s)
 login(client,'customer');send(client,'review.create',{'orderId':'PR-INTEGRATION','stars':stars,'text':'Không chấp nhận điểm sai miền dữ liệu'},422)

def test_seller_cannot_hide_negative_review_and_admin_needs_report(client):
 fixture(client)
 with database() as db:
  s,_=core.load(db);o=core.find(s,'orders','PR-INTEGRATION');o['orderStatus']='Đã giao';o['receivedAt']=core.now();core.save(db,s)
 login(client,'customer');send(client,'review.create',{'orderId':'PR-INTEGRATION','stars':1,'text':'Sản phẩm chưa đáp ứng mong đợi của tôi'});review=client.get('/api/lifecycle/products/9991').json()['reviews'][0]
 login(client,'seller');send(client,'review.report',{'id':review['id'],'reason':'Cần đối chiếu nội dung với quy tắc cộng đồng'});report=client.get('/api/lifecycle/workspace').json()['reviewReports'];assert not report
 send(client,'review.moderate',{'id':'anything','hide':True,'reason':'Người bán không có quyền tự ẩn đánh giá'},403)
 login(client,'admin');rid=client.get('/api/lifecycle/workspace').json()['reviewReports'][0]['id'];send(client,'review.moderate',{'id':rid,'hide':False,'reason':'Đây là ý kiến tiêu cực hợp lệ, giữ nguyên đánh giá'});assert client.get('/api/lifecycle/products/9991').json()['rating']['average']==1
