import importlib.util
from pathlib import Path
import sqlite3
import pandas as pd

spec=importlib.util.spec_from_file_location('clean_data',Path(__file__).with_name('clean_data.py'))
clean=importlib.util.module_from_spec(spec); spec.loader.exec_module(clean)

def test_webrobots_preserves_snapshots_and_excludes_invalid(tmp_path,monkeypatch):
    raw=tmp_path/'raw'; out=tmp_path/'out'; out.mkdir()
    monkeypatch.setattr(clean,'RAW',raw); monkeypatch.setattr(clean,'OUT',out)
    row=dict(id=1,launched_at=1600000000,deadline=1601000000,goal=100,pledged=50,backers_count=2,currency='usd',country='us',category='{"slug":"games"}',state='live')
    for snap,rows in [('Kickstarter_2025-01-01T00_00_00_000Z',[row,row,dict(row,id=2,goal=-1),dict(row,id=3,backers_count=1.5)]),('Kickstarter_2025-02-01T00_00_00_000Z',[dict(row,pledged=200,state='successful')])]:
        folder=raw/'webrobots'/snap; folder.mkdir(parents=True)
        pd.DataFrame(rows).to_csv(folder/'a.csv',index=False)
    report=clean.webrobots()
    assert report['raw_rows']==5
    assert report['clean_observations']==2
    assert report['invalid_rows']==2
    assert report['duplicate_snapshot_project_rows']==1
    assert report['unique_projects']==1
    latest=pd.read_csv(out/'webrobots_latest.csv')
    assert latest.iloc[0].pledged==200 and latest.iloc[0].currency=='USD'
    assert latest.iloc[0].source_row==2
    with sqlite3.connect(out/'webrobots.sqlite3') as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert len(pd.read_csv(out/'webrobots_completed.csv'))==1
