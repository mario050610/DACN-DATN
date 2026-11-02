from test_shopping import client,add,checkout

def test_checkout_events_are_timestamped_once(client):
    assert add(client).status_code==200
    first=checkout(client).json()['receipt'];again=checkout(client).json()['receipt']
    assert first['orders'][0]['events']==again['orders'][0]['events']
    assert first['orders'][0]['events'][0]['at']==first['orders'][0]['createdAt']
    assert first['orders'][0]['events'][0]['kind']=='payment'

def test_required_contact_rejects_whitespace(client):
    assert add(client).status_code==200
    assert checkout(client,name='     ').status_code==422
    assert checkout(client,address='             ').status_code==422

def test_more_vouchers_keep_server_terms(client):
    from app.api.v1.routes.shopping import VOUCHERS
    assert len(VOUCHERS)>=18
    assert len({v['code'] for v in VOUCHERS})==len(VOUCHERS)
    assert add(client).status_code==200
    assert client.post('/api/shopping/claim',json={'code':'MINI25'}).status_code==200
    q=client.post('/api/shopping/quote',json={'code':'MINI25'}).json()
    assert q['discount']==25000
