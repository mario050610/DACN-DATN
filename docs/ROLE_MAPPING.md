# PREORA — Vai trò thiết kế và prototype

Đối chiếu code ngày 19/10/2026. **Vai trò nghiệp vụ trong H1/H8/H11/H13/H16/H17 không đồng nghĩa mỗi vai trò đã có tài khoản và portal độc lập.**

| Vai trò thiết kế | Quyền prototype | Mức hiện thực / giới hạn |
|---|---|---|
| Customer | `customer` | Backend kiểm tra customer cho shopping theo tài khoản; auth và shopping dùng SQLite; thanh toán mô phỏng |
| Seller | `seller` | Xem kết quả full mới nhất chỉ khi sở hữu campaign theo catalogue server; nhiều thao tác quản lý campaign/product vẫn là prototype trong localStorage |
| Business Administrator | `admin` dùng chung | Các màn quản trị nghiệp vụ thuộc prototype; không khẳng định mọi chính sách/tranh chấp có API riêng |
| AI/Data Operator | `admin` dùng chung | Backend chặn mọi role khác ở training, upload dataset, logs/job và analytics; không có role `ai_operator` độc lập |
| IT Administrator | `admin` dùng chung | Có tra cứu tài khoản admin và bảo mật tài khoản; sơ đồ logging/hạ tầng/backup/RBAC chi tiết là mục tiêu, không có đủ chức năng production |
| Manufacturing Partner (prototype) | `partner` | Tài khoản/màn mẫu đối tác; chưa đồng bộ đầy đủ với năm vai trò trong thiết kế báo cáo. Cần nêu là vai trò mở rộng hoặc đưa nghiệp vụ sản xuất về trách nhiệm Seller khi thuyết minh |

## Các ranh giới thực thi ở server

- `/api/admin/ai-training`, dataset, history/logs và `/api/analytics/campaigns/{id}`: chỉ `admin`.
- `/api/ai/campaigns/{id}/latest`: `admin` hoặc `seller` sở hữu campaign trong catalogue server. Seller không được xem campaign của seller khác.
- `/api/shopping/*`: các mutation mua sắm yêu cầu customer; dữ liệu tài khoản lấy từ session phía server.
- `/api/admin/users`: chỉ admin tra cứu. Không coi mọi nút phân quyền trên UI là đã có RBAC backend tương ứng.
- View/click telemetry nhận event theo campaign; không phải endpoint thống kê hay endpoint cấp quyền truy cập dự báo.
- Gateway `/api/ai/forecast`, `/predict-success` là endpoint proxy dự phòng, hiện service trả 503; chưa phải cơ chế inference có ownership hoàn chỉnh. Không bật model serving thật trước khi kiểm tra contract và quyền.

## Cách ghi trong báo cáo và sơ đồ

Giữ Business Admin, AI/Data Operator và IT Admin là ba trách nhiệm thiết kế. Thêm chú thích: “Trong prototype, ba trách nhiệm này dùng chung role admin; tách quyền chi tiết thuộc giai đoạn tiếp theo”. Đây là mô tả hiện trạng, không phải tuyên bố đã triển khai phân tách nhiệm vụ.

Khi mở rộng, thiết kế permission theo thao tác (dataset upload, train, xem log, promote model, quản trị tài khoản), rồi bảo vệ endpoint và kiểm thử quyền; không chỉ tách menu hoặc thêm tên role trên frontend.
