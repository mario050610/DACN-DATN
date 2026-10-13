# Infra

Docker Compose tại thư mục gốc (`docker-compose.yml`) chạy PostgreSQL, FastAPI backend và AI service. Frontend vẫn được phát triển bằng npm để hot reload tiện nhất.

```powershell
Copy-Item .env.example .env
 docker compose up -d --build
```

Lần đầu init PostgreSQL từ `database/schema.sql`; nếu đã tồn tại volume, việc sửa `schema.sql` **không tự chạy lại**. Dùng migrations khi phát triển thực tế. Không chạy `docker compose down -v` khi có dữ liệu cần giữ.
