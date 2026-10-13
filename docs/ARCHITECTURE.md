# PREORA — Kiến trúc triển khai mục tiêu

```text
Browser (React/Vite:5173)
   |
   | /api (Vite dev proxy)
   v
FastAPI Backend (:8000) <----> PostgreSQL (:5433 exposed host; :5432 in Docker)
   |
   | HTTP internal (AI Gateway)
   v
Python AI Service (:8001)
   |
   v
Trained forecasting/classifier artifacts (CHƯA CÓ)
```

Vai trò: Customer, Seller, Business Admin, Manufacturing Partner. `AI Service` và `Payment Gateway` là thành phần hệ thống, không phải tài khoản đăng nhập của người dùng.

## Hiện trạng

- Frontend đang dùng `DemoStore` (localStorage); chưa gọi Backend cho dữ liệu nghiệp vụ.
- Backend FastAPI mới có health route + AI proxy.
- PostgreSQL có schema khởi tạo trong `database/schema.sql`; chưa nối ORM/migrations.
- AI Service chỉ có endpoints, chưa có mô hình trained.

## Nguyên tắc

1. Backend xác thực, phân quyền, kiểm tra ownership của Seller và transaction khi checkout.
2. `Campaign` và `Order` có state machine riêng; đặt trước chỉ hợp lệ khi campaign hoạt động, trong thời gian cho phép.
3. MOQ tính từ tổng số lượng đặt trước hợp lệ, không phải số giao dịch.
4. AI chỉ tư vấn; không tự duyệt chiến dịch/sản xuất.
5. Forecast lưu `campaign_id`, snapshot đặc trưng, version và thời gian chạy; không rò rỉ dữ liệu tương lai.
6. Tách DemoProvider và RealApiProvider khi thay localStorage.
