from fastapi import APIRouter, HTTPException, Request, Response
import httpx
from app.core.config import AI_SERVICE_URL

router = APIRouter(prefix='/ai', tags=['AI Gateway'])

async def forward(endpoint: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f'{AI_SERVICE_URL}{endpoint}', json=payload)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail='AI service chưa chạy hoặc không truy cập được.')
    # Port 8001 has no integrated loader; trained research/job artifacts live separately.
    if response.status_code >= 400:
        try:
            detail = response.json().get('detail', 'AI service trả về lỗi.')
        except ValueError:
            detail = 'AI service trả về lỗi.'
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()

@router.post('/forecast')
async def forecast(payload: dict):
    return await forward('/forecast', payload)

@router.post('/predict-success')
async def predict_success(payload: dict):
    return await forward('/predict-success', payload)


@router.get('/campaigns/{campaign_id}/latest')
def latest_campaign_model(campaign_id: str, request: Request, response: Response):
    from .auth import database,current_user
    from .shopping import CAMPAIGNS
    from app.services import training_jobs
    response.headers['Cache-Control']='no-store'
    with database() as db:
        user=current_user(db,request)
        campaign=CAMPAIGNS.get(campaign_id)
        if user['role']!='admin' and not (user['role']=='seller' and campaign and campaign['sellerId']==user['id']):
            raise HTTPException(403,'Bạn không có quyền xem dự báo chiến dịch này.')
    job=training_jobs.latest_full_campaign(campaign_id)
    if not job:raise HTTPException(404,'Chưa có kết quả full cho chiến dịch này. Quản trị viên cần huấn luyện trước.')
    return {'jobId':job['id'],'created':job['created'],'result':job['result']}
