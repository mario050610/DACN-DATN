import importlib
import sqlite3
import time
from datetime import date,timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services import training_jobs as jobs

auth=importlib.import_module('app.api.v1.routes.auth')
training=importlib.import_module('app.api.v1.routes.training')

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('AUTH_DATABASE_PATH',str(tmp_path/'accounts.sqlite3'))
    monkeypatch.setenv('TRAINING_JOBS_DIR',str(tmp_path/'jobs'))
    monkeypatch.setattr(auth,'ITERATIONS',1000)
    (tmp_path/'ai-service/data/raw/uci').mkdir(parents=True)
    (tmp_path/'ai-service/data/raw/uci/online_retail_II.xlsx').touch()
    monkeypatch.setattr(training,'ROOT',tmp_path)
    monkeypatch.setattr(training,'launch',lambda job_id:1234)
    with TestClient(app) as c: yield c


def login(client,role='admin'):
    response=client.post('/api/auth/login',json={'email':f'{role}@preora.demo','password':'Demo123!'})
    assert response.status_code==200,response.text


def payload():
    now=date(2026,10,16)
    return {'campaignId':'CD-TEST','campaignName':'Chiến dịch thử','productId':1,'productName':'Sản phẩm thử',
            'status':'Đang hoạt động','startDate':str(now-timedelta(days=7)),'endDate':str(now+timedelta(days=15)),
            'currentDate':str(now),'currentOrders':80,'moq':100,'target':200,'price':150000,
            'dailyOrderQuantities':[{'date':str(now-timedelta(days=i)),'quantity':10} for i in range(8)],
            'historyConfirmed':True,'rebuildData':False}


def test_anonymous_and_seller_cannot_access_training(client):
    assert client.get('/api/admin/ai-training').status_code==401
    assert client.post('/api/admin/ai-training',json=payload()).status_code==401
    login(client,'seller')
    assert client.get('/api/admin/ai-training').status_code==403
    assert client.post('/api/admin/ai-training',json=payload()).status_code==403


def test_admin_start_status_logs_and_single_active_lock(client):
    login(client)
    response=client.post('/api/admin/ai-training',json=payload())
    assert response.status_code==202,response.text
    item=response.json()
    assert item['status']=='queued'
    assert client.post('/api/admin/ai-training',json=payload()).status_code==409
    (jobs.directory()/item['id']/'worker.log').write_text('training log',encoding='utf-8')
    read=client.get('/api/admin/ai-training/'+item['id']).json()
    assert read['log']=='training log'
    jobs.update(item['id'],status='succeeded',stage='Done',progress=100,result={'next7':12})
    assert client.get('/api/admin/ai-training/'+item['id']).json()['result']['next7']==12
    assert client.post('/api/admin/ai-training',json=payload()).status_code==202


@pytest.mark.parametrize('case',['duplicate','future','missing','negative','unconfirmed','wrong_total','ended','not_active'])
def test_invalid_history_is_rejected(client,case):
    login(client)
    data=payload()
    if case=='duplicate':data['dailyOrderQuantities'][0]['date']=data['dailyOrderQuantities'][1]['date']
    if case=='future':data['dailyOrderQuantities'][0]['date']='2026-10-17'
    if case=='missing':data['dailyOrderQuantities'].pop()
    if case=='negative':data['dailyOrderQuantities'][0]['quantity']=-1
    if case=='unconfirmed':data['historyConfirmed']=False
    if case=='wrong_total':data['currentOrders']=100
    if case=='ended':data['endDate']=data['currentDate']
    if case=='not_active':data['status']='Bản nháp'
    assert client.post('/api/admin/ai-training',json=data).status_code==422
    assert jobs.recent()==[]


def test_missing_dataset_and_worker_error(client,monkeypatch):
    login(client)
    source=training.ROOT/'ai-service/data/raw/uci/online_retail_II.xlsx'
    source.unlink()
    assert client.post('/api/admin/ai-training',json=payload()).status_code==409
    source.touch()
    def fail(job_id):raise RuntimeError('worker missing')
    monkeypatch.setattr(training,'launch',fail)
    assert client.post('/api/admin/ai-training',json=payload()).status_code==503
    assert jobs.recent()[0]['status']=='failed'


def test_origin_guard_and_path_traversal(client):
    login(client)
    assert client.post('/api/admin/ai-training',json=payload(),headers={'origin':'https://invalid.example'}).status_code==403
    assert client.get('/api/admin/ai-training/not-a-job').status_code==404


def test_interrupted_job_expires_and_allows_retry(client):
    job_id=jobs.create(payload())
    with jobs.database() as db:db.execute('UPDATE jobs SET updated=? WHERE id=?',(time.time()-190,job_id))
    assert jobs.get(job_id)['status']=='failed'
    assert jobs.create(payload())!=job_id


@pytest.mark.parametrize('days',[1,2,6,7,27,28,35])
def test_short_campaigns_allowed_without_padding(client,days):
    login(client)
    data=payload();now=date.fromisoformat(data['currentDate'])
    data['startDate']=str(now-timedelta(days=days-1))
    data['dailyOrderQuantities']=[{'date':str(now-timedelta(days=i)),'quantity':10} for i in range(min(days,28))]
    data['currentOrders']=days*10
    response=client.post('/api/admin/ai-training',json=data)
    assert response.status_code==202,response.text
    features=response.json()['request']['computedFeatures']
    assert features['elapsedDays']==days
    assert features['ordersPerDay']==10
    if days<14: assert features['growthRate']==0


def test_empty_history_still_rejected(client):
    login(client);data=payload();data['dailyOrderQuantities']=[]
    assert client.post('/api/admin/ai-training',json=data).status_code==422
