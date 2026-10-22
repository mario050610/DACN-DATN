# Giao diện sáng/tối và logo PREORA

- Bấm biểu tượng mặt trăng/mặt trời trên thanh đầu trang để chuyển giao diện. Nút cũng có trên trang đăng nhập, đăng ký và khôi phục tài khoản; dùng được bằng bàn phím.
- Khi chưa chọn, giao diện theo chế độ của thiết bị. Sau khi chọn, lựa chọn được lưu với khóa `preora-theme`, giữ qua tải lại và đồng bộ tab cùng origin. Nếu trình duyệt chặn lưu trữ, nút vẫn hoạt động trong phiên hiện tại.
- Áp dụng cho trang công khai, trang mua sắm và dashboard customer/seller/admin/partner: nền, chữ, form, bảng, trạng thái và nhãn trục biểu đồ. Ảnh sản phẩm và màu nội dung ảnh không bị đảo màu.
- CSS biến và màu tương ứng đặt trong `frontend/src/theme.css`; logic chuyển giao diện trong `Theme.tsx`. `index.html` khởi tạo chế độ trước khi React tải để hạn chế nháy nền sáng.
- Logo dùng lại chính hình học SVG `PreoraIcon` từ `BrandIdentity.tsx` của file `src.zip` do người dùng cung cấp. `BrandLogo.tsx` là component dùng chung cho header/sidebar/đăng nhập và trang nhận diện. Favicon ở `public/preora-icon.svg`. Không thay mã nghiệp vụ bằng bản cũ trong ZIP.

Đã kiểm tra build và Chrome: sáng/tối, tải lại, đồng bộ tab, theo thiết bị/ghi đè lựa chọn, bàn phím, chặn localStorage và màn hình 390px trên bốn vai trò cùng các trang công khai/đăng nhập/sản phẩm. Các API trong kiểm tra trình duyệt được giả lập; không khởi chạy huấn luyện hoặc giao dịch thật.
