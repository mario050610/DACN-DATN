# Điều hướng chi tiết và thanh bên dashboard

Cập nhật 20/10/2026.

## Trang đích theo bản ghi

Các liên kết Xem chi tiết của bảng mở một trang nội dung riêng thay cho khối bên dưới bảng. URL giữ ID, tải lại hoặc mở tab mới vẫn chọn đúng bản ghi; có liên kết quay lại danh sách. Bản ghi không tồn tại hoặc ngoài danh sách thuộc tài khoản hiện tại không được thay bằng bản ghi đầu tiên.

| Chức năng | URL mẫu |
|---|---|
| Người dùng | `#admin-users?detail=<id>` |
| Giao dịch quản trị | `#admin-transactions?detail=<id>` |
| Đánh giá hồ sơ người bán | `#admin-sellers?review=<sellerId>` |
| Xử lý khiếu nại | `#admin-disputes?case=<id>` |
| Hồ sơ chiến dịch | `#admin-campaign-detail?campaign=<id>` |
| Sản phẩm cửa hàng | `#seller-products?detail=<id>` |
| Đơn của cửa hàng | `#seller-orders?detail=<id>` |
| Tài chính cửa hàng | `#seller-finance?detail=<id>` |
| Lệnh sản xuất của seller | `#seller-production?request=<id>` |
| Tiến độ lệnh của partner | `#partner-production?request=<id>` |
| Kết quả tìm kiếm trợ giúp | `#<role>-help?q=<query>` |

Các tham số được encode bằng URLSearchParams. Router vẫn xác định quyền theo trang gốc; query không bỏ qua kiểm tra vai trò. Lookup seller/partner giữ bộ lọc sở hữu hiện tại. Đây là điều hướng prototype, không thay thế kiểm tra ownership phía server cho những API production sau này.

Các thao tác lưu hồ sơ/khiếu nại, cập nhật tiến độ, hoàn tiền mẫu hoặc phê duyệt vẫn thực hiện chức năng của chúng, có trạng thái/hiệu ứng trên dữ liệu. Không biến nút thao tác thành liên kết tới trang rỗng.

## Sidebar

- Nút ba vạch nằm bên trái header của dashboard cho cả customer, seller, admin, partner.
- Từ 1024px: thu gọn/mở sidebar; vùng nội dung mở rộng; lưu tùy chọn `preora-sidebar-collapsed-v1` trong localStorage.
- Dưới 1024px: mặc định đóng; mở thành drawer có lớp phủ, nút đóng, Escape, khóa cuộn nền và giữ focus trong menu.
- Chọn một mục sẽ đóng drawer. Có thể mở lại bằng nút ba vạch; không cần kéo thanh menu ngang cũ.

## Kiểm tra đã chạy

- TypeScript và production build thành công.
- Rà AST frontend: không còn nút thiếu handler nằm ngoài form.
- Playwright trên bản build local: 46 đích menu (admin 13, seller 14, partner 8, customer 11); không có lỗi runtime trong các luồng kiểm tra.
- Kiểm tra chi tiết đúng ID, reload, browser Back, ID không tồn tại, seller không mở được trang admin/bản ghi cửa hàng khác.
- Kiểm tra lưu và tải lại nhận xét hồ sơ, lịch sử khiếu nại và lệnh sản xuất đã chọn.
- Sidebar desktop/persistence; mobile 390px; focus Tab, Escape, đóng sau điều hướng, không tràn ngang. Xem ảnh desktop/mobile để kiểm tra bố cục sau khi transition hoàn tất.
- API auth/shopping được mock trong phiên trình duyệt cô lập; dùng UI và catalogue prototype thật. Không tạo giao dịch hoặc huấn luyện trên server người dùng.
