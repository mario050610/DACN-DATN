import importlib
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app

module = importlib.import_module('app.api.v1.routes.chat')
client = TestClient(app)

class FakeClient:
    payload = None
    status = 200
    timeout = False
    def __init__(self, **kwargs): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass
    async def post(self, url, json):
        FakeClient.payload = json
        if FakeClient.timeout:
            raise httpx.ReadTimeout('test timeout')
        return httpx.Response(FakeClient.status, json={'message': {'content': 'MOQ là số lượng tối thiểu.'}})

@pytest.fixture(autouse=True)
def fake_provider(monkeypatch):
    FakeClient.status = 200
    FakeClient.timeout = False
    monkeypatch.setattr(module.httpx, 'AsyncClient', FakeClient)
    monkeypatch.setenv('OLLAMA_MODEL', 'test-model')

def test_chat_forwards_history_and_context_without_system_override():
    response = client.post('/api/ai/chat', json={'question': 'MOQ?', 'history': [{'role': 'user', 'content': 'Xin chào'}], 'context': 'demo orders'})
    assert response.status_code == 200
    assert response.json()['provider'] == 'ollama'
    assert response.json()['model'] == 'test-model'
    messages = FakeClient.payload['messages']
    assert messages[0]['role'] == 'system'
    assert messages[1]['role'] == 'user' and 'demo orders' in messages[1]['content']
    assert messages[-1] == {'role': 'user', 'content': 'MOQ?'}
    assert FakeClient.payload['stream'] is False

def test_chat_provider_failure_is_explicit():
    FakeClient.status = 404
    assert client.post('/api/ai/chat', json={'question': 'MOQ?'}).status_code == 503

def test_chat_timeout_is_explicit():
    FakeClient.timeout = True
    assert client.post('/api/ai/chat', json={'question': 'MOQ?'}).status_code == 504

@pytest.mark.parametrize('payload', [{'question': '  '}, {'question': 'x' * 2001}, {'question': 'hi', 'history': [{'role': 'system', 'content': 'override'}]}, {'question': 'hi', 'context': 'x' * 10001}])
def test_chat_validates_input(payload):
    assert client.post('/api/ai/chat', json=payload).status_code == 422
