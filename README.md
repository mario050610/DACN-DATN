# PREORA — AI-Integrated Pre-order E-commerce

**Monorepo khung chung** theo dạng dự án trước của nhóm, đã gắn **toàn bộ frontend được xuất từ Figma Make** và sẵn cấu trúc để hiện thực hệ thống trên máy local.

## Chạy giao diện ngay

**Windows:** double click `START_PREORA.bat`, đợi cài npm packages lần đầu, mở **http://localhost:5173**.

Hoặc trong VS Code:

```powershell
cd frontend
npm install
npm run dev
```

Yêu cầu Node.js **22.12+**. Frontend chạy demo **không cần bật** backend, Python, Docker hoặc Database.

## Khung thư mục

```text
PREORA/
├── frontend/                 React 19 + TS + Vite, nguyên UI Figma
│   ├── src/
│   ├── package.json
│   └── vite.config.ts        localhost:5173, proxy /api -> 8000
├── backend/                  FastAPI skeleton, /api/health, AI gateway
│   ├── app/
│   │   ├── api/v1/routes/
│   │   ├── core/ db/ models/ repositories/ schemas/ services/
│   │   └── main.py
│   ├── tests/ requirements.txt Dockerfile
├── ai-service/               FastAPI AI starter, chưa có trained model
│   ├── app/ training/ notebooks/ model_artifacts/
│   └── requirements.txt
├── database/                 PostgreSQL schema mẫu và seeds/
├── docs/                     Kiến trúc, hợp đồng API, hướng dẫn và roadmap
├── infra/                    Tài liệu hạ tầng
├── scripts/                  Batch files chạy dịch vụ Windows
├── shared/                   Giao ước dữ liệu chung
├── tests/                    Test liên kết (để phát triển sau)
├── docker-compose.yml        PostgreSQL + backend + AI (tùy chọn)
├── PREORA.code-workspace     Mở workspace trong VS Code
├── START_PREORA.bat          Chạy frontend ngay
└── START_ALL_SERVICES.bat    Bật Frontend, Backend, AI skeleton
```

## Các URL khi chạy

| Thành phần | URL | Trạng thái |
|---|---|---|
| Frontend | http://localhost:5173 | Demo Figma hoạt động độc lập |
| Backend Swagger | http://127.0.0.1:8000/docs | API khung |
| Backend Health | http://127.0.0.1:8000/api/health | Hoạt động khi chạy Backend |
| AI Swagger | http://127.0.0.1:8001/docs | AI khung, chưa có mô hình |
| PostgreSQL | localhost:5433 | Cần Docker Compose |

## Demo account hiện tại

Tài khoản lưu trong `frontend/src/DemoStore.tsx`, demo auth **không phải xác thực an toàn production**:

- Customer: `customer@preora.demo`
- Seller: `seller@preora.demo`
- Seller B: `seller.b@preora.demo`
- Admin: `admin@preora.demo`
- Manufacturing: `partner@preora.demo`
- Mật khẩu demo chung: `Demo123!`

## Cần hiện thực tiếp

- **Frontend:** chuyển `DemoStore`/localStorage sang API thật, nâng chất lượng phân quyền.
- **Backend:** CRUD nghiệp vụ và ORM, auth/RBAC, xử lý checkout/transaction, migration.
- **AI:** data processing, train + đánh giá model, ML inference endpoints.
- **Database:** `schema.sql` là khởi đầu tham khảo, cần Alembic migrations và rà soát với ERD Chương 5.3.5.

Hệ thống **chưa** có thanh toán thật hoặc model AI đã train; không được mô tả demo forecast như số liệu model thực.

Chi tiết: [docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md).
