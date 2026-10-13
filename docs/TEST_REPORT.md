# PREORA — Báo cáo kiểm tra khi tạo khung local

Ngày kiểm tra: 13/10/2026.

## Đã xác minh
- 13/13 file `frontend/src` giữ nguyên bytes so với ZIP Figma người dùng cung cấp.
- 8 file `.ts`/`.tsx` parse được bằng TypeScript 5.8.3, không có lỗi cú pháp.
- Backend Python FastAPI: `pytest` 2/2 bài test đạt.
- AI Service Python FastAPI: `pytest` 2/2 bài test đạt; endpoint dự báo chưa có model trả 503 đúng thiết kế.
- Batch script Windows được đóng gói dạng CRLF và rà soát đường dẫn tương đối.
- ZIP chứa một thư mục gốc `PREORA/` với toàn bộ mã nguồn.

## Chưa thể xác minh trong môi trường này
- Chưa cài toàn bộ npm dependencies/build Vite vì npm registry không truy cập được trong môi trường kiểm tra; cần `npm install`, `npm run build` trên máy có Internet.
- Chưa chạy Docker Compose/PostgreSQL thật vì Docker không có sẵn.
- Chưa chạy toàn bộ luồng Customer → Seller → Admin → AI → Manufacturer trên trình duyệt.
- Chưa có authentication/backend/database/ML production.

Đây là **scaffold để phát triển**, không phải backend/AI hoàn chỉnh.
