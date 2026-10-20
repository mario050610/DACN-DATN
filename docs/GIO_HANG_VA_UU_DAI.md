# Giỏ hàng, sản phẩm đã lưu và ưu đãi

## Thao tác trên web

1. Đăng ký hoặc đăng nhập bằng tài khoản khách hàng.
2. Mở sản phẩm. Bấm ảnh nhỏ, nút trước/sau hoặc phím mũi tên khi đang chọn ảnh để đổi góc nhìn. Mẫu ngôi sao Super Mario có 5 ảnh; sản phẩm nguồn chỉ có một ảnh sẽ không có các ảnh lặp giả.
3. Bấm **Lưu sản phẩm** để đưa vào mục **Yêu thích**. Bấm lại để bỏ lưu.
4. Bấm **Thêm vào giỏ hàng** để tiếp tục xem sản phẩm, hoặc **Đặt trước ngay** để mở giỏ.
5. Vào **Kho ưu đãi**, bấm **Lưu mã**. Có 6 ưu đãi mẫu theo số tiền tối thiểu, nhóm sản phẩm và mức giảm tối đa. Mỗi tài khoản dùng mỗi mã một lần.
6. Trong **Giỏ hàng**, chọn tất cả hoặc chọn từng dòng, chỉnh số lượng 1–99, xóa món hoặc bấm tên/ảnh để xem lại sản phẩm. Giỏ hiển thị theo cửa hàng.
7. Chọn mã đã lưu để xem giảm giá. Mã chưa đủ điều kiện sẽ có thông báo và không cho xác nhận.
8. Bấm **Mua hàng**, điền thông tin nhận hàng, chấp nhận điều kiện đặt trước và xác nhận. Chỉ sản phẩm được chọn tạo đơn; món chưa chọn vẫn trong giỏ.
9. Vào **Đơn hàng** để theo dõi. Đăng xuất rồi đăng nhập cùng tài khoản trên trình duyệt khác vẫn tải được sản phẩm yêu thích, giỏ, mã đã lưu/đã dùng và đơn đã tạo.

## Dữ liệu và giới hạn

- Backend lưu thông tin mua sắm theo ID tài khoản trong bảng `shopping` của SQLite tài khoản (`backend/data/accounts.sqlite3`, hoặc `AUTH_DATABASE_PATH`). Không đưa DB runtime vào Git. Khi triển khai nhiều máy cần dùng chung backend và ổ lưu DB bền vững.
- API `/api/shopping`: `vouchers`, `me`, `saved`, `cart`, `selection`, `claim`, `quote`, `checkout`. Backend xác thực cookie và vai trò khách hàng, kiểm tra chiến dịch/ngày thực, giá từ danh mục, điều kiện mã và chống tạo đơn trùng khi gửi lại cùng khóa checkout. Số lượng, mã và giá do trình duyệt sửa không được tin làm giá thanh toán.
- Danh mục giá/ngày backend nằm ở `backend/app/data/shopping_catalogue.json`, đồng bộ khi chạy `node scripts/export_sample_data.cjs`. Đồng hồ mô phỏng trên dashboard không thay đổi ngày thực của API mua sắm.
- 1269 ảnh cho 300 sản phẩm: 270 sản phẩm có nhiều ảnh, 30 sản phẩm có một ảnh nguồn. Gallery không lặp byte ảnh trong cùng sản phẩm. Nguồn ảnh bổ sung được ghi trong `gallerySources` của manifest.
- Làm mới dữ liệu/ảnh: chạy script danh mục hiện có, chạy `python scripts/expand_catalogue_300.py`, tiếp theo `python scripts/prepare_product_galleries.py`, rồi `node scripts/export_sample_data.cjs`. Cần các thư viện trong `scripts/catalogue-requirements.txt`.
- Đây là checkout mô phỏng, **không thu tiền thật**. Chưa tích hợp thanh toán/vận chuyển/voucher thật từ Shopee. Các chức năng quản lý chiến dịch/sản xuất khác vẫn dùng demo store hiện có; phần mua sắm mới có API lưu riêng theo tài khoản.

## Kiểm chứng ngày 15/10/2026

- Backend: 24 kiểm thử đạt, gồm cô lập tài khoản, giữ dữ liệu qua đăng nhập, giá server, chọn dòng, giỏ còn lại, mã theo nhóm/tối thiểu/hết hạn/đã dùng, trần giảm, chống đơn trùng, Origin và phân quyền.
- Build TypeScript/Vite đạt. Kiểm tra dữ liệu seed giữ 300 chiến dịch; sáu nhóm có 40–56 sản phẩm.
- Edge headless: đổi ảnh thực tế, lưu sản phẩm, thêm giỏ, lấy mã, chọn dòng, giảm 50.000 ₫, tạo đơn và đăng nhập trong browser context mới để đọc lại dữ liệu. Đã xem ảnh gallery và giỏ mobile 390px, không tràn ngang; không có lỗi runtime.
