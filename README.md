# PREORA — AI-Integrated Pre-order E-commerce

Prototype thương mại điện tử cho sản phẩm đặt trước khi sản xuất. Phạm vi báo cáo hiện tại: **Design – Data preparation – Technologies**. Hiện trạng đối chiếu ngày 19/10/2026.

## Chạy trên Windows

- `START_PREORA_WITH_AI.bat`: khởi động Docker/PostgreSQL, Ollama, HTTP AI service, backend và frontend; mở trình duyệt. Xem [launcher](docs/KHOI_DONG_WINDOWS.md).
- `START_PREORA.bat`: frontend và backend cho prototype. Xem [thiết lập Windows](docs/SETUP_WINDOWS.md).
- Frontend yêu cầu Node.js 22.12+. Backend/worker dùng Python virtualenv của từng thư mục.

| Thành phần | URL | Hiện trạng |
|---|---|---|
| Frontend | http://localhost:5173 | React/TypeScript/Vite/Tailwind, dữ liệu campaign/product prototype |
| Backend | http://127.0.0.1:8000/docs | Auth, shopping mô phỏng, analytics, train jobs, saved results, AI gateways |
| HTTP AI service | http://127.0.0.1:8001/docs | Endpoint dự phòng; loader chưa tích hợp, inference trả 503 |
| PostgreSQL | localhost:5433 | Docker/schema mục tiêu; chưa là DB thống nhất của prototype |

## Những phần đang chạy

- Auth/session/2FA và shopping theo tài khoản lưu SQLite; checkout mô phỏng, chưa thu tiền thật.
- Campaign/product/vòng đời vẫn có dữ liệu mẫu hoặc nhập trên `DemoStore`/localStorage; catalogue shopping phía server là JSON.
- Tracker lưu các sự kiện quan sát từ khi bật theo dõi, không có đủ toàn bộ lịch sử.
- Admin → **Huấn luyện AI**: backend khởi chạy worker, lưu model/kết quả/log theo job; seller sở hữu đọc kết quả full đã hoàn tất.
- Ba mô hình nghiên cứu UCI/Virginia Tech/Web Robots đã có pipeline và artifact. Không tự thay mô hình từng phiên web hoặc endpoint HTTP 8001.
- Chatbot qua Ollama là luồng hỏi đáp riêng, không tạo số liệu thay demand model.

## Kiến trúc và phạm vi

![Kiến trúc prototype](docs/diagrams/PREORA_CURRENT_ARCHITECTURE.svg)

- [Kiến trúc hiện trạng và thiết kế mục tiêu](docs/ARCHITECTURE.md) · [Sơ đồ draw.io chỉnh sửa được](docs/diagrams/PREORA_CURRENT_ARCHITECTURE.drawio)
- [Ánh xạ nguồn dữ liệu và 16 feature](docs/DATA_PROVENANCE.md)
- [Vai trò thiết kế và quyền prototype](docs/ROLE_MAPPING.md)
- [API hiện tại và hợp đồng dự kiến](docs/API_CONTRACT.md)

Business Admin, AI/Data Operator và IT Admin hiện gộp trong role `admin`; sơ đồ tách các trách nhiệm này là thiết kế mục tiêu. Payment/notification production, persistence PostgreSQL thống nhất và inference service có loader cần được tích hợp riêng.

## Dữ liệu và huấn luyện

- `CLEAN_AI_DATA.bat`: làm sạch raw, giữ file gốc; [quy tắc và lịch ngày](docs/LAM_SACH_DU_LIEU_AI.md).
- Train lại bộ nghiên cứu đã sạch:
  `ai-service\.venv\Scripts\python.exe -u -X utf8 ai-service/training/train.py --dataset all --cleaned`
- `TRAIN_AI.bat`: cài dependencies nếu cần và chạy offline; thêm `--cleaned` để dùng bản sạch. [Pipeline và đánh giá](ai-service/training/README.md).
- [Huấn luyện trên web](docs/HUAN_LUYEN_AI_TREN_WEB.md): demo mô phỏng, CSV lịch sử admin cung cấp hoặc thực nghiệm UCI. Dự báo từ ngày đầu, lịch sử tối đa 28 ngày gần nhất.

Kickstarter funding/backers không phải số lượng sản phẩm hoặc MOQ. UCI là bán lẻ, không phải campaign cuối kỳ. Dữ liệu mô phỏng và metric demo không chứng minh độ chính xác trên PREORA thực tế.

## Tài khoản demo

Email: `customer@preora.demo`, `seller@preora.demo`, `seller.b@preora.demo`, `admin@preora.demo`, `partner@preora.demo`. Mật khẩu mẫu chung `Demo123!`; chỉ dùng môi trường demo local. Auth backend SQLite; giới hạn quyền xem [bảng vai trò](docs/ROLE_MAPPING.md).

## Cấu trúc và tài liệu

- `frontend/`: React UI; `backend/`: FastAPI và các module prototype.
- `ai-service/app/`: HTTP inference dự phòng; `ai-service/training/`: worker/full models/offline research.
- `database/`: schema/seeds; `docs/`: thiết kế và hướng dẫn; `scripts/`: launcher.
- [Luồng thao tác theo vai trò](docs/THAO_TAC_HE_THONG.md)
- [Tài khoản và danh mục](docs/TAI_KHOAN_VA_DANH_MUC.md)
- [Giỏ hàng và ưu đãi](docs/GIO_HANG_VA_UU_DAI.md)
- [Nguồn ảnh sản phẩm](docs/PRODUCT_IMAGE_SOURCES.md)
- [Hỗ trợ AI](docs/HO_TRO_AI.md)
- [Dữ liệu mẫu PostgreSQL](database/seeds/README.md)
- [Quy trình nhóm](docs/TEAM_WORKFLOW.md)
