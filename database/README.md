# PREORA Database

`schema.sql` là schema PostgreSQL phát triển (15 bảng), chưa phải migration chính thức.

Đã có bộ dữ liệu mẫu và script nạp ở [seeds/README.md](seeds/README.md). Chạy `SEED_DATABASE.bat` ở thư mục gốc trên Windows sau khi mở Docker Desktop. Không cần xóa volume.

Frontend hiện vẫn dùng localStorage; backend chưa tích hợp ORM/auth/database. SQL seed và dữ liệu frontend cùng nguồn nhưng chưa tự đồng bộ. Các giới hạn ánh xạ trường và cách tái tạo seed được ghi trong README của seeds.

Xem [toàn bộ thao tác hệ thống](../docs/THAO_TAC_HE_THONG.md).
