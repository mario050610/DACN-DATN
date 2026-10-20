import csv
import io
import json
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
sys.path.insert(0,str(ROOT/'ai-service/training'))
import full_campaign
from app.services import campaign_forecasting as contract


def selected_payload():
    return {'campaignId':'CURRENT','campaignName':'Test','productId':1,'productName':'Test product','status':'Đang hoạt động',
        'startDate':'2026-10-08','endDate':'2026-11-03','currentDate':'2026-10-16','currentOrders':184,'moq':300,'target':500,'price':800000,
        'category':'Công nghệ / Phụ kiện điện tử','productType':'Phụ kiện','cancelledQuantity':16,
        'behavior':{'views':10000,'clicks':1000,'favorites':50,'addToCart':400,'source':'manual'},
        'productionPolicy':{'batchSize':10,'capacity':10000,'safetyBuffer':.05,'minimumProbability':.7},
        'dailyOrderQuantities':[{'date':f'2026-10-{day:02d}','quantity':{8:24,11:38,14:67,16:55}.get(day,0)} for day in range(8,17)]}


def test_feature_contract_uses_past_and_all_diagram_inputs():
    values=contract.snapshot_features(selected_payload())
    assert values['currentOrders']==184
    assert values['durationDays']==26 and values['daysRemaining']==18
    assert values['ordersPerDay']==pytest.approx(160/7)
    assert values['growthRate']==0  # fewer than two full weeks: no comparable weekly growth
    assert values['cancellationRate']==.08
    assert set(values)==set(contract.FEATURES)
    assert {'success','finalQuantity','snapshotDate'}.isdisjoint(values)


def test_synthetic_generator_is_reproducible_and_temporal_groups_disjoint():
    first=full_campaign.generate_demo(600,seed=9)
    second=full_campaign.generate_demo(600,seed=9)
    pd.testing.assert_frame_equal(first,second)
    assert {1,3,7,14}.issubset(set(first.elapsedDays))
    assert (first.success==(first.finalQuantity>=first.moq).astype(int)).all()
    data,splits,audit=full_campaign.temporal_splits(first,'2026-10-16','CURRENT')
    for key,frame in splits.items():
        for other_key,other in splits.items():
            if key!=other_key:assert set(frame.campaignId).isdisjoint(other.campaignId)
    assert (data.endDate<'2026-10-16').all()
    assert 'finalQuantity' not in contract.FEATURES


@pytest.fixture(scope='module')
def trained_history(tmp_path_factory):
    folder=tmp_path_factory.mktemp('full-model')
    data=full_campaign.generate_demo(600,seed=17)
    source=folder/'source';source.mkdir()
    # This is an integration fixture, never published as genuine historical data.
    data.to_csv(source/'samples.csv',index=False)
    (source/'metadata.json').write_text(json.dumps({'name':'Synthetic integration fixture','synthetic':True,'sourceStatement':'Synthetic integration fixture only'}),encoding='utf-8')
    original=contract.dataset
    contract.dataset=lambda dataset_id:source
    payload={**selected_payload(),'mode':'campaign_history','datasetId':'test-fixture'}
    try:result=full_campaign.train_and_predict(payload,folder,lambda *_:None)
    finally:contract.dataset=original
    return folder,result


def test_saved_full_model_and_test_metrics(trained_history):
    folder,result=trained_history
    artifact=joblib.load(folder/'model.joblib')
    assert artifact['features']==contract.FEATURES
    values=pd.DataFrame([contract.snapshot_features(selected_payload())])
    demand,lower,upper,probability=full_campaign.predict_artifact(artifact,values)
    assert result['predictedFinalDemand']==round(demand[0])
    assert result['successProbability']==round(probability[0]*100,2)
    assert 0<=result['successProbability']<=100
    assert result['demandLower']<=result['predictedFinalDemand']<=result['demandUpper']
    predictions=pd.read_csv(folder/'test_predictions.csv')
    assert np.mean(abs(predictions.finalQuantity-predictions.predictedFinal))==pytest.approx(result['metrics']['mae'])
    assert np.mean((predictions.success-predictions.probability)**2)==pytest.approx(result['classificationMetrics']['brier'])
    assert result['productionRange']['upper']<=10000
    assert 'next7' not in result
    assert all(count>0 for count in result['trainingCounts'].values())


@pytest.mark.parametrize('quantity',[0,12])
def test_saved_model_predicts_first_day_without_padding(trained_history,quantity):
    folder,_=trained_history
    payload=selected_payload()
    payload.update(startDate=payload['currentDate'],currentOrders=quantity,cancelledQuantity=0,
        dailyOrderQuantities=[{'date':payload['currentDate'],'quantity':quantity}])
    values=contract.snapshot_features(payload)
    assert values['elapsedDays']==1
    assert values['ordersPerDay']==quantity
    assert values['growthRate']==0
    artifact=joblib.load(folder/'model.joblib')
    outputs=full_campaign.predict_artifact(artifact,pd.DataFrame([values]))
    assert all(np.isfinite(v).all() for v in outputs)
    assert 0<=outputs[3][0]<=1
