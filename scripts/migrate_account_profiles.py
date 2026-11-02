"""Add profile columns safely; never reset, replace or reseed a database."""
import argparse,os,sqlite3,sys,uuid
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from dotenv import load_dotenv
from app.services.account_profiles import migrate
load_dotenv(ROOT/'.env',override=False)
def main():
 parser=argparse.ArgumentParser(description='Back up and apply additive PREORA account profile migration.')
 parser.add_argument('--database',default=os.getenv('AUTH_DATABASE_PATH',str(ROOT/'backend/data/accounts.sqlite3')))
 args=parser.parse_args();path=Path(args.database).resolve()
 if not path.is_file():raise SystemExit('Database does not exist. Start PREORA once, or pass --database with an existing file.')
 backup=path.with_name(path.stem+'.before-profiles-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:6]+path.suffix)
 with sqlite3.connect(path,timeout=30) as db:
  if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='accounts'").fetchone():raise SystemExit('Missing accounts table; refusing to modify this file.')
  with sqlite3.connect(backup) as copy:db.backup(copy)
  db.execute('PRAGMA foreign_keys=ON')
  with db:migrate(db)
 print('Additive migration completed. Backup:',backup)
if __name__=='__main__':main()
