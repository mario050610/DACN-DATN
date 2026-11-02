"""Real fit/serialize/predict integration across all allowed model families."""
from pathlib import Path
import sys,json
import pytest,joblib,pandas as pd,numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'));sys.path.insert(0,str(ROOT/'ai-service/training'))
import full_campaign
from test_full_campaign import selected_payload
from model_factory import make_estimator,MODEL_LABELS

@pytest.mark.parametrize('algorithm,expected',[('hist_gradient_boosting','HistGradientBoosting'),('random_forest','RandomForest'),('extra_trees','ExtraTrees')])
def test_full_training_uses_selected_estimators(tmp_path,monkeypatch,algorithm,expected):
    data=full_campaign.generate_demo(600,seed=17)
    source=tmp_path/'source';source.mkdir();data.to_csv(source/'samples.csv',index=False)
    (source/'metadata.json').write_text(json.dumps({'name':'Synthetic test only','synthetic':True}),encoding='utf-8')
    monkeypatch.setattr(full_campaign.contract,'dataset',lambda _:source)
    payload={**selected_payload(),'mode':'campaign_history','datasetId':'fixture','modelAlgorithm':algorithm}
    result=full_campaign.train_and_predict(payload,tmp_path,lambda *_:None)
    artifact=joblib.load(tmp_path/'model.joblib')
    assert artifact['modelAlgorithm']==result['modelAlgorithm']==algorithm
    assert result['modelLabel']==MODEL_LABELS[algorithm]
    assert type(artifact['regressor'].steps[-1][1]).__name__==expected+'Regressor'
    assert type(artifact['classifier'].steps[-1][1]).__name__==expected+'Classifier'
    frame=pd.DataFrame([full_campaign.contract.snapshot_features(payload)])
    demand,lower,upper,probability=full_campaign.predict_artifact(artifact,frame)
    assert np.isfinite(demand).all() and lower[0]<=demand[0]<=upper[0]
    assert 0<=probability[0]<=1
    assert result['predictedFinalDemand']==round(demand[0])
    # The retail path uses the same raw regressor factory with numeric features.
    retail=make_estimator(algorithm,False)
    X=pd.DataFrame({'quantity_today':np.arange(80),'last7':np.arange(80)*5,'last28':np.arange(80)*12,'month':[10]*80})
    retail.fit(X,np.log1p(np.arange(80)*2));assert np.isfinite(retail.predict(X)).all()

@pytest.mark.parametrize('algorithm,expected',[('hist_gradient_boosting','HistGradientBoostingRegressor'),('random_forest','RandomForestRegressor'),('extra_trees','ExtraTreesRegressor')])
def test_retail_worker_preserves_algorithm(tmp_path,monkeypatch,algorithm,expected):
    import train,ui_worker
    from app.services import training_jobs as jobs
    monkeypatch.setenv('TRAINING_JOBS_DIR',str(tmp_path/'jobs'))
    for name in ['RAW','PROCESSED','REPORTS']:
        directory=tmp_path/name;directory.mkdir();monkeypatch.setattr(train,name,directory)
    source=train.RAW/'uci/online_retail_II.xlsx';source.parent.mkdir();source.touch()
    stamp={'size':source.stat().st_size,'mtime_ns':source.stat().st_mtime_ns,'top_products':100}
    rows=[]
    for split,start,count in [('train','2020-01-01',100),('validation','2021-01-01',60),('test','2022-01-01',30)]:
        for i,day in enumerate(pd.date_range(start,periods=count)):
            q=i%20+1;rows.append({'split':split,'asof':day,'quantity_today':q,'last7':q*7,'last28':q*28,'month':day.month,'next7':q*8+3})
    pd.DataFrame(rows).to_csv(train.PROCESSED/'retail_samples.csv',index=False)
    (train.PROCESSED/'retail_source.json').write_text(json.dumps(stamp),encoding='utf-8')
    payload={**selected_payload(),'mode':'retail','modelAlgorithm':algorithm,'rebuildData':False}
    job=jobs.create(payload);ui_worker.run(job)
    saved=jobs.get(job);assert saved['status']=='succeeded',saved['error']
    assert saved['result']['modelAlgorithm']==algorithm
    artifact=joblib.load(jobs.directory()/job/'model.joblib')
    assert artifact['modelAlgorithm']==algorithm
    assert type(artifact['model']).__name__==expected
