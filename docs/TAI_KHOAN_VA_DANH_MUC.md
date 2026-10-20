# Tài khoản, bảo mật và danh mục mới

## Chạy và mở trang

Chạy `START_PREORA.bat` (hoặc `START_PREORA_WITH_AI.bat`) trên Windows. Cả hai bật frontend cùng backend nếu chưa có dịch vụ ở cổng 8000. Nếu một backend PREORA cũ đang chạy, khởi động lại backend để nạp API tài khoản mới.

Trang gốc mở **Khám phá sản phẩm**, không còn landing page v1. Khi đã đăng nhập, trang gốc mở marketplace theo vai trò. Các hash cũ `#landing`, `#landing-v1`, `#v1` cũng về marketplace.

## Đăng ký

Bấm **Đăng ký** ở trang khám phá hoặc mở `/#register`. Nhập họ tên, email, mật khẩu ít nhất 10 ký tự, xác nhận và chọn khách hàng/người bán. Hệ thống lưu tài khoản trên backend rồi đăng nhập. Không cho phép tự đăng ký vai trò admin hoặc đối tác sản xuất.

Email trùng và dữ liệu sai được báo ngay. Đăng ký không gửi email xác minh. Quên mật khẩu qua email chưa được triển khai; trang `/#forgot` giải thích cách dùng các chức năng hiện có, không giả báo đã gửi email.

Các tài khoản demo có sẵn vẫn đăng nhập được bằng `Demo123!` ở lần khởi tạo đầu tiên. Nếu bạn đổi mật khẩu hoặc bật 2FA cho chúng, thông tin mới được giữ lại; khởi động lại server không đặt lại mật khẩu/2FA. Không còn nút chuyển vai trò bỏ qua đăng nhập.

## Đổi mật khẩu

Vào **Hồ sơ / Cài đặt → Bảo mật tài khoản**. Nhập mật khẩu hiện tại và mật khẩu mới hai lần. Nếu bật 2FA, nhập thêm mã Authenticator hoặc mã khôi phục. Mật khẩu mới phải khác mật khẩu cũ. Sau khi thành công, các phiên đăng nhập khác và challenge cũ bị thu hồi; phiên hiện tại nhận cookie mới.

## Xác thực hai lớp

1. Nhập mật khẩu hiện tại → **Bật xác thực hai lớp**.
2. Quét QR bằng ứng dụng Authenticator, hoặc nhập khóa thủ công. QR được tạo trực tiếp trong trình duyệt, không gửi khóa đến website tạo QR khác.
3. Nhập mã 6 số từ ứng dụng → **Xác nhận bật 2FA**. Chỉ khi xác nhận đúng thì 2FA mới bật.
4. Lưu 8 mã khôi phục ở nơi riêng tư. Mỗi mã dùng một lần; không được lưu mã này trong localStorage.
5. Lần đăng nhập tiếp theo cần mật khẩu rồi mã Authenticator hoặc một mã khôi phục. Nếu vừa dùng mã để kích hoạt, đợi mã kế tiếp; mã đã dùng bị từ chối.
6. Để tắt, nhập mật khẩu hiện tại cùng mã Authenticator/mã khôi phục → **Tắt xác thực hai lớp**.

Thiết lập chờ xác nhận hết hạn sau 10 phút; challenge đăng nhập sau 5 phút; có giới hạn số lần thử. TOTP dùng bước 30 giây, sai lệch tối đa một bước và kiểm tra không tái sử dụng bước đã chấp nhận. Các thao tác bảo mật làm mới phiên và thu hồi các phiên khác.

## Dữ liệu lưu ở đâu?

- Tài khoản/mật khẩu hash/session/2FA lưu ở `backend/data/accounts.sqlite3`. Docker dùng volume `authdata`. Có thể đổi bằng `AUTH_DATABASE_PATH`.
- Mật khẩu dùng PBKDF2-HMAC-SHA256 với salt riêng và 600.000 vòng. Cookie phiên HttpOnly, SameSite=Strict; chỉ lưu hash token trong database. Local HTTP dùng `AUTH_COOKIE_SECURE=false`; triển khai HTTPS cần đặt `true`.
- File database được loại trừ khỏi Git. Secret TOTP chỉ ở backend và bước thiết lập; cần bảo vệ/sao lưu file runtime khi vận hành. Chưa tích hợp kho khóa mã hóa cho secret TOTP.
- **Dữ liệu mua bán vẫn là demo localStorage**, chưa phải backend CRUD/RBAC/PostgreSQL hoàn chỉnh. Xác thực tài khoản đã chuyển sang backend; không suy ra rằng toàn bộ nghiệp vụ đã có bảo mật production. Hồ sơ demo và email liên hệ hiện chưa thay email đăng nhập backend.
- Reset dữ liệu demo không xóa database tài khoản hoặc tắt 2FA. Không xóa file runtime để giải quyết lỗi đăng nhập nếu muốn giữ tài khoản.

## 300 chiến dịch

300 chiến dịch đang chạy có 300 tên sản phẩm riêng và 300 ảnh khác nội dung. Ảnh được tải sẵn vào `frontend/public/products`, không cần CDN lúc sử dụng. Nguồn và checksum tại `database/seeds/product_image_manifest.json`, thông tin nguồn tại [PRODUCT_IMAGE_SOURCES.md](PRODUCT_IMAGE_SOURCES.md).

Dữ liệu được tự cập nhật một lần khi tải lại trang; các đơn do người dùng tạo vẫn được giữ theo quy tắc migration fixture. Danh mục hiện là mẫu coursework; giá VND, MOQ, seller, đơn và chiến dịch được tạo mô phỏng. Chưa phải dữ liệu train AI thực tế.

## Tài liệu tham khảo triển khai

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [RFC 6238 — TOTP](https://www.rfc-editor.org/rfc/rfc6238).
