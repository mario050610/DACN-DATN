# PREORA — Chia việc nhóm 3 người (gợi ý)

- **Frontend:** `frontend/` — UI Figma, responsive, routes, auth state, API client, bỏ hardcode từng phần.
- **Backend + Database:** `backend/`, `database/`, `infra/` — Auth/RBAC, campaign lifecycle, preorder & payments, SQL migrations, API.
- **AI:** `ai-service/`, `ai-service/training/` — data cleaning, feature snapshots, forecasting, success prediction, ML API, model evaluation.

## Quy trình Git

1. Chỉ đẩy code chạy được vào `main`.
2. Mỗi người tạo nhánh `feat/frontend-*`, `feat/backend-*`, `feat/ai-*`.
3. Pull Request có mô tả thay đổi, lệnh test và screenshot nếu thay đổi UI.
4. Thống nhất API contract và mẫu DB trước khi kết nối.
5. Không commit `.env`, dữ liệu riêng tư, `.venv`, `node_modules`, weights quá lớn.
