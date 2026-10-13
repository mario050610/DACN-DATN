# PREORA Database

`schema.sql` là bản **khung PostgreSQL ban đầu** (14 bảng). Docker Compose áp dụng khi database volume mới được tạo.

Cấu trúc nghiệp vụ chính: `users → seller_profiles → products → campaigns → preorder_orders → payments`, cùng `production_requests`, `shipments`, `feature_snapshots`, `forecasts`, `campaign_reviews`, `campaign_updates`, `notifications`.

Lưu ý: đây chưa phải migration chính thức, chưa có dữ liệu seed thực, chưa liên thông frontend/backend. Nhóm Backend nên bổ sung SQLAlchemy + Alembic và tách migration theo phiên bản. Không tự chạy `docker compose down -v` nếu muốn giữ dữ liệu.
