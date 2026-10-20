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

## Offline training

Du lieu thuc te da tai duoc xu ly bang `training/train.py`; xem [huong dan train va gioi han](training/README.md). Double-click `TRAIN_AI.bat` o thu muc PREORA de train lai. Artifact nam trong `model_artifacts/research/`. Cac model nay chua duoc noi vao API vi target retail/crowdfunding khac target pre-order/MOQ.


## Full campaign forecasting theo sơ đồ

Trang quản trị train trực tiếp nhu cầu cuối kỳ, classifier đạt MOQ có sigmoid calibration, và quy tắc khoảng sản xuất có ràng buộc. Dùng đủ 16 feature; hỗ trợ CSV lịch sử do admin cung cấp và demo mô phỏng có nhãn rõ ràng. Kết quả được chia sẻ có phân quyền sang hai trang AI của seller qua backend. Xem [hướng dẫn đầy đủ](../docs/HUAN_LUYEN_AI_TREN_WEB.md).

`training/full_campaign.py` là engine model; `training/ui_worker.py` chạy job trong virtualenv ML. Những endpoint scaffold `/forecast`, `/predict-success` của AI service không tự động dùng các job này; luồng website đầy đủ sử dụng API admin training và `/api/ai/campaigns/{id}/latest` trên backend.
