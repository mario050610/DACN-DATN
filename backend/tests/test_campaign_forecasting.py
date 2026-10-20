import csv
import io
from datetime import date,timedelta
import pytest
from app.services import campaign_forecasting as model
from app.services import behavior_events
from test_training import client,login,payload


def dataset_csv(campaigns=120):
    stream=io.StringIO();writer=csv.DictWriter(stream,fieldnames=model.CSV_FIELDS);writer.writeheader()
    for i in range(campaigns):
        start=date(2010,1,1)+timedelta(days=i*20)
        row={'campaignId':f'H-{i}','snapshotDate':str(start+timedelta(days=8)),'startDate':str(start),'endDate':str(start+timedelta(days=30)),
             'moq':100,'target':200,'category':'Công nghệ','price':500000,'productType':'Phụ kiện','views':1000,'clicks':100,'favorites':10,'addToCart':30,
             'currentOrders':20,'ordersPerDay':2,'growthRate':.2,'cancellationRate':.05,'finalQuantity':150 if i%2 else 60}
        writer.writerow(row)
    return stream.getvalue()


def test_dataset_upload_template_and_full_mode_without_uci(client):
    login(client)
    template=client.get('/api/admin/ai-training/dataset-template')
    assert template.status_code==200
    assert template.text.strip().split(',')==model.CSV_FIELDS
    response=client.post('/api/admin/ai-training/datasets',json={'name':'history.csv','content':dataset_csv(),'provenance':'Lịch sử fixture kiểm thử, không phải dữ liệu thực','confirmedHistorical':True})
    assert response.status_code==201,response.text
    info=response.json();assert info['campaigns']==120
    assert len(client.get('/api/admin/ai-training').json()['datasets'])==1
    data=payload();data.update(mode='campaign_history',datasetId=info['id'],category='Công nghệ',productType='Phụ kiện',behavior={'views':1000,'clicks':100,'favorites':10,'addToCart':30},cancelledQuantity=20)
    response=client.post('/api/admin/ai-training',json=data)
    assert response.status_code==202,response.text
    values=response.json()['request']['computedFeatures']
    assert set(values)==set(model.FEATURES)
    assert values['cancellationRate']==.2
    assert 'finalQuantity' not in values

@pytest.mark.parametrize('error',['no_labels','missing_feature','duplicate','future','bad_rate','too_small'])
def test_invalid_campaign_dataset_is_rejected_without_partial_file(client,error):
    content=dataset_csv(10 if error=='too_small' else 120)
    if error=='no_labels':content=content.replace(',150\r\n',',60\r\n')
    if error=='missing_feature':content=content.replace('addToCart,','missing,',1)
    if error=='duplicate':content+=content.splitlines()[1]+'\n'
    if error=='future':content=content.replace('2010-01-31','2099-01-31',1)
    if error=='bad_rate':content=content.replace(',0.05,',',1.5,')
    with pytest.raises(ValueError):model.ingest_csv(content,'fixture','test fixture provenance')
    assert model.datasets()==[]


def test_behavior_idempotency_and_authentication(client):
    event={'campaignId':'CD-2408','kind':'view','eventId':'test-event-00000001'}
    assert client.post('/api/analytics/events',json=event).json()['recorded'] is True
    assert client.post('/api/analytics/events',json=event).json()['recorded'] is False
    today=str(date.today())
    path=f'/api/analytics/campaigns/CD-2408?startDate=2000-01-01&endDate={today}'
    assert client.get(path).status_code==401
    login(client)
    result=client.get(path).json()
    assert result['views']==1 and result['partialHistory'] is True
    assert 'user' not in result
    assert client.post('/api/analytics/events',json={**event,'kind':'favorite'}).status_code==422
    assert client.post('/api/analytics/events',json={**event,'campaignId':'missing'}).status_code==404

@pytest.mark.parametrize('capacity,probability,feasible',[(450,.9,True),(250,.9,False),(450,.2,True),(5,.9,False)])
def test_production_constraints(capacity,probability,feasible):
    plan=model.production_plan(184,300,260,480,probability,{'capacity':capacity,'batchSize':10,'safetyBuffer':.05,'minimumProbability':.7})
    assert plan['feasible']==feasible
    if feasible:
        assert 300<=plan['lower']<=plan['upper']<=capacity
        assert plan['lower']%10==0 and plan['upper']%10==0
    else:assert plan['lower'] is None and plan['upper'] is None
    if probability<.7 and feasible:assert 'Chưa nên' in plan['status']

def test_latest_full_model_is_owner_only_and_skips_incomplete_jobs(client):
    from app.services import training_jobs
    payload_data=payload();payload_data['campaignId']='CD-2408'
    job_id=training_jobs.create(payload_data)
    training_jobs.update(job_id,status='succeeded',result={'modelType':'campaign_full','predictedFinalDemand':150,'successProbability':80},stage='Done',progress=100)
    assert client.get('/api/ai/campaigns/CD-2408/latest').status_code==401
    login(client,'seller')
    response=client.get('/api/ai/campaigns/CD-2408/latest')
    assert response.status_code==200 and response.json()['jobId']==job_id
    assert client.get('/api/ai/campaigns/CD-LIVE-002/latest').status_code==403
    client.post('/api/auth/logout',json={})
    login(client,'customer')
    assert client.get('/api/ai/campaigns/CD-2408/latest').status_code==403
    client.post('/api/auth/logout',json={})
    login(client)
    assert client.get('/api/ai/campaigns/CD-2408/latest').status_code==200
    assert client.get('/api/ai/campaigns/UNKNOWN/latest').status_code==404


def test_telemetry_failure_never_raises(monkeypatch):
    import sqlite3
    monkeypatch.setattr(behavior_events.sqlite3,'connect',lambda *args,**kwargs:(_ for _ in ()).throw(sqlite3.OperationalError('disk busy')))
    assert behavior_events.record('CD-2408','view') is False


def test_category_normalization_and_production_current_commitments():
    data=payload();data['category']='Collectible';data['productType']='Figure'
    features=model.snapshot_features(data)
    assert features['category']=='Sưu tầm'
    plan=model.production_plan(500,100,200,300,.9,{'capacity':600,'batchSize':10})
    assert plan['lower']>=500 and plan['upper']>=500


def test_saved_and_cart_events_only_on_successful_transitions(client):
    login(client,'customer')
    data={'productId':1,'saved':True}
    assert client.post('/api/shopping/saved',json=data).status_code==200
    assert client.post('/api/shopping/saved',json=data).status_code==200
    assert client.post('/api/shopping/cart',json={'campaignId':'CD-2408','quantity':1,'mode':'add'}).status_code==200
    assert client.post('/api/shopping/cart',json={'campaignId':'CD-2408','quantity':-1,'mode':'add'}).status_code==422
    result=behavior_events.summary('CD-2408','2000-01-01',str(date.today()))
    assert result['favorites']==1 and result['addToCart']==1


def test_training_event_history_is_durable_and_ignores_heartbeats(client):
    from app.services import training_jobs
    job_id=training_jobs.create(payload())
    initial=training_jobs.get(job_id)['events']
    assert len(initial)==1 and initial[0]['status']=='queued'
    training_jobs.update(job_id,pid=123)
    training_jobs.heartbeat(job_id)
    assert len(training_jobs.get(job_id)['events'])==1
    training_jobs.update(job_id,status='running',stage='Train model',progress=50)
    training_jobs.update(job_id,status='running',stage='Train model',progress=50)
    training_jobs.update(job_id,status='succeeded',stage='Done',progress=100,result={'value':1})
    events=training_jobs.get(job_id)['events']
    assert [row['progress'] for row in events]==[0,50,100]
    assert events[0]['created']<=events[1]['created']<=events[2]['created']
    login(client)
    read=client.get('/api/admin/ai-training/'+job_id)
    assert read.status_code==200
    assert read.json()['events']==events
