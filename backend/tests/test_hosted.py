"""Hosted UI must coexist with API routing and retain authentication guards."""
import os
import subprocess
import sys
from pathlib import Path


def test_hosted_same_origin_ui_and_api(tmp_path):
    frontend = tmp_path / 'frontend'
    frontend.mkdir()
    (frontend / 'index.html').write_text('<html>PREORA hosted demo</html>')
    (frontend / 'asset.js').write_text('window.preora=true;')
    script = '''
from fastapi.testclient import TestClient
from app.hosted import app
with TestClient(app, base_url='https://preora-test.onrender.com') as c:
    assert 'PREORA hosted demo' in c.get('/').text
    assert c.get('/asset.js').status_code == 200
    assert c.get('/api/health').json()['status'] == 'ok'
    assert c.get('/api/not-a-real-endpoint').status_code == 404
    assert c.get('/api/account/me').status_code == 401
    payload={'email':'customer@preora.demo','password':'Demo123!'}
    assert c.post('/api/auth/login',json=payload,headers={'Origin':'https://evil.example'}).status_code == 403
    r=c.post('/api/auth/login',json=payload,headers={'Origin':'https://preora-test.onrender.com'})
    assert r.status_code == 200, r.text
    assert 'Secure' in r.headers['set-cookie'] and 'HttpOnly' in r.headers['set-cookie']
    assert c.get('/api/account/me').status_code == 200
'''
    env = {**os.environ, 'FRONTEND_DIST': str(frontend), 'AUTH_DATABASE_PATH': str(tmp_path / 'accounts.sqlite3'),
           'TRAINING_JOBS_DIR': str(tmp_path / 'jobs'), 'AUTH_COOKIE_SECURE': 'true',
           'PUBLIC_ORIGIN': '', 'RENDER_EXTERNAL_URL': 'https://preora-test.onrender.com'}
    # PUBLIC_ORIGIN is deliberately unset so Render's assigned URL is selected.
    env.pop('PUBLIC_ORIGIN')
    subprocess.run([sys.executable, '-c', script], cwd=Path(__file__).resolve().parents[1], env=env, check=True)
