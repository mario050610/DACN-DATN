"""Aggregate behavior only: no email, IP, or raw customer identity stored."""
import sqlite3
import uuid
from datetime import datetime,timezone
from app.services import training_jobs as jobs


def record(campaign_id,kind,event_id=None):
    try:
        with sqlite3.connect(jobs.directory()/'behavior.sqlite3',timeout=2) as db:
            db.execute('CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL)')
            db.execute('CREATE INDEX IF NOT EXISTS campaign_events ON events(campaign_id,created)')
            cursor=db.execute('INSERT OR IGNORE INTO events VALUES(?,?,?,?)',(event_id or uuid.uuid4().hex,campaign_id,kind,datetime.now(timezone.utc).isoformat()))
            return bool(cursor.rowcount)
    except (sqlite3.Error,OSError):
        return False  # Telemetry must not roll back a successful shopping operation.


def summary(campaign_id,start,end):
    with sqlite3.connect(jobs.directory()/'behavior.sqlite3',timeout=10) as db:
        db.execute('CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL)')
        counts=dict(db.execute('SELECT kind,COUNT(*) FROM events WHERE campaign_id=? AND substr(created,1,10)>=? AND substr(created,1,10)<=? GROUP BY kind',(campaign_id,start,end)).fetchall())
        first=db.execute('SELECT MIN(created) FROM events WHERE campaign_id=?',(campaign_id,)).fetchone()[0]
    return {'views':counts.get('view',0),'clicks':counts.get('click',0),'favorites':counts.get('favorite',0),'addToCart':counts.get('cart',0),
            'source':'observed','recordedSince':first,'partialHistory':True,'note':'Chỉ các sự kiện ghi nhận từ khi bật tracker; không khôi phục lượt tương tác lịch sử.'}
