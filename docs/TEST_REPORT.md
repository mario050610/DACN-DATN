# PREORA — Báo cáo kiểm tra khi tạo khung local

Ngày kiểm tra: 13/10/2026.

## Đã xác minh
- 13/13 file `frontend/src` giữ nguyên bytes so với ZIP Figma người dùng cung cấp.
- 8 file `.ts`/`.tsx` parse được bằng TypeScript 5.8.3, không có lỗi cú pháp.
- Backend Python FastAPI: `pytest` 2/2 bài test đạt.
- AI Service Python FastAPI: `pytest` 2/2 bài test đạt; endpoint dự báo chưa có model trả 503 đúng thiết kế.
- Batch script Windows được đóng gói dạng CRLF và rà soát đường dẫn tương đối.
- ZIP chứa một thư mục gốc `PREORA/` với toàn bộ mã nguồn.

## Chưa thể xác minh trong môi trường này
- Chưa cài toàn bộ npm dependencies/build Vite vì npm registry không truy cập được trong môi trường kiểm tra; cần `npm install`, `npm run build` trên máy có Internet.
- Chưa chạy Docker Compose/PostgreSQL thật vì Docker không có sẵn.
- Chưa chạy toàn bộ luồng Customer → Seller → Admin → AI → Manufacturer trên trình duyệt.
- Chưa có authentication/backend/database/ML production.

Đây là **scaffold để phát triển**, không phải backend/AI hoàn chỉnh.
## Kiểm tra bổ sung — dữ liệu mẫu 15/10/2026

- `npm.cmd --prefix frontend run build`: đạt (TypeScript + Vite).
- `node scripts/export_sample_data.cjs`: đạt kiểm tra chủ sở hữu sản phẩm/chiến dịch, tổng số lượng theo chiến dịch, số tiền và trạng thái payment, ngày đặt và điều kiện lệnh sản xuất.
- Bộ mẫu: 14 user, 12 sản phẩm, 12 chiến dịch, 307 đơn, 307 payment, 1 lệnh sản xuất; có 8 snapshot mô phỏng.
- Parser PostgreSQL `pglast` parse được schema, SQL seed và khối PL/pgSQL; launcher PowerShell và script Python không có lỗi cú pháp.
- Chưa chạy import/kiểm tra bcrypt và chạy lại seed trên PostgreSQL thật: Docker Desktop Linux engine chưa hoạt động. Parse SQL không thay thế kiểm thử database.
- Chưa kiểm thử tương tác trình duyệt trong đợt này; các thao tác và giới hạn được đối chiếu trực tiếp với code.
## Sửa phản hồi giao diện và tích hợp trợ lý — 15/10/2026

- Dữ liệu mới: 114 user, 210 sản phẩm, 210 chiến dịch (200 đang chạy), 3.905 đơn và payment, 404 snapshot mô phỏng. Customer demo có đúng 5 đơn mẫu của 5 sản phẩm khác nhau; đơn do người dùng tạo được giữ lại khi chuyển fixture cũ.
- Frontend build TypeScript + Vite: đạt.
- Backend: 9 test đạt, gồm API chatbot, giới hạn input, ngăn system-role trong history, lỗi provider và timeout.
- Kiểm thử trình duyệt Edge headless với dữ liệu lỗi cũ: migration, bảo toàn đơn người dùng, tìm kiếm đơn, mở đúng mã đơn, 200 chiến dịch, phân trang, chọn ticket và lưu hội thoại.
- Đã gọi thật backend → Ollama qwen3:8b, nhận câu trả lời tiếng Việt cho câu hỏi MOQ; đã gọi từ giao diện thật.
- Kiểm thử màn hình 390px: không tràn ngang, báo lỗi khi AI không kết nối, retry không lặp câu hỏi, hội thoại tách theo tài khoản. Đã chụp và xem ảnh giao diện desktop.
- SQL seed mới parse được bằng PostgreSQL/PLpgSQL parser; vẫn chưa import PostgreSQL thật vì Docker Desktop engine chưa chạy.
## Tài khoản và 200 ảnh/tên riêng — 15/10/2026

- Đã loại bỏ toàn bộ landing page v1 khỏi App.tsx; trang gốc mở marketplace.
- Kiểm tra 200 active product names, 200 local image URLs, 200 hash nội dung khác nhau và ảnh đọc được bằng Pillow; có manifest nguồn.
- Frontend build TypeScript + Vite: đạt.
- Backend: 17 test đạt, gồm hash mật khẩu, email trùng, ngăn tự đăng ký admin, session/logout, đổi mật khẩu thu hồi phiên cũ, bật/tắt TOTP, challenge/mã khôi phục dùng một lần, giới hạn thử, Origin và vector RFC 6238.
- Edge headless: đăng ký từ UI → bật 2FA bằng QR/secret và mã TOTP → đăng xuất → đăng nhập yêu cầu 2FA → dùng recovery code → refresh vẫn đăng nhập → tắt 2FA → đổi mật khẩu → mật khẩu cũ bị từ chối, mật khẩu mới thành công. Không có lỗi runtime trình duyệt. Đã xem ảnh marketplace và trang bảo mật; không chụp QR/secret/mã khôi phục.
- Account runtime SQLite được git-ignore. Business data vẫn localStorage; chưa triển khai toàn bộ API nghiệp vụ/RBAC PostgreSQL.
## Danh mục theo mẫu và cân bằng nhóm — 15/10/2026

- 200 chiến dịch đang chạy; 200 tên riêng và 200 ảnh local có SHA-256 khác nhau.
- Thời trang 34; Merchandise 34; Collectible 33; Công nghệ/phụ kiện điện tử 33; Nước hoa 33; Trang trí nhà cửa 33.
- Ưu tiên Sonic/Super Mario, có bộ lọc riêng; giữ và bổ sung nước hoa/trang trí từ nguồn có ảnh đúng sản phẩm. Nguồn đầy đủ trong PRODUCT_IMAGE_SOURCES.md và manifest.
- Build frontend đạt. Export seed kiểm tra đủ 6 nhóm cân bằng, tổng 200, quan hệ đơn/payment/campaign và 5 đơn cá nhân riêng đạt. Parser PostgreSQL/PLpgSQL chấp nhận seed mới.
- Edge headless: lọc Sonic/Mario, lần lượt cả 6 nhóm và trang 2 đúng số lượng, lọc ở marketplace sau đăng nhập, giao diện 390px không tràn ngang. Không có lỗi runtime. Đã xem ảnh desktop Sonic/Mario và kiểm tra ảnh nguồn từng sản phẩm đọc được.
- Chưa chạy import PostgreSQL thật; các thay đổi danh mục không thay thế backend CRUD nghiệp vụ.
## Chủ đề bổ sung — 15/10/2026

- Thêm 3 sản phẩm Liên Quân Mobile, 5 Doraemon, 5 Thám tử Conan và 5 Anime điện ảnh (Chainsaw Man – Reze Arc/Demon Slayer) từ trang sản phẩm có ảnh nguồn.
- Tổng vẫn 200 chiến dịch đang hoạt động, ảnh và tên riêng; sáu nhóm giữ mức 33–34, không thay nước hoa/trang trí. Còn 45 Sonic và 42 Super Mario.
- Đã thêm 6 nút chủ đề, tìm theo chủ đề, thứ tự đề xuất đan xen. Cập nhật fixture lên revision 7 và seed tương ứng.
- Build frontend và kiểm tra export dữ liệu đạt. Edge headless xác minh cả 6 chủ đề đúng số lượng/ảnh, giữ nước hoa và trang trí mỗi nhóm 33, lọc sau đăng nhập và mobile không tràn ngang. Đã xem ảnh Doraemon/Anime và kiểm tra ảnh Liên Quân trước khi đặt tên.
- Đã xử lý Vite giữ cache module cũ bằng yêu cầu nạp lại cấu hình; kiểm tra HTTP xác nhận module mới và các nút mới đã phục vụ trên cổng 5173.

## Giỏ hàng và ưu đãi theo tài khoản — 15/10/2026

- Bổ sung API mua sắm lưu SQLite theo tài khoản, wishlist/giỏ/ưu đãi/đơn và checkout mô phỏng có kiểm tra giá, chiến dịch, mã ở server.
- 844 ảnh, 179 sản phẩm có gallery nhiều ảnh; mẫu ngôi sao Mario có 5 ảnh. Giữ 200 sản phẩm, 6 nhóm cân bằng và các chủ đề đã có.
- Chi tiết luồng thao tác, giới hạn và kiểm chứng trong GIO_HANG_VA_UU_DAI.md. Các ghi chú trước đây về business data chỉ ở localStorage đã được thay thế cho riêng luồng mua sắm mới.

## Mở rộng 300 sản phẩm — 15/10/2026

- Bốn chủ đề Liên Quân Mobile, Doraemon, Thám tử Conan, Anime điện ảnh đều có đúng 20 sản phẩm. Giữ 200 vị trí/ID cũ và thêm 100; 300 ảnh chính và tên khác nhau.
- Tổng gallery 1269 ảnh; 270 sản phẩm có nhiều góc. Các nhóm: Collectible 56, thời trang 54, merchandise 48, công nghệ 51, nước hoa 51, trang trí 40.
- Fixture revision 8; seed có 310 sản phẩm/chiến dịch (300 đang mở + 10 tình huống vòng đời), 5742 đơn/payment mẫu. Đồng bộ giá/danh mục API mua sắm.
- Build frontend đạt; 24 kiểm thử backend đạt. Edge headless xác minh 4 bộ lọc đều 20 ảnh đọc được, 300 tên/ảnh chính riêng, phân trang 13 trang (trang cuối 12 món), lọc khi đăng nhập, thêm sản phẩm mới vào giỏ qua backend, mobile không tràn ngang và không lỗi runtime.

## Rà soát nội dung theo tên trang — 16/10/2026

- Đã kiểm tra 74 đường dẫn qua Edge headless, thay bảng REC dùng chung bằng dữ liệu đúng trang; sửa KPI/biểu đồ cố định, nội dung trang thông tin, phạm vi dữ liệu từng vai trò và các trang chi tiết.
- Build frontend đạt; 25 kiểm thử backend đạt. Đã kiểm tra tìm kiếm, phân trang, lưu hồ sơ người bán/khiếu nại/hồ sơ đối tác qua refresh, mobile bốn vai trò và chặn sai vai trò.
- Chi tiết phạm vi, danh sách thay đổi và giới hạn lưu demo ở RA_SOAT_NOI_DUNG_TRANG.md. Giữ danh mục 300 sản phẩm và ID đã có.
