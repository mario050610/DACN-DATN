import pytest
from test_training import client,login,payload
from app.services import training_jobs as jobs

@pytest.mark.parametrize('algorithm',['hist_gradient_boosting','random_forest','extra_trees'])
def test_training_preserves_selected_model(client,algorithm):
    login(client)
    data=payload();data['modelAlgorithm']=algorithm;data['mode']='campaign_demo'
    response=client.post('/api/admin/ai-training',json=data)
    assert response.status_code==202,response.text
    assert response.json()['request']['modelAlgorithm']==algorithm
    assert jobs.get(response.json()['id'])['request']['modelAlgorithm']==algorithm

def test_unknown_model_is_rejected(client):
    login(client);data=payload();data['modelAlgorithm']='arbitrary-module'
    assert client.post('/api/admin/ai-training',json=data).status_code==422
    assert jobs.recent()==[]
