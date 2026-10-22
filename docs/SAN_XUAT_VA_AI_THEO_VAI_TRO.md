# Trang sản xuất và dự báo theo tài khoản

Partner có ba trang khác chức năng:
- `#partner`: KPI tổng hợp, yêu cầu cần ưu tiên và liên kết đến công việc; không lặp form cập nhật.
- `#partner-requests`: tìm/lọc yêu cầu được giao, xem chi tiết và tiếp nhận lệnh.
- `#partner-production`: theo dõi tiến độ, bắt đầu sản xuất, tăng phần trăm, chuyển vận chuyển và hoàn thành. Mỗi lệnh có lịch sử cập nhật và liên kết `?request=<id>`.

Các tài khoản liên quan dùng cùng lệnh:
- Seller → Sản xuất (`#seller-production`): tạo lệnh cho chiến dịch đạt MOQ, theo dõi lệnh của cửa hàng.
- Admin → Sản xuất (`#admin-production`): giám sát tất cả lệnh, không thao tác thay đối tác.
- Khách hàng → Tiến độ sản xuất (`#customer-production`): chỉ xem lệnh gắn với chiến dịch có đơn thuộc tài khoản; không xem thông tin đơn của khách khác.

Partner hoàn thành sẽ cập nhật đơn liên quan sang “Đã giao”; đơn đã hủy/hoàn tiền không bị đổi trạng thái. Không được giảm tiến độ, vượt 100% hoặc chuyển vận chuyển trước 100%.

Dữ liệu sản xuất vẫn là prototype trong localStorage. Các trang và tab cùng origin trình duyệt nhận cập nhật qua sự kiện storage, không chia sẻ phiên đăng nhập qua dữ liệu này. Đây chưa phải đồng bộ máy chủ giữa các thiết bị. Việc đăng nhập vẫn do cookie backend quản lý.

## Seller huấn luyện AI

Seller → Dự báo AI (`#seller-ai`) dùng cùng giao diện huấn luyện với admin, gồm chọn chiến dịch đang chạy, snapshot, hành vi, hủy đơn, lịch sử ngày, chế độ demo/CSV/UCI, policy sản xuất, tiến trình và kết quả.

API riêng `/api/seller/ai-training`:
- Danh sách và chi tiết phiên được lọc theo ownerId do máy chủ xác định từ phiên đăng nhập.
- Chiến dịch mẫu được đối chiếu với catalogue máy chủ. Snapshot chiến dịch tự tạo được đăng ký phạm vi qua `POST /campaigns`; ID đã đăng ký không được chuyển sang seller khác. Dữ liệu snapshot vẫn do prototype cung cấp, chưa xác minh độc lập doanh số.
- Seller chỉ thấy và dùng CSV do mình nhập. Admin có thể giám sát các phiên và dataset.
- Tracker và kết quả mô hình cũng kiểm tra chủ chiến dịch.
- Mọi vai trò dùng chung một worker đang hoạt động; khi bận API trả 409, không lộ dữ liệu phiên của seller khác.
- Quyền điều khiển tự tăng đơn toàn hệ thống vẫn thuộc admin.

Kiểm tra backend từ thư mục backend: `.venv/Scripts/python.exe -m pytest tests -q`.
