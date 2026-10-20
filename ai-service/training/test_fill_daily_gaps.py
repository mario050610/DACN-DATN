import importlib.util
from pathlib import Path
import pandas as pd
spec=importlib.util.spec_from_file_location('fill_daily_gaps',Path(__file__).with_name('fill_daily_gaps.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def test_past_only_fill_and_staleness():
    source=pd.DataFrame({'campaign_id':['1','1'],'date':['2020-01-02','2020-01-07'],'raised':[10,50],'funders':[1,5]})
    d=m.fill_history(source)
    assert len(d)==6
    assert d.raised.tolist()==[10,10,10,10,10,50]
    assert d.observation_age_days.tolist()==[0,1,2,3,4,0]
    assert d.training_eligible.tolist()==[True,True,True,False,False,True]
    assert d.is_observed.sum()==2
    assert (d.source_observed_date<=d.date).all()
    # Changing a future observation must not change the earlier filled values.
    source.loc[1,'raised']=1000
    assert m.fill_history(source).raised.iloc[:-1].equals(d.raised.iloc[:-1])
