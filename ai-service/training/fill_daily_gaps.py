"""Create honest daily calendars: past-only estimates, explicit missingness, no fake sales."""
from pathlib import Path
import json
import pandas as pd

OUT=Path(__file__).resolve().parents[1]/'data/processed/cleaned'

def fill_history(group):
    group=group.copy(); group['date']=pd.to_datetime(group.date).dt.normalize()
    group=group.sort_values('date').set_index('date')
    daily=group.reindex(pd.date_range(group.index.min(),group.index.max(),name='date'))
    daily['is_observed']=daily['raised'].notna()
    daily['campaign_id']=str(group.campaign_id.iloc[0])
    daily['source_observed_date']=daily.index.where(daily.is_observed)
    daily['source_observed_date']=daily.source_observed_date.ffill()
    daily['observation_age_days']=(daily.index.to_series()-daily.source_observed_date).dt.days
    daily[['raised','funders']]=daily[['raised','funders']].ffill()
    daily['fill_method']=daily.is_observed.map({True:'observed',False:'past_value_carried_forward'})
    # Stale estimates remain visible but should not become fresh training observations.
    daily['training_eligible']=daily.observation_age_days.le(2)
    return daily.reset_index()

def main():
    history=pd.read_csv(OUT/'vt_history.csv',dtype={'campaign_id':str})
    history['date']=pd.to_datetime(history.date)
    bounds=history.groupby('campaign_id').date.agg(['min','max'])
    calendars=[pd.DataFrame({'campaign_id':key,'date':pd.date_range(row['min'],row['max'])}) for key,row in bounds.iterrows()]
    daily=pd.concat(calendars,ignore_index=True).merge(history,on=['campaign_id','date'],how='left',validate='one_to_one').sort_values(['campaign_id','date'])
    daily['is_observed']=daily.raised.notna()
    daily['source_observed_date']=daily.date.where(daily.is_observed)
    daily[['raised','funders','source_observed_date']]=daily.groupby('campaign_id')[['raised','funders','source_observed_date']].ffill()
    daily['observation_age_days']=(daily.date-daily.source_observed_date).dt.days
    daily['fill_method']=daily.is_observed.map({True:'observed',False:'past_value_carried_forward'})
    daily['training_eligible']=daily.observation_age_days.le(2)
    rows=len(daily);added=int((~daily.is_observed).sum());stale=int((~daily.training_eligible).sum())
    daily.to_csv(OUT/'vt_history_daily.csv',index=False,encoding='utf-8')
    print(f'VT: {rows} rows, {added} filled days, {stale} stale days',flush=True)
    sales=pd.read_csv(OUT/'retail_sales.csv',usecols=['date','quantity','price'])
    sales['date']=pd.to_datetime(sales.date).dt.normalize();sales['gross_revenue']=sales.quantity*sales.price
    grouped=sales.groupby('date').agg(quantity=('quantity','sum'),gross_revenue=('gross_revenue','sum'),transaction_lines=('quantity','size'))
    daily=grouped.reindex(pd.date_range(grouped.index.min(),grouped.index.max(),name='date'))
    daily['is_observed']=daily.quantity.notna()
    daily['missing_reason']=daily.is_observed.map({True:'',False:'no_valid_sales_records_unknown_if_closed_or_missing'})
    daily.to_csv(OUT/'retail_daily.csv',index=True,encoding='utf-8-sig')
    report={'virginia_tech':{'rows':rows,'observed_rows':len(history),'filled_days':added,'stale_over_2_days':stale,'method':'Carry previous observed cumulative values forward only within first/last observation. No backward fill or future interpolation. Not actual daily growth; no extension to campaign start/end.'},'retail':{'calendar_days':len(daily),'observed_days':int(daily.is_observed.sum()),'missing_days_kept_null':int((~daily.is_observed).sum()),'method':'Global daily sales calendar. Missing days remain null, not zero. Currency GBP; gross sales exclude returns.'},'webrobots':{'method':'Monthly snapshots remain unchanged. No daily observations invented.'},'training':'Existing models/training inputs unchanged. Use source_observed_date and observation_age_days; never treat filled dates as fresh observations. Split by campaign/time before any fitted preprocessing.'}
    (OUT/'daily_gap_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
