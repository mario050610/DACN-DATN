# Chạy PREORA trên Windows bằng VS Code

## Yêu cầu
- Node.js 22.12+ (npm)
- Python 3.11+
- VS Code
- Docker Desktop chỉ cần khi dùng PostgreSQL/Docker (không bắt buộc chạy giao diện).

## Cách 1 — Nhanh nhất, chỉ Frontend

Giải nén ZIP. Mở `PREORA/` trong VS Code, hoặc mở `PREORA.code-workspace`.

Double click `START_PREORA.bat` tại thư mục gốc, đợi npm install (lần đầu cần Internet). Web: **http://localhost:5173**.

Hoặc VS Code Terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Cách 2 — Chạy Frontend + Backend + AI mock shell

Double click `START_ALL_SERVICES.bat` để mở ba cửa sổ lệnh. Các service:

- Frontend: http://localhost:5173
- Backend docs: http://127.0.0.1:8000/docs
- AI docs: http://127.0.0.1:8001/docs

Backend/AI lần đầu sẽ cài packages Python; cần Internet. **Không có trained AI**, prediction endpoint trả 503.

## Cách 3 — Docker Compose cho PostgreSQL/Backend/AI

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Sau đó chạy frontend từ terminal như Cách 1. PostgreSQL host port **5433**. Docker tạo 14 bảng từ `database/schema.sql` khi khởi tạo volume lần đầu. Backend chưa ghi đọc DB.

## Nếu không mở được web

- Chạy `node -v` (>=22.12) và `npm -v`.
- Đảm bảo đang ở thư mục `frontend` khi gõ `npm run dev`.
- Kiểm tra port 5173 đã được app khác sử dụng chưa.
- Nếu `npm install` lỗi mạng, kiểm tra Internet/proxy.
- Nếu lỗi hình sản phẩm/font, cần mạng vì nguồn Unsplash/Google Fonts.
- Không double click `frontend/index.html`: React cần dev server.
