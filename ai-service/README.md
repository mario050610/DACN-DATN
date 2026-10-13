# PREORA AI Service

Môi trường Python dành riêng cho AI (không trộn thư viện ML nặng vào backend).

```powershell
cd ai-service
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001
```

- http://127.0.0.1:8001/docs
- http://127.0.0.1:8001/health

**Lưu ý:** `/forecast` và `/predict-success` trả HTTP 503 cho đến khi nhóm huấn luyện, lưu model và tích hợp inference thực. **Không trả số ngẫu nhiên với nhãn AI thật.**

Đề xuất quy trình: data collection → cleaning → feature snapshots → train/validation/test chia theo chiến dịch/thời gian → model artifacts + version → FastAPI inference → evaluation (MAE, RMSE, WAPE; F1, ROC-AUC, Brier).
