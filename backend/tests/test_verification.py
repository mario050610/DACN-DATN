import base64
from test_training import client,login
PDF=base64.b64encode(b'%PDF-1.4\nTest fixture only\n%%EOF').decode()
def submission():
 return {'companyName':'Example Company','taxId':'1234567890','registrationNumber':'REG-123','representative':'Example Person','address':'123 Test Address','email':'seller@example.test','confirmed':True,'document':{'name':'business.pdf','content':PDF}}

def test_document_submission_and_manual_review(client):
 login(client,'seller');r=client.post('/api/verification/me',json=submission());assert r.status_code==200,r.text
 profile=r.json()['profile'];assert profile['status']=='submitted' and len(profile['document']['sha256'])==64
 doc=profile['document']['id'];assert client.get('/api/verification/documents/'+doc).status_code==200
 login(client,'admin');assert any(s['profile'] for s in client.get('/api/verification/admin').json()['sellers'])
 review={'status':'approved','note':'Compared legal details with independent registry','registryReference':'Registry reference TEST-001','checks':{},'revision':1}
 assert client.post('/api/verification/admin/seller-aurora',json=review).status_code==422
 review['checks']={k:True for k in ['readable','registrationMatches','taxIdMatches','representativeMatches','legalStatusActive']}
 result=client.post('/api/verification/admin/seller-aurora',json=review);assert result.status_code==200,result.text
 assert result.json()['profile']['status']=='approved' and result.json()['profile']['history'][-1]['documentHash']==profile['document']['sha256']

def test_verification_ownership_and_file_validation(client):
 assert client.get('/api/verification/me').status_code==401
 login(client,'seller');data=submission();data['document']['content']=base64.b64encode(b'<script>bad</script>').decode();assert client.post('/api/verification/me',json=data).status_code==422
 data=submission();data['companyName']='   ';assert client.post('/api/verification/me',json=data).status_code==422
 data=submission();data['confirmed']=False;assert client.post('/api/verification/me',json=data).status_code==422
 r=client.post('/api/verification/me',json=submission()).json();doc=r['profile']['document']['id']
 assert client.get('/api/verification/admin').status_code==403
 assert client.post('/api/auth/login',json={'email':'seller.b@preora.demo','password':'Demo123!'}).status_code==200
 assert client.get('/api/verification/documents/'+doc).status_code==404
 assert client.get('/api/verification/me').json()['profile'] is None

def test_resubmission_revision_prevents_stale_review(client):
 login(client,'seller');assert client.post('/api/verification/me',json=submission()).status_code==200
 assert client.post('/api/verification/me',json=submission()).status_code==409
 data=submission();data['revision']=1;assert client.post('/api/verification/me',json=data).status_code==200
 login(client,'admin');assert client.post('/api/verification/admin/seller-aurora',json={'status':'rejected','note':'This is a stale review','revision':1}).status_code==409
