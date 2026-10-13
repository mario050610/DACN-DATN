from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title='PREORA AI Service', version='0.1.0', description='Model inference API starter. No trained model is bundled.')

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
    raise HTTPException(status_code=503, detail='Chưa tích hợp mô hình Demand Forecasting đã huấn luyện. Frontend vẫn dùng chế độ DEMO.')

@app.post('/predict-success')
def predict_success(_: ForecastRequest):
    raise HTTPException(status_code=503, detail='Chưa tích hợp mô hình Campaign Success Prediction đã huấn luyện.')
