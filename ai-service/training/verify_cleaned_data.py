"""Read-only verification of cleaned research datasets and raw manifest."""
import json, sqlite3
from pathlib import Path
import pandas as pd
root=Path(__file__).resolve().parents[1]
out=root/'data/processed/cleaned'
r=json.loads((out/'cleaning_report.json').read_text(encoding='utf-8'))
assert 'finished_at_utc' in r, 'Cleaning has not completed'
w=r['webrobots']
assert w['raw_rows']==w['invalid_rows']+w['duplicate_snapshot_project_rows']+w['clean_observations']
for f in w['files']:
    stat=(root/'data/raw'/f['path']).stat()
    assert stat.st_size==f['bytes'] and stat.st_mtime_ns==f['mtime_ns'],f['path']
with sqlite3.connect(out/'webrobots.sqlite3') as db:
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]==w['clean_observations']
    assert db.execute('SELECT COUNT(*) FROM latest_projects').fetchone()[0]==w['unique_projects']
    assert db.execute('SELECT COUNT(*) FROM observations WHERE goal<=0 OR pledged<0 OR backers_count<0 OR deadline<=launched_at').fetchone()[0]==0
latest=pd.read_csv(out/'webrobots_latest.csv')
assert not latest.campaign_id.duplicated().any()
assert len(latest)==w['unique_projects']
p=pd.read_csv(out/'vt_projects.csv',dtype={'Id':str})
h=pd.read_csv(out/'vt_history.csv',dtype={'campaign_id':str})
assert not p.Id.duplicated().any()
assert not h.duplicated(['campaign_id','date']).any()
assert h.campaign_id.isin(p.Id).all()
ret=r['retail']
assert ret['raw_rows']==ret['exact_duplicates']+ret['excluded_invalid_or_non_product_rows']+ret['sales_rows']+ret['returns_rows']
for name,key in [('retail_sales.csv','sales_rows'),('retail_returns.csv','returns_rows')]:
    n=0
    for chunk in pd.read_csv(out/name,chunksize=50000):
        n+=len(chunk)
        assert pd.to_numeric(chunk.price).gt(0).all()
        assert 'Customer ID' not in chunk.columns
        if key=='sales_rows': assert pd.to_numeric(chunk.quantity).gt(0).all()
    assert n==ret[key]
print('PASS: raw manifest unchanged; SQLite integrity; snapshot/project uniqueness; VT joins; retail reconciliation; export row counts.')
print(json.dumps({k:v for k,v in r.items() if k!='webrobots'},ensure_ascii=False))
print(json.dumps({k:v for k,v in w.items() if k!='files'},ensure_ascii=False))
