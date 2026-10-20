"""Persistent training jobs shared by the web backend and its isolated ML worker."""
import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

def directory():
    path = Path(os.getenv('TRAINING_JOBS_DIR', str(ROOT / 'tmp/ai-training')))
    path.mkdir(parents=True, exist_ok=True)
    return path

@contextmanager
def database():
    with sqlite3.connect(directory() / 'jobs.sqlite3', timeout=15) as db:
        db.row_factory = sqlite3.Row
        db.execute('CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,status TEXT NOT NULL,stage TEXT NOT NULL,progress INTEGER NOT NULL,created REAL NOT NULL,updated REAL NOT NULL,request TEXT NOT NULL,result TEXT,error TEXT,pid INTEGER)')
        db.execute('CREATE TABLE IF NOT EXISTS job_events(id INTEGER PRIMARY KEY AUTOINCREMENT,job_id TEXT NOT NULL,created REAL NOT NULL,stage TEXT NOT NULL,progress INTEGER NOT NULL,status TEXT NOT NULL)')
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS one_active ON jobs((1)) WHERE status IN ('queued','running')")
        # Workers heartbeat even while fitting/reading Excel. Interrupted jobs must not block forever.
        db.execute("UPDATE jobs SET status='failed',error='Tiến trình huấn luyện đã ngắt hoặc không phản hồi. Hãy chạy lại.',stage='Đã gián đoạn' WHERE status IN ('queued','running') AND updated < ?", (time.time()-180,))
        yield db


def serialize(row):
    if row is None: return None
    item = dict(row)
    item['request'] = json.loads(item['request'])
    item['result'] = json.loads(item['result']) if item['result'] else None
    item.pop('pid', None)
    return item


def create(payload):
    job_id = uuid.uuid4().hex
    with database() as db:
        now = time.time()
        db.execute('INSERT INTO jobs(id,status,stage,progress,created,updated,request) VALUES(?,?,?,?,?,?,?)',
                   (job_id,'queued','Đang chờ khởi động',0,now,now,json.dumps(payload,ensure_ascii=False)))
        db.execute('INSERT INTO job_events(job_id,created,stage,progress,status) VALUES(?,?,?,?,?)',(job_id,now,'Đang chờ khởi động',0,'queued'))
    (directory()/job_id).mkdir(exist_ok=True)
    return job_id


def get(job_id):
    with database() as db:
        item=serialize(db.execute('SELECT * FROM jobs WHERE id=?',(job_id,)).fetchone())
        if item is not None:item['events']=[dict(row) for row in db.execute('SELECT created,stage,progress,status FROM job_events WHERE job_id=? ORDER BY id',(job_id,))]
        return item


def recent():
    with database() as db:
        return [serialize(row) for row in db.execute('SELECT * FROM jobs ORDER BY created DESC LIMIT 20')]


def update(job_id, **values):
    allowed = {'status','stage','progress','result','error','pid'}
    if not values or not set(values).issubset(allowed): raise ValueError('Invalid job update')
    if 'result' in values: values['result']=json.dumps(values['result'],ensure_ascii=False,allow_nan=False)
    values['updated']=time.time()
    with database() as db:
        previous=db.execute('SELECT stage,progress,status FROM jobs WHERE id=?',(job_id,)).fetchone()
        db.execute('UPDATE jobs SET '+','.join(f'{key}=?' for key in values)+' WHERE id=?',(*values.values(),job_id))
        if previous and any(key in values and values[key]!=previous[key] for key in ('stage','progress','status')):
            current=db.execute('SELECT stage,progress,status FROM jobs WHERE id=?',(job_id,)).fetchone()
            db.execute('INSERT INTO job_events(job_id,created,stage,progress,status) VALUES(?,?,?,?,?)',(job_id,values['updated'],current['stage'],current['progress'],current['status']))


def heartbeat(job_id):
    with database() as db:
        db.execute("UPDATE jobs SET updated=? WHERE id=? AND status IN ('queued','running')",(time.time(),job_id))


def latest_full_campaign(campaign_id):
    with database() as db:
        row=db.execute("SELECT * FROM jobs WHERE status='succeeded' AND json_extract(request,'$.campaignId')=? AND json_extract(result,'$.modelType')='campaign_full' ORDER BY created DESC LIMIT 1",(campaign_id,)).fetchone()
        return serialize(row)
