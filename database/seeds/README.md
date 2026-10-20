# Dữ liệu mẫu PREORA

Bộ mẫu hoàn toàn mô phỏng, không dùng làm bằng chứng hiệu quả AI hoặc giao dịch thật.

## Thành phần (sampleRevision 9)

- 114 tài khoản/hồ sơ; 310 sản phẩm và 310 chiến dịch, trong đó 300 đang hoạt động ở thời điểm export.
- Lịch sử theo ngày đầy đủ trong khoảng đã chạy, số lượng khác nhau theo campaign/ngày. Tổng lịch sử khớp currentOrders và tổng đơn.
- 3.841 đơn và payment ở bản export ngày 20/10/2026; 1 lệnh sản xuất. Số dòng có thể thay đổi khi export vào ngày khác.
- `sample_data.json`: ảnh chụp fixture frontend; `001_sample_data.sql`: cùng dữ liệu cho database demo PostgreSQL; `sample_id_map.json`: ánh xạ UUID.
- Đơn theo lô tối đa 99 sản phẩm để không làm đầy lưu trữ prototype; customer-demo vẫn có 5 đơn của 5 sản phẩm khác nhau.
- Các chiến dịch mẫu có thể tự tăng theo ngày ở trình duyệt. Backend catalogue/SQL là ảnh chụp export, không tự chạy đồng hồ mô phỏng trên server.
- SQL dùng cho môi trường demo trống; đây không phải migration cập nhật database đã nạp phiên bản cũ. Không tự xóa hoặc ghi đè dữ liệu đã có.

Các số lượng này hoàn toàn mô phỏng, không phải hành vi thị trường thật hay nhãn PREORA dùng để chứng minh chất lượng AI. Chi tiết [cơ chế mô phỏng](../../docs/MO_PHONG_DON_HANG.md).

## Xem trên frontend

Chạy `START_PREORA.bat` trên Windows hoặc frontend bằng npm trong môi trường bạn đã cài Node.
Đăng nhập tại `http://localhost:5173/#login`. Năm tài khoản đăng nhập demo có mật khẩu `Demo123!`:

| Email | Vai trò |
|---|---|
| customer@preora.demo | Khách hàng |
| seller@preora.demo | Aurora Lab |
| seller.b@preora.demo | Auralis Studio |
| admin@preora.demo | Admin |
| partner@preora.demo | Đối tác |

Các hồ sơ seller khác chỉ để có đủ quan hệ dữ liệu, không được thêm vào cơ chế đăng nhập frontend hardcode.
Khi mở phiên bản mới, fixture được nâng lên revision 9; giữ ID sản phẩm/campaign, sản phẩm/campaign tự tạo và các đơn người dùng. Đơn mẫu cũ được thay bằng lịch sử mẫu mới. Không cần Reset demo; thao tác Reset vẫn xóa thay đổi prototype của trình duyệt đó. Giữ cùng địa chỉ `localhost:5173` khi chuyển vai trò; `127.0.0.1` có vùng lưu trữ riêng.

## Nạp PostgreSQL trên Windows

Mở Docker Desktop, chọn Linux containers, rồi tại thư mục gốc PREORA chạy PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\SEED_DATABASE.ps1
```

Hoặc nhấp đúp `SEED_DATABASE.bat`. Script chỉ khởi động dịch vụ db, áp dụng schema và import seed; không xóa volume. Dùng user/database từ cấu hình container, không hardcode tên vào lệnh psql.

Trong WSL có thể gọi launcher Windows từ thư mục repo:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:\PREORA-Monorepo-Starter\PREORA\scripts\SEED_DATABASE.ps1'
```

Seed chạy trong transaction có advisory lock. Lần nạp thành công ghi marker `sample_seed_v7` vào notifications; chạy lại sẽ bỏ qua toàn bộ seed và giữ các thay đổi. Nếu có email/UUID trùng trước lần seed đầu tiên, seed sẽ báo lỗi và rollback thay vì ghi đè dữ liệu. Không xóa marker để cố seed lại trên database đang sử dụng.

`partner` của UI ánh xạ thành `manufacturer` trong bảng users. Các cột status hiện cho phép TEXT nên seed giữ nhãn tiếng Việt của UI; backend cần chốt enum/mapping trước khi triển khai. `products` chưa có cột ảnh/trạng thái sản phẩm, campaigns chưa có mô tả/lý do từ chối: các trường này được giữ trong JSON, chưa thể lưu nguyên vẹn vào schema hiện tại. Không tự thêm cột hay thay đổi schema trong đợt này.

**Frontend hiện vẫn đọc localStorage, backend chưa nối database.** Import SQL chưa làm UI tự đọc PostgreSQL và mật khẩu hash seed chưa tạo ra API đăng nhập. UI demo dùng thông tin đăng nhập trong code; SQL dùng bcrypt qua pgcrypto cho tài khoản thử nghiệm.

## Tái tạo bộ export

Sau khi cài dependencies frontend, chạy ở repo root:

```powershell
node scripts/export_sample_data.cjs
python -X utf8 scripts/generate_sample_sql.py
```

Frontend tính ngày tương đối ở lúc khởi tạo; JSON/SQL giữ ngày cố định lúc export. Khi dùng bộ SQL ở thời điểm khác, chiến dịch có thể đã hết hạn. Tái tạo file trước lần nạp đầu tiên nếu cần lịch mới; seed đã nạp sẽ không tự refresh ngày.

Xem toàn bộ thao tác và kịch bản tại [THAO_TAC_HE_THONG.md](../../docs/THAO_TAC_HE_THONG.md).

Nếu database đã nạp bộ seed v1 cũ, bộ mới sẽ báo trùng và rollback thay vì ghi đè. Cần một database phát triển riêng để thử bộ SQL mới; script không tự xóa hay thay dữ liệu cũ. Frontend tự cập nhật fixture riêng, không phụ thuộc việc import SQL.

Danh mục mới có 200 ảnh/tên riêng. Tài khoản đăng ký và 2FA lưu trong backend SQLite riêng, không phải các dòng seed PostgreSQL. Xem [tài khoản và danh mục](../../docs/TAI_KHOAN_VA_DANH_MUC.md).

Danh mục theo mẫu mới gồm 6 nhóm: Thời trang 34, Merchandise 34, Collectible 33, Công nghệ/phụ kiện điện tử 33, Nước hoa 33, Trang trí nhà cửa 33. Ưu tiên Sonic/Super Mario; xem [nguồn ảnh và phân bố](../../docs/PRODUCT_IMAGE_SOURCES.md).

Đã có chủ đề Liên Quân Mobile, Doraemon, Thám tử Conan và Anime điện ảnh bên cạnh Sonic/Mario. Bộ mẫu tự cập nhật theo sampleRevision 7, vẫn giữ 200 chiến dịch và 6 nhóm cân bằng.
