from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title='PREORA AI Service', version='0.1.0', description='Reserved independent HTTP inference service. Research artifacts and web training exist in separate pipelines; this service has no integrated model loader. Web training runs through backend jobs and a Python worker, not port 8001.')

class ForecastRequest(BaseModel):
    campaignId: str
    productCategory: str = 'Chưa xác định'
    currentOrders: int = Field(ge=0)
    moq: int = Field(gt=0)
    target: int = Field(gt=0)
    startDate: str
    endDate: str
    currentDate: str
    elapsedDays: int = Field(ge=0)
    daysRemaining: int = Field(ge=0)
    dailyOrderQuantities: list[dict] = Field(default_factory=list)

@app.get('/health')
def health():
    return {'service': 'preora-ai', 'status': 'ok', 'model_status': 'not_loaded'}

@app.post('/forecast')
def forecast(_: ForecastRequest):
    # TODO: load trained artifacts with versioning and validate feature schema.
    raise HTTPException(status_code=503, detail='Endpoint HTTP này chưa tích hợp model loader. Huấn luyện và kết quả chiến dịch đang chạy qua backend training jobs, độc lập với service 8001.')

@app.post('/predict-success')
def predict_success(_: ForecastRequest):
    raise HTTPException(status_code=503, detail='Endpoint HTTP này chưa tích hợp model loader cho success prediction. Xem kết quả full đã lưu qua backend training jobs.')
