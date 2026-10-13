from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
PAYLOAD = {'campaignId': 'CD-2408', 'currentOrders': 100, 'moq': 200, 'target': 300, 'startDate': '2026-10-01', 'endDate': '2026-11-01', 'currentDate': '2026-10-13', 'elapsedDays': 12, 'daysRemaining': 19}

def test_health():
    result = client.get('/health')
    assert result.status_code == 200
    assert result.json()['model_status'] == 'not_loaded'

def test_no_fake_ml_prediction():
    result = client.post('/forecast', json=PAYLOAD)
    assert result.status_code == 503
