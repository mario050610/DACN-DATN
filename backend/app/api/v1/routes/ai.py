from fastapi import APIRouter, HTTPException
import httpx
from app.core.config import AI_SERVICE_URL

router = APIRouter(prefix='/ai', tags=['AI Gateway'])

async def forward(endpoint: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f'{AI_SERVICE_URL}{endpoint}', json=payload)
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail='AI service chưa chạy hoặc không truy cập được.')
    # The AI service deliberately returns 503 when there is no trained model.
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
