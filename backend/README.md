# PREORA Backend (FastAPI starter)

Yêu cầu Python 3.11+.

Windows PowerShell:

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Nếu PowerShell không cho kích hoạt venv, dùng `.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000`.

Truy cập:
- http://127.0.0.1:8000/docs (Swagger)
- http://127.0.0.1:8000/api/health

**Chưa có** API tạo user/campaign/preorder, chưa kết nối SQLAlchemy/PostgreSQL thực tế; đây là các module nhóm Backend cần hiện thực. AI Gateway có `/api/ai/forecast`, `/api/ai/predict-success`; khi AI chưa train sẽ trả 503 rõ ràng (Frontend Figma vẫn chạy dự báo demo độc lập).

Test: `python -m pytest tests -q`.
