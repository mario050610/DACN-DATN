from test_training import client, login, payload
from app.services import training_jobs as jobs
from app.api.v1.routes.shopping import CAMPAIGNS

def own_payload():
    data=payload()
    c=next(c for c in CAMPAIGNS.values() if c['sellerId']=='seller-aurora')
    data.update(campaignId=c['id'],productId=c['productId'],mode='campaign_demo')
    return data

def test_seller_can_train_own_campaign_and_admin_can_monitor(client):
    login(client,'seller')
    created=client.post('/api/seller/ai-training',json=own_payload())
    assert created.status_code==202,created.text
    job=created.json();assert job['request']['ownerId']=='seller-aurora'
    assert client.get('/api/seller/ai-training').json()['jobs'][0]['id']==job['id']
    assert client.get('/api/seller/ai-training/'+job['id']).status_code==200
    login(client,'admin')
    assert any(j['id']==job['id'] for j in client.get('/api/admin/ai-training').json()['jobs'])

def test_seller_cannot_train_other_campaign_or_read_admin_jobs(client):
    other=payload();other['campaignId']=next(c['id'] for c in CAMPAIGNS.values() if c['sellerId']!='seller-aurora')
    private=jobs.create(payload());jobs.update(private,status='succeeded')
    login(client,'seller')
    assert client.post('/api/seller/ai-training',json=other).status_code==403
    assert client.get('/api/seller/ai-training/'+private).status_code==404
    assert client.get('/api/seller/ai-training').json()['jobs']==[]
    own=own_payload();own['productId']=999999
    assert client.post('/api/seller/ai-training',json=own).status_code==422

def test_training_and_analytics_guards(client):
    assert client.get('/api/seller/ai-training').status_code==401
    login(client,'customer')
    assert client.get('/api/seller/ai-training').status_code==403
    login(client,'seller')
    own=own_payload();query='?startDate=2026-10-01&endDate=2026-10-21'
    assert client.get('/api/analytics/campaigns/'+own['campaignId']+query).status_code==200
    other=next(c['id'] for c in CAMPAIGNS.values() if c['sellerId']!='seller-aurora')
    assert client.get('/api/analytics/campaigns/'+other+query).status_code==403
    own.update(mode='campaign_history',datasetId='a'*32)
    assert client.post('/api/seller/ai-training',json=own).status_code==403
    assert client.get('/api/seller/ai-training/dataset-template').status_code==200
    assert client.post('/api/seller/ai-training',json=own_payload(),headers={'origin':'https://invalid.example'}).status_code==403

def test_server_sets_job_owner_and_enforces_shared_worker_lock(client):
    login(client,'seller')
    own=own_payload();own['ownerId']='other-seller'
    first=client.post('/api/seller/ai-training',json=own)
    assert first.status_code==202
    assert first.json()['request']['ownerId']=='seller-aurora'
    assert client.post('/api/seller/ai-training',json=own).status_code==409

def test_custom_campaign_registration_preserves_owner(client):
    login(client,'seller')
    own=own_payload();own['campaignId']='CUSTOM-OWN'
    assert client.post('/api/seller/ai-training',json=own).status_code==403
    assert client.post('/api/seller/ai-training/campaigns',json={'campaignId':own['campaignId'],'productId':own['productId']}).status_code==200
    assert client.post('/api/seller/ai-training',json=own).status_code==202
    # A second seller cannot claim the same campaign, including via registration.
    assert client.post('/api/auth/login',json={'email':'seller.b@preora.demo','password':'Demo123!'}).status_code==200
    assert client.post('/api/seller/ai-training/campaigns',json={'campaignId':own['campaignId'],'productId':own['productId']}).status_code==403
    assert client.post('/api/seller/ai-training',json=own).status_code==403

def test_seller_historical_dataset_stays_private(client):
    from test_campaign_forecasting import dataset_csv
    login(client,'seller')
    response=client.post('/api/seller/ai-training/datasets',json={'name':'seller-history.csv','content':dataset_csv(),'provenance':'Seller supplied historical campaign fixture','confirmedHistorical':True})
    assert response.status_code==201,response.text
    dataset_id=response.json()['id']
    assert client.get('/api/seller/ai-training').json()['datasets'][0]['id']==dataset_id
    own=own_payload();own.update(mode='campaign_history',datasetId=dataset_id)
    assert client.post('/api/seller/ai-training',json=own).status_code==202
    assert client.post('/api/auth/login',json={'email':'seller.b@preora.demo','password':'Demo123!'}).status_code==200
    assert client.get('/api/seller/ai-training').json()['datasets']==[]
