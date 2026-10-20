"""Checks the real prepared data and trained artifacts; run after train.py."""
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

ROOT=Path(__file__).resolve().parents[1]

@pytest.mark.parametrize('name',['retail_next7','vt_campaign_success','webrobots_launch_success'])
def test_persisted_model_excludes_outcomes_and_produces_finite_values(name):
    artifact=joblib.load(ROOT/f'model_artifacts/research/{name}.joblib')
    source={'retail_next7':'retail','vt_campaign_success':'vt','webrobots_launch_success':'webrobots'}[name]
    data=pd.read_csv(ROOT/f'data/processed/{source}_samples.csv')
    features=artifact['features']
    forbidden={'success','next7','state','pledged','backers_count','percent_funded','spotlight','state_changed_at'}
    assert forbidden.isdisjoint(features)
    sample=data.loc[data.split.eq('test'),features].head(20)
    pred=artifact['model'].predict_proba(sample)[:,1] if artifact['classification'] else np.expm1(artifact['model'].predict(sample))
    assert np.isfinite(pred).all()
    if artifact['classification']: assert ((pred>=0)&(pred<=1)).all()

@pytest.mark.parametrize('source',['vt','webrobots'])
def test_campaigns_disjoint_and_outcomes_available_before_future_cohort(source):
    data=pd.read_csv(ROOT/f'data/processed/{source}_samples.csv',parse_dates=['start','end'])
    train=data.loc[data.split.eq('train')]
    val=data.loc[data.split.eq('validation')]
    test=data.loc[data.split.eq('test')]
    assert set(train.campaign_id).isdisjoint(val.campaign_id)
    assert set(train.campaign_id).isdisjoint(test.campaign_id)
    assert set(val.campaign_id).isdisjoint(test.campaign_id)
    assert train.end.max()<val.start.min()
    assert val.end.max()<test.start.min()


def test_retail_label_windows_do_not_cross_temporal_boundaries():
    data=pd.read_csv(ROOT/'data/processed/retail_samples.csv',parse_dates=['asof','label_end'])
    train=data.loc[data.split.eq('train')]
    val=data.loc[data.split.eq('validation')]
    test=data.loc[data.split.eq('test')]
    assert train.label_end.max()<val["asof"].min()
    assert val.label_end.max()<test["asof"].min()
    assert ((data.label_end-data["asof"]).dt.days==7).all()
    assert (data.next7>=0).all()
    assert (data["asof"].dt.dayofweek==6).all()


def test_vt_features_match_past_observations_not_final_totals():
    data=pd.read_csv(ROOT/'data/processed/vt_samples.csv',dtype={'campaign_id':str},parse_dates=['asof'])
    history=pd.read_csv(ROOT/'data/raw/virginia-tech/History.csv',header=None,names=['campaign_id','date','raised','funders'],dtype={'campaign_id':str},parse_dates=['date'])
    history=history.drop_duplicates(['campaign_id','date'],keep='last')
    metadata=pd.read_csv(ROOT/'data/raw/virginia-tech/18k_Projects.csv',sep='\t',dtype={'Id':str},usecols=['Id','Goal']).set_index('Id')
    for row in data.groupby('split').head(5).itertuples():
        observations=history.loc[history.campaign_id.eq(row.campaign_id)&history.date.lt(row.asof)].sort_values('date')
        last=observations.iloc[-1]
        assert np.isclose(row.funding_ratio,last.raised/metadata.loc[row.campaign_id,'Goal'])
        assert np.isclose(row.log_funders,np.log1p(last.funders))
        assert 0<(row.asof-last.date).days<=2


def test_report_metrics_are_recomputed_from_predictions():
    for name in ['retail_next7','vt_campaign_success','webrobots_launch_success']:
        report=json.loads((ROOT/f'training/reports/{name}.json').read_text(encoding='utf-8'))
        data=pd.read_csv(ROOT/f'data/processed/{name}_test_predictions.csv')
        if name=='retail_next7':
            actual=np.mean(np.abs(data.actual-data.prediction))
            assert np.isclose(actual,report['evaluation']['test']['model']['mae'])
        else:
            actual=np.mean((data.actual-data.prediction)**2)
            assert np.isclose(actual,report['evaluation']['test']['model']['brier'])
