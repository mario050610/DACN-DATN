import base64
import pytest
from test_training import client,login
PNG=base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()
def post(client,text='Bài viết thử nghiệm cho cộng đồng'):
 r=client.post('/api/community/posts',json={'text':text,'rulesAccepted':True,'image':{'content':PNG}});assert r.status_code==201,r.text;return r.json()['id']

def test_public_profile_privacy_and_owner_edit(client):
 assert client.get('/api/community/rules').json()['version']=='community-v1'
 profile=client.get('/api/community/profiles/seller-aurora').json();assert 'email' not in profile and 'phone' not in profile
 assert client.post('/api/community/me/profile',json={'displayName':'New Name'}).status_code==401
 login(client,'seller');assert client.post('/api/community/me/profile',json={'displayName':'Aurora mới','bio':'Giới thiệu công khai'}).status_code==200
 assert client.get('/api/community/profiles/seller-aurora').json()['displayName']=='Aurora mới'
 assert client.post('/api/community/me/media/avatar',json={'content':base64.b64encode(b'<svg/>').decode()}).status_code==422
 avatar=client.post('/api/community/me/media/avatar',json={'content':PNG});assert avatar.status_code==200
 r=client.get('/api/community/media/'+avatar.json()['avatar']);assert r.status_code==200 and r.headers['x-content-type-options']=='nosniff'
 login(client,'customer');assert 'displayName' not in client.get('/api/community/profiles/customer-demo').json()
 directory=client.get('/api/community/profiles?role=seller&q=Aurora').json();assert directory['profiles'] and all(p['role']=='seller' and 'email' not in p for p in directory['profiles'])
 assert client.get('/api/community/profiles?role=invalid').status_code==422

def test_follow_idempotency_and_private_notifications(client):
 login(client,'customer')
 for _ in range(2):assert client.post('/api/community/profiles/seller-aurora/follow',json={'following':True}).status_code==200
 assert client.get('/api/community/profiles/seller-aurora').json()['followers']==1
 assert client.post('/api/community/profiles/customer-demo/follow',json={'following':True}).status_code==422
 assert not client.get('/api/community/notifications').json()['notifications']
 login(client,'seller');data=client.get('/api/community/notifications').json();assert len(data['notifications'])==1 and data['unread']==1
 assert client.post('/api/community/notifications/read',json={}).status_code==200
 assert client.get('/api/community/notifications').json()['unread']==0

def test_posts_rules_ownership_moderation_and_image_visibility(client):
 login(client,'seller');assert client.post('/api/community/posts',json={'text':'hello','rulesAccepted':False}).status_code==422
 pid=post(client);feed=client.get('/api/community/profiles/seller-aurora/posts').json()['posts'];mid=feed[0]['image'];assert feed[0]['createdAt'] and client.get('/api/community/media/'+mid).status_code==200
 login(client,'customer');assert client.patch('/api/community/posts/'+pid,json={'text':'cannot edit others','rulesAccepted':True}).status_code==404
 assert client.delete('/api/community/posts/'+pid).status_code==404
 assert client.get('/api/community/moderation').status_code==403
 assert client.post('/api/community/posts/'+pid+'/report',json={'reason':'Thông tin cần được kiểm tra'}).status_code==200
 login(client,'admin');rid=client.get('/api/community/moderation').json()['reports'][0]['id']
 assert client.post('/api/community/moderation/'+rid,json={'reason':'Đối chiếu quy tắc và ẩn bài thử nghiệm','hide':True}).status_code==200
 assert client.post('/api/community/moderation/'+rid,json={'reason':'Không được xử lý trùng báo cáo','hide':False}).status_code==409
 assert not client.get('/api/community/profiles/seller-aurora/posts').json()['posts']
 assert client.get('/api/community/media/'+mid).status_code==404
 login(client,'seller');assert client.patch('/api/community/posts/'+pid,json={'text':'cannot republish hidden','rulesAccepted':True}).status_code==404
 pid=post(client);assert client.delete('/api/community/posts/'+pid).status_code==200

def test_messages_are_pair_private_and_seed_cannot_receive(client):
 login(client,'seller') # create real recipient
 login(client,'customer');assert client.post('/api/community/messages/seller-aurora',json={'text':'Tin nhắn kiểm thử riêng tư'}).status_code==201
 assert client.post('/api/community/messages/customer-demo',json={'text':'self'}).status_code==422
 seed=next(u['id'] for u in __import__('app.api.v1.routes.community',fromlist=['SEED_USERS']).SEED_USERS.values() if u['role']=='seller' and u['id'] not in ['seller-aurora','seller-auralis'])
 assert client.post('/api/community/messages/'+seed,json={'text':'hello'}).status_code==409
 login(client,'admin');assert not client.get('/api/community/messages').json()['threads'];assert not client.get('/api/community/messages/seller-aurora').json()['messages']
 login(client,'seller');data=client.get('/api/community/messages/customer-demo').json();assert len(data['messages'])==1 and data['messages'][0]['text']=='Tin nhắn kiểm thử riêng tư'
 assert client.get('/api/community/messages').json()['threads'][0]['unread']==0

def test_partner_capacity_validation_and_role_scope(client):
 row={'id':'cap1','category':'Sách & Nghệ thuật','productType':'In sách','dailyUnits':100,'batchSize':50,'leadDays':2,'committedUnits':30,'availableFrom':'2026-10-01','availableTo':'2026-11-01','weekdays':[1,2,3,4,5]}
 login(client,'seller');assert client.post('/api/community/me/capacity',json={'rows':[row]}).status_code==403
 login(client,'partner');assert client.post('/api/community/me/capacity',json={'rows':[row]}).status_code==200
 assert client.get('/api/community/profiles/partner-demo').json()['capacity'][0]['dailyUnits']==100
 for bad in [dict(row,dailyUnits=0),dict(row,availableTo='2026-09-01'),dict(row,weekdays=[1,1]),dict(row,weekdays=[])]:assert client.post('/api/community/me/capacity',json={'rows':[bad]}).status_code==422
 assert client.post('/api/community/me/capacity',json={'rows':[row,row]}).status_code==422

@pytest.mark.parametrize('role,uid',[('customer','customer-demo'),('seller','seller-aurora'),('partner','partner-demo'),('admin','admin-demo')])
def test_every_role_can_publish_own_posts(client,role,uid):
 login(client,role);pid=post(client)
 assert client.get('/api/community/profiles/'+uid+'/posts').json()['posts'][0]['id']==pid
 assert client.delete('/api/community/posts/'+pid).status_code==200
