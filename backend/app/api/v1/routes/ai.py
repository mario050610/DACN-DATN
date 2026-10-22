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
        if user['role']!='admin':
            if user['role']!='seller':raise HTTPException(403,'Campaign access denied.')
            from .seller_training import owns_campaign
            owns_campaign(user['id'],campaign_id)
    job=training_jobs.latest_full_campaign(campaign_id)
    role_label='Quản trị viên' if user['role']=='admin' else 'Người bán'
    if not job:raise HTTPException(404,f"Chưa có kết quả dự báo đầy đủ cho chiến dịch này. {role_label} cần huấn luyện trước.")
    return {'jobId':job['id'],'created':job['created'],'result':job['result']}
