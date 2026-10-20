"""Clean downloaded research data without changing raw files or training models.
Run: .venv\\Scripts\\python.exe -X utf8 training\\clean_data.py
"""
from pathlib import Path
import csv, json, sqlite3, time
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw'
OUT=ROOT/'data/processed/cleaned'

def export_query(db, sql, path):
    cur=db.execute(sql)
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.writer(f); writer.writerow([c[0] for c in cur.description])
        while rows:=cur.fetchmany(10000): writer.writerows(rows)

def webrobots():
    files=sorted((RAW/'webrobots').rglob('*.csv'))
    dbpath=OUT/'webrobots.sqlite3'
    if dbpath.exists(): dbpath.unlink()
    db=sqlite3.connect(dbpath)
    db.execute('PRAGMA journal_mode=WAL'); db.execute('PRAGMA synchronous=NORMAL')
    db.execute('CREATE TABLE observations(snapshot TEXT, campaign_id INTEGER, launched_at TEXT, deadline TEXT, goal REAL, pledged REAL, backers_count INTEGER, currency TEXT, country TEXT, category TEXT, state TEXT, source_file TEXT, source_row INTEGER, PRIMARY KEY(snapshot,campaign_id)) WITHOUT ROWID')
    cols=['id','launched_at','deadline','goal','pledged','backers_count','currency','country','category','state']
    audit={'raw_rows':0,'invalid_rows':0,'duplicate_snapshot_project_rows':0,'files':[]}
    def category(value):
        try:
            obj=json.loads(value); return str(obj.get('slug') or obj.get('name') or '').strip()
        except (ValueError,TypeError,AttributeError): return ''
    for index,path in enumerate(files,1):
        before=path.stat(); snap=path.parent.name.removeprefix('Kickstarter_'); count=bad=dupes=0
        for frame in pd.read_csv(path,usecols=cols,chunksize=20000,low_memory=False):
            n=len(frame); row_numbers=np.arange(count+2,count+n+2); count+=n
            for key in ['id','goal','pledged','backers_count','launched_at','deadline']:
                frame[key]=pd.to_numeric(frame[key],errors='coerce')
            launch=pd.to_datetime(frame.launched_at,unit='s',utc=True,errors='coerce')
            deadline=pd.to_datetime(frame.deadline,unit='s',utc=True,errors='coerce')
            valid=np.isfinite(frame[['id','goal','pledged','backers_count']]).all(axis=1)&frame.id.gt(0)&frame.id.mod(1).eq(0)&frame.goal.gt(0)&frame.pledged.ge(0)&frame.backers_count.ge(0)&frame.backers_count.mod(1).eq(0)&launch.notna()&deadline.gt(launch)&frame.currency.astype('string').str.fullmatch('[A-Za-z]{3}',na=False)&frame.state.notna()
            bad+=int((~valid).sum())
            frame=frame.loc[valid].copy(); frame['launched_at']=launch.loc[valid].dt.strftime('%Y-%m-%dT%H:%M:%SZ'); frame['deadline']=deadline.loc[valid].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            frame['category']=frame.category.map(category)
            frame['currency']=frame.currency.str.upper(); frame['state']=frame.state.str.strip().str.lower()
            frame['country']=frame.country.fillna('').astype(str).str.upper()
            rows=[(snap,int(r.id),r.launched_at,r.deadline,float(r.goal),float(r.pledged),int(r.backers_count),r.currency,r.country,r.category,r.state,str(path.relative_to(RAW)),int(line)) for r,line in zip(frame.itertuples(index=False),row_numbers[valid.to_numpy()])]
            old=db.total_changes
            db.executemany('INSERT OR IGNORE INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',rows)
            dupes+=len(rows)-(db.total_changes-old)
        db.commit()
        after=path.stat()
        if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns): raise RuntimeError(f'Input changed: {path}')
        audit['files'].append({'path':str(path.relative_to(RAW)),'bytes':before.st_size,'mtime_ns':before.st_mtime_ns,'rows':count,'invalid':bad,'duplicates':dupes})
        audit['raw_rows']+=count; audit['invalid_rows']+=bad; audit['duplicate_snapshot_project_rows']+=dupes
        if index%20==0 or index==len(files): print(f'Webrobots {index}/{len(files)} files; {audit["raw_rows"]:,} rows',flush=True)
    db.execute('CREATE INDEX project_snapshot ON observations(campaign_id,snapshot)')
    db.execute('CREATE VIEW latest_projects AS SELECT o.* FROM observations o WHERE snapshot=(SELECT MAX(n.snapshot) FROM observations n WHERE n.campaign_id=o.campaign_id)')
    audit['clean_observations']=db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]
    audit['unique_projects']=db.execute('SELECT COUNT(*) FROM latest_projects').fetchone()[0]
    audit['snapshots']=[{'snapshot':s,'rows':n} for s,n in db.execute('SELECT snapshot,COUNT(*) FROM observations GROUP BY snapshot')]
    assert audit['raw_rows']==audit['invalid_rows']+audit['duplicate_snapshot_project_rows']+audit['clean_observations']
    export_query(db,'SELECT * FROM latest_projects',OUT/'webrobots_latest.csv')
    export_query(db,"SELECT * FROM latest_projects WHERE state IN ('successful','failed')",OUT/'webrobots_completed.csv')
    db.commit(); db.execute('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()
    return audit

def vt():
    p=pd.read_csv(RAW/'virginia-tech/18k_Projects.csv',sep='\t',usecols=['Id','Start','End','Goal','State','Top Category','Currency'],dtype={'Id':str})
    total=len(p); p=p.drop_duplicates('Id',keep='first').copy()
    p['Goal']=pd.to_numeric(p.Goal,errors='coerce')
    for col in ['Start','End']: p[col]=pd.to_datetime(p[col],errors='coerce')
    p=p.loc[p.Id.str.fullmatch(r'\d+',na=False)&p.Goal.gt(0)&p.Start.notna()&p.End.gt(p.Start)].copy()
    p.to_csv(OUT/'vt_projects.csv',index=False,encoding='utf-8-sig')
    h=pd.read_csv(RAW/'virginia-tech/History.csv',header=None,names=['campaign_id','date','raised','funders'],dtype={'campaign_id':str}); raw=len(h)
    h['date']=pd.to_datetime(h.date,errors='coerce')
    for col in ['raised','funders']: h[col]=pd.to_numeric(h[col],errors='coerce')
    numeric_valid=h.date.notna()&np.isfinite(h[['raised','funders']]).all(axis=1)&h.raised.ge(0)&h.funders.ge(0)&h.funders.mod(1).eq(0)
    unmatched=h.loc[numeric_valid&~h.campaign_id.isin(p.Id)].drop_duplicates(['campaign_id','date'],keep='last').sort_values(['campaign_id','date'])
    unmatched.to_csv(OUT/'vt_history_unmatched.csv',index=False,encoding='utf-8-sig')
    valid=numeric_valid&h.campaign_id.isin(p.Id)
    h=h.loc[valid].copy(); invalid=raw-len(h); before=len(h)
    h=h.drop_duplicates(['campaign_id','date'],keep='last').sort_values(['campaign_id','date'])
    h.to_csv(OUT/'vt_history.csv',index=False,encoding='utf-8-sig')
    return {'raw_projects':total,'clean_projects':len(p),'excluded_projects':total-len(p),'raw_history_rows':raw,'invalid_or_unmatched_history_rows':invalid,'duplicate_history_rows':before-len(h),'clean_history_rows':len(h),'unmatched_history_rows_preserved_separately':len(unmatched),'unmatched_projects':int(unmatched.campaign_id.nunique())}

def retail():
    print('Reading UCI workbook (two sheets)...',flush=True)
    tables=pd.read_excel(RAW/'uci/online_retail_II.xlsx',sheet_name=None,engine='openpyxl')
    f=pd.concat(tables.values(),ignore_index=True); raw=len(f); f=f.drop_duplicates(); duplicates=raw-len(f)
    f=f.rename(columns={'Invoice':'invoice','StockCode':'product_id','Quantity':'quantity','InvoiceDate':'date','Price':'price'})
    f['date']=pd.to_datetime(f.date,errors='coerce')
    for col in ['quantity','price']: f[col]=pd.to_numeric(f[col],errors='coerce')
    valid=f.date.notna()&np.isfinite(f[['quantity','price']]).all(axis=1)&f.quantity.ne(0)&f.price.gt(0)&f.product_id.astype(str).str.fullmatch(r'\d{5}[A-Za-z]*')
    clean=f.loc[valid,['invoice','product_id','quantity','date','price','Country']].copy()
    returned=clean.quantity.lt(0)|clean.invoice.astype(str).str.upper().str.startswith('C')
    clean.loc[~returned].to_csv(OUT/'retail_sales.csv',index=False,encoding='utf-8-sig')
    clean.loc[returned].to_csv(OUT/'retail_returns.csv',index=False,encoding='utf-8-sig')
    return {'raw_rows':raw,'exact_duplicates':duplicates,'excluded_invalid_or_non_product_rows':len(f)-len(clean),'sales_rows':int((~returned).sum()),'returns_rows':int(returned.sum())}

def main():
    OUT.mkdir(parents=True,exist_ok=True); report={'started_at_utc':pd.Timestamp.now(tz='UTC').isoformat(),'policies':[
        'Raw files are never modified. No model training is performed.',
        'Webrobots duplicate key is (snapshot, project_id); first valid row in sorted file order wins. Cross-snapshot history is preserved.',
        'Invalid rows are counted, never filled with invented observations. Unknown category is kept empty; monetary currencies are not mixed or converted.',
        'Retail exact duplicates are removed before dropping customer/description columns; returns are exported separately; no outlier clipping.',
        'VT duplicate project/day history keeps last source row. Unmatched valid history is preserved separately in vt_history_unmatched.csv; invalid rows excluded.',
        'Kickstarter pledged/backers are funding/backers, not product quantities. Views, clicks, MOQ and final product quantity are unavailable.'
    ]}
    for name,fn in [('webrobots',webrobots),('virginia_tech',vt),('retail',retail)]:
        print(f'Start {name}',flush=True); report[name]=fn()
        (OUT/'cleaning_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    from fill_daily_gaps import main as fill_daily_gaps
    fill_daily_gaps()
    report['finished_at_utc']=pd.Timestamp.now(tz='UTC').isoformat()
    (OUT/'cleaning_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['policies','webrobots']},ensure_ascii=False,default=str),flush=True)
if __name__=='__main__': main()
