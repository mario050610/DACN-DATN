# PREORA — Roadmap triển khai

## Giai đoạn 1: Chạy local và chốt giao diện
- Frontend chạy http://localhost:5173 với mock Figma.
- Backend/AI service health endpoints hoạt động.
- Thống nhất vai trò, entity, schema, API contract.

## Giai đoạn 2: Backend + Database
- Auth và RBAC thật; migrate demo data.
- Products/Campaigns/Approval; Order/Payment/Checkout transaction.
- MOQ lifecycle; Seller dashboard dữ liệu thật.

## Giai đoạn 3: AI
- Chọn dữ liệu có nguồn rõ ràng; xây features ở từng timestamp.
- So sánh baseline vs ML; lưu MAE/RMSE/WAPE, ROC-AUC/F1/Brier.
- Inference API; lưu forecast history; hiển thị đúng uncertainty.

## Giai đoạn 4: Tích hợp và kiểm thử
- Customer checkout → Seller orders → campaign outcome → production requests → delivery.
- Error/loading/permissions, security và privacy.
- Test ở nhiều vai trò, ngày mô phỏng, campaign đạt và không đạt MOQ.
