"""Reproducible offline research models. Never treats backers/funding as PREORA units."""
from __future__ import annotations
import os
os.environ.setdefault('OMP_NUM_THREADS', '4')
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, f1_score, roc_auc_score, brier_score_loss
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw'
PROCESSED = ROOT / 'data/processed'
REPORTS = ROOT / 'training/reports'
ARTIFACTS = ROOT / 'model_artifacts/research'
SEED = 42
USE_CLEANED = False
CLEANED = PROCESSED / "cleaned"


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, default=str, allow_nan=False), encoding='utf-8')


def regression_scores(y, pred):
    return {'mae': float(mean_absolute_error(y, pred)), 'rmse': float(np.sqrt(mean_squared_error(y, pred))),
            'wape': float(np.abs(np.asarray(y)-pred).sum()/max(np.abs(y).sum(), 1))}


def classification_scores(y, probability):
    return {'f1': float(f1_score(y, probability >= .5, zero_division=0)),
            'roc_auc': float(roc_auc_score(y, probability)) if y.nunique() > 1 else None,
            'brier': float(brier_score_loss(y, probability)), 'positive_rate': float(y.mean())}


def make_model(numeric, categorical, classification):
    transform = ColumnTransformer([
        ('numeric', SimpleImputer(strategy='median'), numeric),
        ('category', make_pipeline(SimpleImputer(strategy='most_frequent'),
          OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)), categorical),
    ])
    # Fixed iteration budget: no random early-stopping split across temporal groups.
    estimator = (HistGradientBoostingClassifier if classification else HistGradientBoostingRegressor)(
        max_iter=120, max_leaf_nodes=15, l2_regularization=2, early_stopping=False, random_state=SEED)
    return make_pipeline(transform, estimator)


def train_task(name, data, numeric, categorical, target, classification, baseline, notes):
    fields = numeric + categorical
    splits = {key: data.loc[data.split.eq(key)].copy() for key in ('train','validation','test')}
    if any(len(frame) < 20 for frame in splits.values()):
        raise ValueError(f'{name}: too few samples: { {k:len(v) for k,v in splits.items()} }')
    if classification and any(frame[target].nunique() < 2 for frame in splits.values()):
        raise ValueError(f'{name}: every split must contain both labels')
    for a,b in [('train','validation'),('train','test'),('validation','test')]:
        if 'campaign_id' in data:
            assert set(splits[a].campaign_id).isdisjoint(splits[b].campaign_id)
    candidates = []
    models = []
    for leaves in (7, 15):
        model = make_model(numeric, categorical, classification)
        model.steps[-1][1].set_params(max_leaf_nodes=leaves)
        train = splits['train']
        y = train[target] if classification else np.log1p(train[target])
        model.fit(train[fields], y)
        val = splits['validation']
        pred = model.predict_proba(val[fields])[:,1] if classification else np.maximum(0,np.expm1(model.predict(val[fields])))
        scores = classification_scores(val[target],pred) if classification else regression_scores(val[target],pred)
        candidates.append({'max_leaf_nodes':leaves, 'validation':scores})
        models.append(model)
    metric = 'brier' if classification else 'mae'
    best = min(range(len(models)),key=lambda i:candidates[i]['validation'][metric])
    model = models[best]
    report = {'trained_utc':datetime.now(timezone.utc).isoformat(), 'task':name, 'target':target, 'features':fields, 'source_domain_only':True, 'cleaned_inputs':USE_CLEANED, 'notes':notes,
              'candidates':candidates, 'selected_max_leaf_nodes':candidates[best]['max_leaf_nodes'],
              'split_counts':{k:len(v) for k,v in splits.items()}, 'evaluation':{}}
    prior = splits['train'][target].mean()
    for key in ('validation','test'):
        frame = splits[key]
        pred = model.predict_proba(frame[fields])[:,1] if classification else np.maximum(0,np.expm1(model.predict(frame[fields])))
        base = np.full(len(frame),prior) if classification else frame[baseline].to_numpy()
        score = classification_scores if classification else regression_scores
        report['evaluation'][key] = {'model':score(frame[target],pred),'baseline':score(frame[target],base)}
        pd.DataFrame({'actual':frame[target].to_numpy(),'prediction':pred,'baseline':base}).to_csv(PROCESSED/f'{name}_{key}_predictions.csv',index=False)
    report['test_beats_baseline'] = report['evaluation']['test']['model'][metric] < report['evaluation']['test']['baseline'][metric]
    artifact = {'model':model, 'features':fields,'target':target,'classification':classification,
                'target_transform':None if classification else 'log1p', 'sklearn_version':sklearn.__version__,
                'source_domain_only':True,'report':report}
    path = ARTIFACTS/f'{name}.joblib'
    joblib.dump(artifact,path)
    # Verify a persisted model gives identical inference.
    restored = joblib.load(path)
    sample = splits['test'][fields].head(5)
    np.testing.assert_allclose(model.predict(sample),restored['model'].predict(sample))
    report['artifact_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    write_json(REPORTS/f'{name}.json',report)
    print(name, json.dumps(report['evaluation']['test']),flush=True)
    return report


def prepare_retail(top_products, train_model=True):
    if USE_CLEANED:
        print('Reading cleaned UCI sales...',flush=True)
        sales=pd.read_csv(CLEANED/'retail_sales.csv',dtype={'product_id':str})
        sales['date']=pd.to_datetime(sales.date).dt.normalize()
        audit_source=json.loads((CLEANED/'cleaning_report.json').read_text(encoding='utf-8'))['retail']
        original=audit_source['raw_rows'];duplicate_count=audit_source['exact_duplicates']
        raw=sales
    else:
        path = RAW/'uci/online_retail_II.xlsx'
        print('Reading UCI workbook...',flush=True)
        tables = pd.read_excel(path,sheet_name=None,engine='openpyxl')
        raw = pd.concat(tables.values(),ignore_index=True)
        raw.columns = raw.columns.str.strip()
        raw = raw.rename(columns={'Invoice':'invoice','StockCode':'product_id','Quantity':'quantity','InvoiceDate':'date','Price':'price'})
        original = len(raw)
        raw = raw.drop_duplicates()
        duplicate_count = original-len(raw)
        raw['date'] = pd.to_datetime(raw.date,errors='coerce').dt.normalize()
        raw['quantity'] = pd.to_numeric(raw.quantity,errors='coerce')
        raw['price'] = pd.to_numeric(raw.price,errors='coerce')
        raw['product_id'] = raw.product_id.astype(str)
        # Gross positive sales; returns are not silently subtracted from unrelated dates.
        sales = raw.loc[raw.date.notna() & raw.quantity.gt(0) & raw.price.gt(0) &
                        ~raw.invoice.astype(str).str.upper().str.startswith('C') & raw.product_id.str.fullmatch(r'\d{5}[A-Za-z]*')].copy()
    train_cut = pd.Timestamp('2011-03-01')
    test_cut = pd.Timestamp('2011-07-01')
    history = sales.loc[sales.date.lt(train_cut)]
    selected = history.groupby('product_id').quantity.sum().nlargest(top_products).index
    daily = sales.loc[sales.product_id.isin(selected)].groupby(['product_id','date']).agg(quantity=('quantity','sum'),price=('price','median')).reset_index()
    last_day = sales.date.max()
    samples=[]
    observed_days=pd.DatetimeIndex(sales.date.unique())
    for product_id, group in daily.groupby('product_id'):
        frame = group.set_index('date').reindex(pd.date_range(group.date.min(),last_day,freq='D'))
        quantity = frame.quantity.fillna(0)
        # No backfill: historical prices only.
        price = frame.price.ffill()
        cumulative = quantity.cumsum()
        out = pd.DataFrame({'product_id':product_id,'asof':frame.index,'quantity_today':quantity.to_numpy(),
                            'price':price.to_numpy(),'last7':quantity.rolling(7).sum().to_numpy(),
                            'last28':quantity.rolling(28).sum().to_numpy(),
                            'next7':(cumulative.shift(-7)-cumulative).to_numpy()})
        if USE_CLEANED:
            coverage=pd.Series(frame.index.isin(observed_days).astype(int),index=frame.index)
            out['observed_days_last7']=coverage.rolling(7).sum().to_numpy()
            out['observed_days_last28']=coverage.rolling(28).sum().to_numpy()
        out['weekday']=out["asof"].dt.dayofweek
        out['month']=out["asof"].dt.month
        out['label_end']=out["asof"]+pd.Timedelta(days=7)
        out['split']='excluded'
        out.loc[out.label_end.lt(train_cut),'split']='train'
        out.loc[out["asof"].ge(train_cut)&out.label_end.lt(test_cut),'split']='validation'
        out.loc[out["asof"].ge(test_cut),'split']='test'
        # Weekly forecast origins limit overlapping evaluation windows.
        out=out.loc[out["asof"].dt.dayofweek.eq(6)&out.split.ne('excluded')].dropna()
        samples.append(out)
    data=pd.concat(samples,ignore_index=True)
    data.to_csv(PROCESSED/'retail_samples.csv',index=False)
    audit={'raw_rows':original,'exact_duplicates_removed':duplicate_count,'clean_positive_sales_rows':len(sales),
           'selected_products':len(selected),'selection':'top quantities using training period only',
           'excluded_non_sales_rows':original-duplicate_count-len(sales),'cleaned_inputs':USE_CLEANED,'train_cut':str(train_cut),'test_cut':str(test_cut)}
    write_json(REPORTS/'retail_data_audit.json',audit)
    if not train_model:
        return data
    return train_task('retail_next7',data,(['quantity_today','price','last7','last28','weekday','month']+(['observed_days_last7','observed_days_last28'] if USE_CLEANED else [])),['product_id'],
                      'next7',False,'last7',[
        'UCI recorded gross sales for next 7 days; NOT campaign final quantities or unconstrained demand.',
        'Top product cohort selected on training period only. Same products may occur in future test periods.',
        'Target is recorded gross sales only. Missing records contribute zero recorded sales, not proven zero demand. Global past-day coverage features are included in cleaned mode; stockouts/listing availability remain unknown.',
        'Exact duplicate lines removed; some may represent genuine identical purchases.',
        '7-day labels are purged at temporal boundaries; no customer identifiers are exported.'])


def campaign_split(data, validation_fraction=.70, test_fraction=.85):
    campaigns=data[['campaign_id','start','end']].drop_duplicates('campaign_id').sort_values(['start','campaign_id'])
    val_cut=campaigns.start.quantile(validation_fraction)
    test_cut=campaigns.start.quantile(test_fraction)
    data=data.copy()
    data['split']='excluded'
    data.loc[data.start.lt(val_cut)&data.end.lt(val_cut),'split']='train'
    data.loc[data.start.ge(val_cut)&data.start.lt(test_cut)&data.end.lt(test_cut),'split']='validation'
    data.loc[data.start.ge(test_cut),'split']='test'
    return data.loc[data.split.ne('excluded')].copy(), {'validation_start':str(val_cut),'test_start':str(test_cut),'purged_samples':int(data.split.eq('excluded').sum())}


def prepare_vt():
    print('Preparing Virginia Tech daily snapshots...',flush=True)
    if USE_CLEANED:
        projects=pd.read_csv(CLEANED/'vt_projects.csv',dtype={'Id':str})
        history=pd.read_csv(CLEANED/'vt_history_daily.csv',dtype={'campaign_id':str})
        history['source_observed_date']=pd.to_datetime(history.source_observed_date)
    else:
        projects=pd.read_csv(RAW/'virginia-tech/18k_Projects.csv',sep='\t',dtype={'Id':str},usecols=['Id','Start','End','Goal','State','Top Category','Currency'])
        history=pd.read_csv(RAW/'virginia-tech/History.csv',header=None,names=['campaign_id','date','raised','funders'],dtype={'campaign_id':str})
    projects=projects.rename(columns={'Id':'campaign_id','Start':'start','End':'end','Goal':'goal','State':'state','Top Category':'category','Currency':'currency'})
    for col in ['start','end']: projects[col]=pd.to_datetime(projects[col],errors='coerce')
    projects['goal']=pd.to_numeric(projects.goal,errors='coerce')
    projects=projects.drop_duplicates('campaign_id')
    projects=projects.loc[projects.state.isin(['successful','failed'])&projects.goal.gt(0)&projects.start.notna()&projects.end.gt(projects.start)].copy()
    history['date']=pd.to_datetime(history.date,errors='coerce')
    for col in ['raised','funders']: history[col]=pd.to_numeric(history[col],errors='coerce')
    history=history.dropna().loc[lambda f:f.raised.ge(0)&f.funders.ge(0)].drop_duplicates(['campaign_id','date'],keep='last')
    groups={key:group.sort_values('date') for key,group in history.groupby('campaign_id')}
    rows=[]
    for record in projects.to_dict('records'):
        group=groups.get(record['campaign_id'])
        if group is None: continue
        for day in (7,14,21):
            # Forecast at the start of this day, using completed preceding days only.
            asof=record['start']+pd.Timedelta(days=day)
            if asof>=record['end']: continue
            observed=group.loc[group.date.ge(record['start'])&group.date.lt(asof)]
            if observed.empty: continue
            latest=observed.iloc[-1]
            source_date=latest.source_observed_date if USE_CLEANED else latest.date
            age=(asof-source_date).days
            if age>2: continue
            rows.append({'campaign_id':record['campaign_id'],'start':record['start'],'end':record['end'],
                'asof':asof,'elapsed':day,'remaining':(record['end']-asof).days,
                'log_goal':np.log1p(record['goal']),'funding_ratio':latest.raised/record['goal'],
                'log_funders':np.log1p(latest.funders),'observation_age':age,
                'category':record['category'],'currency':record['currency'],
                'success':int(record['state']=='successful')})
    data,audit=campaign_split(pd.DataFrame(rows), validation_fraction=.60)
    audit.update({'projects_read':len(projects),'history_rows':len(history),'matched_history_projects':len(set(projects.campaign_id)&set(history.campaign_id)),
                  'cleaned_inputs':USE_CLEANED,'sample_count':len(data),'campaigns_used':data.campaign_id.nunique(), 'validation_fraction':.60, 'test_fraction':.85})
    write_json(REPORTS/'vt_data_audit.json',audit)
    data.to_csv(PROCESSED/'vt_samples.csv',index=False)
    return train_task('vt_campaign_success',data,['elapsed','remaining','log_goal','funding_ratio','log_funders','observation_age'],
                      ['category','currency'],'success',True,None,[
        'Predicts Kickstarter funding success, NOT PREORA MOQ success.',
        'Snapshots at day 7/14/21 use historical observations strictly before forecast time.',
        'No final pledged/backers/state features. Labels use terminal successful/failed state only.',
        'Project-disjoint time split; training outcomes end before validation launch boundary.',
        'Metadata category/goal may have been edited; historical immutability cannot be proven from these files.',
        'Canceled/suspended projects excluded; reported metrics do not cover these outcomes.'])


def prepare_webrobots():
    if USE_CLEANED:
        print('Reading cleaned Web Robots latest projects...',flush=True)
        data=pd.read_csv(CLEANED/'webrobots_latest.csv',dtype={'campaign_id':str}).rename(columns={'campaign_id':'id'})
        for col in ['launched_at','deadline']:
            data[col]=pd.to_datetime(data[col],utc=True).astype('int64')//10**9
        # The common transformation below expects the original category JSON shape.
        data['category']=data.category.fillna('unknown').map(lambda value:json.dumps({'slug':value}))
        source_audit=json.loads((CLEANED/'cleaning_report.json').read_text(encoding='utf-8'))['webrobots']
        raw_rows=source_audit['raw_rows'];files=source_audit['files']
    else:
        print('Reading Web Robots CSV shards (only selected columns)...',flush=True)
        columns=['id','goal','currency','country','category','launched_at','deadline','state']
        files=sorted((RAW/'webrobots').rglob('*.csv'))
        tables=[]
        for i,path in enumerate(files):
            frame=pd.read_csv(path,usecols=columns,dtype={'id':str},low_memory=False)
            tables.append(frame)
            if (i+1)%20==0: print(f'  {i+1}/{len(files)} shards',flush=True)
        data=pd.concat(tables,ignore_index=True)
        raw_rows=len(data)
        # Prefer latest snapshot. Sort paths chronologically and keep the last ID.
        data=data.drop_duplicates('id',keep='last')
    unique=len(data)
    data=data.rename(columns={'id':'campaign_id','launched_at':'start','deadline':'end'})
    data['start']=pd.to_datetime(pd.to_numeric(data.start,errors='coerce'),unit='s',errors='coerce').dt.normalize()
    data['end']=pd.to_datetime(pd.to_numeric(data.end,errors='coerce'),unit='s',errors='coerce').dt.normalize()
    data['goal']=pd.to_numeric(data.goal,errors='coerce')
    data=data.loc[data.state.isin(['successful','failed'])&data.goal.gt(0)&data.start.notna()&data.end.gt(data.start)].copy()
    def category_name(value):
        try: return json.loads(value).get('slug','unknown')
        except (TypeError,ValueError): return 'unknown'
    data['category']=data.category.map(category_name)
    data['duration']=(data.end-data.start).dt.days
    data['launch_month']=data.start.dt.month
    data['log_goal']=np.log1p(data.goal)
    data['success']=data.state.eq('successful').astype(int)
    data,audit=campaign_split(data)
    audit.update({'files':len(files),'raw_rows':raw_rows,'unique_ids':unique,'rows_not_in_latest_view':raw_rows-unique,'cleaned_inputs':USE_CLEANED,'samples_used':len(data)})
    write_json(REPORTS/'webrobots_data_audit.json',audit)
    # Export only model inputs/labels; never creator profiles or URLs with API signatures.
    fields=['campaign_id','start','end','duration','launch_month','log_goal','category','currency','country','success','split']
    data[fields].to_csv(PROCESSED/'webrobots_samples.csv',index=False)
    return train_task('webrobots_launch_success',data,['duration','launch_month','log_goal'],['category','currency','country'],
                      'success',True,None,[
        'Retrospective launch-metadata benchmark; not a daily-history forecast or PREORA MOQ model.',
        'No pledged/backers/percent_funded/spotlight/state_changed_at input. State is label only.',
        'Goal/category are from scraped snapshots; edits after launch cannot be ruled out.',
        'Deduplicated across all shards/snapshots before project-disjoint temporal split.',
        'Source coverage is incomplete; canceled/live/suspended projects are excluded.'])



def write_readable_report(reports):
    # Include the latest report for each existing task, even after a one-task rerun.
    latest = {}
    for path in REPORTS.glob('*.json'):
        saved = json.loads(path.read_text(encoding='utf-8'))
        if 'task' in saved:
            latest[saved['task']] = saved
    latest.update({report['task']:report for report in reports.values()})
    reports = latest
    lines = ["# Kết quả thực nghiệm AI", "", "Model nghiên cứu trên dữ liệu nguồn; chưa thay dự báo demo PREORA.", "", "| Tác vụ | Train / Validation / Test | Chỉ số test | Model | Baseline |", "|---|---|---|---|---|"]
    for name, report in reports.items():
        counts = report['split_counts']
        sizes = ' / '.join(str(counts[k]) for k in ['train','validation','test'])
        scores = report['evaluation']['test']
        for metric, value in scores['model'].items():
            if value is not None:
                lines.append(f"| {name} | {sizes} | {metric} | {value:.4f} | {scores['baseline'][metric]:.4f} |")
    lines += ["", "MAE/RMSE: sản phẩm trong 7 ngày. WAPE/Brier thấp hơn tốt hơn; F1/ROC-AUC cao hơn tốt hơn.", "", "UCI dùng 100 sản phẩm chọn từ train; Kickstarter không phải dữ liệu pre-order/MOQ của PREORA.", "Các snapshot của một chiến dịch không độc lập; chỉ số snapshot chưa kèm khoảng tin cậy theo chiến dịch.", "Metadata crowdfunding có thể đã được sửa sau launch. Xem README và JSON từng model để đọc giới hạn đầy đủ.", ""]
    (REPORTS/'TRAINING_REPORT.md').write_text('\n'.join(lines),encoding='utf-8')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--dataset',choices=['all','retail','vt','webrobots'],default='all')
    parser.add_argument('--cleaned',action='store_true',help='Use cleaned research exports and past-only daily history')
    parser.add_argument('--top-products',type=int,default=100)
    args=parser.parse_args()
    global USE_CLEANED
    USE_CLEANED=args.cleaned
    if args.top_products<1: parser.error('--top-products must be positive')
    for folder in [PROCESSED,REPORTS,ARTIFACTS]: folder.mkdir(parents=True,exist_ok=True)
    reports={}
    for name,runner in [('retail',lambda:prepare_retail(args.top_products)),('vt',prepare_vt),('webrobots',prepare_webrobots)]:
        if args.dataset in ['all',name]: reports[name]=runner()
    write_json(REPORTS/'run_summary.json',{'created_utc':datetime.now(timezone.utc).isoformat(),
               'python_seed':SEED,'versions':{'pandas':pd.__version__,'numpy':np.__version__,'sklearn':sklearn.__version__},
               'research_only':True,'cleaned_inputs':USE_CLEANED,'results':reports})
    write_readable_report(reports)
    print('Done. Models: '+str(ARTIFACTS)+'; reports: '+str(REPORTS),flush=True)

if __name__=='__main__': main()
