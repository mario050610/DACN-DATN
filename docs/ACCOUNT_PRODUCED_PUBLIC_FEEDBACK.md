# Tài khoản, thành phẩm và góp ý công khai — 02/11/2026

## 1. Audit và phần được tái sử dụng

- Frontend React 19, TypeScript, Vite, Tailwind; hash routing trong `App.tsx`/`Platform.tsx`, role guards theo session. Giữ design teal, surfaces sáng và hỗ trợ dark mode sẵn có.
- FastAPI/Pydantic, SQLite qua `auth.database()`. Đăng nhập bằng mật khẩu băm PBKDF2 có salt, session cookie HttpOnly, TOTP/one-use recovery codes. Hiện không có OAuth provider được cấu hình; không thêm nút đăng nhập giả hoặc nhận danh tính OAuth do client tự khai.
- Nghiệp vụ canonical dùng `lifecycle_state`/`lifecycle_items`; command có revision, quyền chủ sở hữu và các bước chuyển hợp lệ. Không tạo lại dự án hay thay các enum sản phẩm/chiến dịch hiện có.
- Hồ sơ công khai, avatar/logo, follow và business fields tái sử dụng `community_profiles`/`community_media`. Tài liệu xác minh tiếp tục ở kho private có quyền owner/admin; Partner có endpoint riêng, không được gọi endpoint Seller-only.
- Feedback trước sản xuất tiếp tục dùng `lifecycle_items(kind='feedback')`; đánh giá trải nghiệm dùng `kind='review'`. Không nhập hai loại vào một điểm sao. Dữ liệu cũ thiếu category/stage/update timestamp được đọc theo adapter, không xóa hoặc viết lại nội dung.

## 2. Cách sử dụng

- Đăng ký: Customer, Seller hoặc Partner; tên/email/điện thoại/mật khẩu/xác nhận mật khẩu và đồng ý điều khoản + quyền riêng tư. Seller bổ sung tên cửa hàng; Partner chọn manufacturing/supplier/logistics/other, thông tin chuyên biệt còn lại cập nhật sau.
- Menu tài khoản → **Thông tin tài khoản**: cập nhật hồ sơ lưu backend, upload avatar/logo, xem xác minh. Customer bổ sung địa chỉ giao hàng riêng tư, xem yêu thích/đơn/pre-order/feedback/sản phẩm theo dõi.
- Seller → Cài đặt / hồ sơ: thông tin cửa hàng, loại hình, danh mục, mô tả, địa chỉ kinh doanh công khai. Partner → Hồ sơ: tổ chức, loại đối tác, đại diện, lĩnh vực, năng lực hợp tác, khu vực và trạng thái đối chiếu.
- Seller/Partner Profile: có **Sản phẩm đã sản xuất**; Partner chỉ thấy lô thực sự được phân công cho mình. Cửa hàng có lọc đang nhận đặt trước/đang sản xuất/đã sản xuất, ngoài các bộ lọc cũ.
- Product Detail công khai (`#product/<id>`) hoặc theo vai trò (`#customer-product/<id>`): **Đánh giá & Góp ý cộng đồng** ngay sau thông tin chính. Tab mặc định là **Góp ý trước sản xuất**, khách chưa đăng nhập cũng đọc được toàn bộ danh sách qua phân trang.
- Seller/Admin → **Góp ý sản phẩm**: chọn sản phẩm để phản hồi hoặc xem báo cáo vi phạm. Góp ý không cần Seller phê duyệt mới xuất hiện.

## 3. Quy tắc và quyền

- Customer gửi góp ý khi chiến dịch đã được duyệt và chưa bắt đầu sản xuất; được sửa/xóa góp ý của mình trước sản xuất và trước khi Seller trả lời để giữ ngữ cảnh trao đổi. Xóa là soft-delete.
- Seller chỉ phản hồi sản phẩm thuộc mình, chọn trạng thái tiếp nhận/xem xét/đưa vào phương án/chưa áp dụng. Không sửa nội dung hoặc tự ẩn góp ý của khách.
- Partner chỉ đọc góp ý công khai; không có quyền sửa, trả lời với tư cách Seller hoặc kiểm duyệt.
- Admin ẩn/giữ góp ý với lý do kiểm duyệt. Lưu quyết định, người xử lý, thời điểm; giữ nội dung gốc trong kho riêng và không trả lý do/internal fields qua public API.
- Chuyển sang sản xuất/hoàn tất sản xuất chỉ đóng quyền gửi/sửa khi cần; không xóa hay tự ẩn góp ý cũ.
- Public API feedback chỉ chọn các trường cần cho card: nội dung, stage/category, tên/avatar công khai, timestamp, phản hồi và quyền thao tác của viewer. Không trả email, điện thoại, địa chỉ giao hàng, authorId, tài liệu pháp lý, snapshot nội bộ hoặc quyết định kiểm duyệt.
- Sản phẩm đã sản xuất được suy ra từ bản ghi lô có progress 100% trong bước sản xuất/vận chuyển/hoàn thành. Không dựa vào tên chiến dịch hoặc một nút gắn nhãn giả; không thêm enum Produced tùy tiện. Ngày hoàn thành là lần đầu có sự kiện xác nhận 100% của lô; dữ liệu cũ thiếu mốc được ghi rõ chưa có timestamp.
- Nếu chưa có ảnh thành phẩm, card dùng ảnh thiết kế và ghi nhãn rõ. Không suy diễn ảnh thiết kế thành ảnh sản phẩm thật. Số lượng cộng theo lô duy nhất, không nhân theo số lần upload ảnh.
- Product Detail vẫn mở sau kết thúc campaign/sản xuất; không cho mua tiếp hàng có sẵn khi chưa có workflow tương ứng. Bỏ lịch sản xuất/giao hàng tự cộng ngày; lấy ngày từ campaign/phương án đã công bố, thiếu thì hiển thị chưa công bố.
- Chỉ thử lại command một lần khi server trả header `X-PREORA-Conflict: revision` (chưa ghi). Không retry lỗi nghiệp vụ, kết quả không rõ hoặc sau đổi tài khoản.

## 4. Database / migration an toàn

| Hiện trạng | Vai trò tương đương |
|---|---|
| `accounts` + cột `role` | USER, một vai trò mỗi tài khoản; không tạo USER_ROLE thừa |
| `account_details` theo owner | Hồ sơ riêng tư, gồm địa chỉ giao hàng Customer |
| `community_profiles.business` | SELLER_PROFILE/PARTNER_PROFILE công khai, cập nhật theo owner |
| `community_media` | Avatar/logo/ảnh dùng lại cơ chế upload hiện có |
| `lifecycle_items` feedback/review/report/decision | Góp ý, đánh giá và lịch sử kiểm duyệt |
| `seller_verifications`/`seller_documents` | Kho xác minh lịch sử, reuse theo owner; endpoint Seller/Partner tách strict role |

Migration chỉ thêm `phone`, `terms_version`, `terms_accepted_at`, `created_at` vào `accounts` và tạo `account_details` khi chưa có. Không thay ID, role, hash mật khẩu, phiên hoặc secret 2FA. Tài khoản cũ giữ phone rỗng/ngày chấp thuận chưa biết; không bịa lịch sử đồng ý. Hồ sơ cũ trong localStorage chỉ điền bản nháp cho chính chủ và cần bấm Lưu, không tự xuất bản.

Ứng dụng tự áp dụng schema bổ sung khi mở DB. Có thể tạo backup SQLite nhất quán rồi migrate chủ động:

```powershell
cd D:\PREORA-Monorepo-Starter\PREORA
backend\.venv\Scripts\python.exe scripts\migrate_account_profiles.py
# Hoặc chỉ định một file đang tồn tại:
backend\.venv\Scripts\python.exe scripts\migrate_account_profiles.py --database backend\data\accounts.sqlite3
```

Script không reset/reseed hay thay file gốc. Backup có tên `*.before-profiles-<timestamp>-<id>.sqlite3`, bị loại khỏi Git cùng dữ liệu runtime.

## 5. API bổ sung/mở rộng

- `POST /api/auth/register`: yêu cầu phone/password_confirmation/accepted_terms/accepted_privacy; role Customer/Seller/Partner, không cho tự đăng ký admin. Phương thức đăng nhập/2FA cũ giữ nguyên.
- `GET|POST /api/account/me`: hồ sơ hiện tại; `GET /api/account/activity`: lịch sử của chính chủ. Client không đặt owner/role/trạng thái xác minh.
- `GET|POST /api/partner-verification/me`: strict Partner, tài liệu của chính chủ; `GET /api/partner-verification/admin`: strict admin. Không nới `identity(...,'seller')`.
- `GET /api/lifecycle/products/{pid}/feedback?stage=PRE_PRODUCTION|POST_PRODUCTION&page=1&pageSize=8&sort=newest|oldest&category=`: tổng số, phân trang, sorting và projection whitelist.
- Commands cũ `feedback.create|reply` mở rộng category/stage/updatedAt/handlingStatus; bổ sung `feedback.edit|delete|report|moderate`, `product.follow`.
- `GET /api/lifecycle/produced?sellerId=&partnerId=&q=&page=&pageSize=&sort=newest|price_asc|price_desc`: metadata từ production records thật; giữ products/releases cũ để tương thích.
- Product experience trả lifecycle summary, các campaign còn mở góp ý, trạng thái follow của chính viewer; workspace admin bổ sung feedback reports.

## 6. Các file chính

- Tài khoản: `backend/app/services/account_profiles.py`, `backend/app/api/v1/routes/account.py`, `auth.py`, `partner_verification.py`, phần lưu theo owner trong `verification.py`; `frontend/src/AuthPage.tsx`, `AccountProfile.tsx`, `services/accountApi.ts`, `services/apiErrors.ts`, `services/authApi.ts`.
- Thành phẩm và góp ý: `backend/app/services/product_community.py`, API `lifecycle.py` và projector `community.py`; `frontend/src/PublicFeedback.tsx`, `FeedbackManagement.tsx`, `ProducedProducts.tsx`, `ProductLifecycleSummary.tsx`, `ProductExperience.tsx`, `lifecycleUi.ts`.
- Tích hợp: `Platform.tsx`, `Community.tsx`, `DashboardPages.tsx`, `SellerLegalVerification.tsx`, `DemoStore.tsx`, `lifecycleApi.ts`, backend `main.py`.
- Migration và kiểm thử: `scripts/migrate_account_profiles.py`, `backend/tests/test_role_profiles.py`, `test_public_product_feedback.py`, fixture đăng ký trong `test_auth.py`/`test_shopping.py`.

## 7. Kiểm tra

```powershell
cd D:\PREORA-Monorepo-Starter\PREORA\backend
.venv\Scripts\python.exe -m pytest tests -q
cd ..
npm.cmd --prefix frontend run build
node scripts/test_order_events.cjs
node scripts/test_capacity_progress.cjs
```

Build đã bao gồm `tsc --noEmit`. Dự án hiện chưa cấu hình script lint; không gọi formatter là lint.

Kết quả: **118 backend tests passed**, build/typecheck thành công (còn cảnh báo bundle size), `git diff --check` không có lỗi. Backend tests bao phủ đăng ký/hồ sơ ba vai trò, migration lặp không mất credential, strict Seller/Partner verification, public feedback/stage/pagination/privacy, sửa/xóa theo owner, reply/kiểm duyệt, giữ góp ý sau production và không gắn Produced khi chưa đủ bằng chứng.

Chrome đã đi hết đăng ký/hồ sơ Customer/Seller/Partner, gửi/sửa/xóa/theo dõi, phản hồi Seller, visitor đọc và phân trang/sắp xếp, hoàn tất lô bằng workflow hợp lệ, thành phẩm ở đúng Seller/Partner, góp ý còn nguyên sau sản xuất, kiểm duyệt Admin, tab đánh giá riêng, responsive desktop/mobile. Kiểm tra với API/SQLite thật riêng biệt; fixtures chỉ tạo trong môi trường test, không dùng mock cố định để thay tính năng của ứng dụng.

Hạn chế vẫn còn: OAuth/email reset chưa có dịch vụ cấu hình; xác minh pháp lý là đối chiếu thủ công, không tự xác nhận giấy tờ hợp lệ. Cơ sở nghiệp vụ vẫn SQLite local, chưa đổi toàn hệ thống sang PostgreSQL. Vận chuyển/thanh toán giữ mức prototype đã ghi rõ ở tài liệu vòng đời.
