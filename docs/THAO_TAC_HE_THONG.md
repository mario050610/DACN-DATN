> Cập nhật mới nhất: đăng ký, đổi mật khẩu và 2FA đã được hiện thực ở backend; landing v1 đã gỡ. Xem [TAI_KHOAN_VA_DANH_MUC.md](TAI_KHOAN_VA_DANH_MUC.md). Các mục auth demo bên dưới ghi lại trạng thái trước đợt cập nhật này.

# PREORA — Các thao tác trên hệ thống hiện tại

Tài liệu đối chiếu với code hiện tại. **Lưu demo** = đổi state và localStorage của trình duyệt, chưa ghi backend. **Tạm thời** = state của màn hình, có thể mất khi đổi trang/tải lại. **Minh họa** = nội dung/nút chưa có nghiệp vụ thật.

## 1. Mở hệ thống và tài khoản

Chạy frontend, mở `http://localhost:5173`. Các đường dẫn dưới đây nối sau địa chỉ đó, ví dụ `/#login`.

| Tài khoản | Mật khẩu | Trang tổng quan |
|---|---|---|
| customer@preora.demo | Demo123! | /#account |
| seller@preora.demo | Demo123! | /#seller |
| seller.b@preora.demo | Demo123! | /#seller |
| admin@preora.demo | Demo123! | /#admin |
| partner@preora.demo | Demo123! | /#partner |

- Đăng nhập bằng tài khoản mẫu; sai tài khoản/mật khẩu hiện lỗi.
- Có bộ chuyển tài khoản demo để trình diễn các vai trò, gồm seller thứ hai.
- Đăng xuất từ dashboard; mở trang sai vai trò hiện màn hình không có quyền.
- Đăng ký chỉ kiểm tra đầu vào rồi báo chưa kết nối; không tạo người dùng.
- Quên mật khẩu chỉ chuyển về đăng nhập, không gửi email.
- Cơ chế phân quyền hiện ở client, chưa phải xác thực backend.

## 2. Khách chưa đăng nhập

| Trang | Thao tác | Mức hỗ trợ |
|---|---|---|
| / | Xem landing page, đổi Việt/Anh, menu, mở đăng nhập/đăng ký/khám phá | Giao diện |
| /#brand | Xem nhận diện thương hiệu | Nội dung |
| /#explore | Tìm sản phẩm, lọc danh mục, xóa bộ lọc, mở chi tiết | Lọc trên dữ liệu hiển thị |
| /#product/1 | Xem giá, MOQ, tiến độ, chọn phiên bản, lưu, đặt trước | Nút đặt trước chuyển sang giỏ; giỏ yêu cầu vai trò customer |
| /#how, /#help, /#contact, /#terms, /#privacy, /#seller-profile | Xem các trang thông tin | Nội dung minh họa |

Landing và một số trang công khai vẫn có số liệu/mảng sản phẩm riêng. Khi kiểm thử nghiệp vụ, ưu tiên trang khám phá sau đăng nhập: chỉ hiện chiến dịch đang nhận đặt trước.

## 3. Khách hàng

| Trang | Thao tác | Lưu ý |
|---|---|---|
| /#customer-home | Tìm kiếm theo tên, lọc danh mục, mở chi tiết | Chỉ chiến dịch được duyệt, còn thời hạn và đang hoạt động |
| /#customer-product/1 | Xem sản phẩm, chọn mở luồng đặt trước/theo dõi theo nút trên trang, đánh dấu lưu | Yêu thích chỉ tạm thời |
| /#product/1 | Chọn phiên bản → Đặt trước ngay | Thêm vào giỏ demo khi chiến dịch hợp lệ |
| /#cart | Tăng/giảm số lượng, xóa sản phẩm, xem tổng tiền, sang checkout | Lưu demo; không checkout nếu có chiến dịch không hợp lệ |
| /#checkout | Xem liên hệ/địa chỉ mẫu, đồng ý điều kiện đặt trước, xác nhận | Tạo đơn và payment demo, tăng lượng đặt, xóa giỏ; không có thu tiền thật |
| /#confirmation | Xem nhóm đơn vừa tạo và tổng tiền | Có thể phục hồi nhóm mới nhất sau refresh |
| /#orders | Xem đơn của khách hiện tại, mở theo dõi | Có tìm mã/tên, lọc trạng thái và phân trang 10 đơn |
| /#customer-tracking/1 hoặc /#tracking | Xem trạng thái chiến dịch, đơn hàng, sản xuất | Nút Theo dõi ở bảng đơn mở đúng mã đơn qua /#customer-order/{id} |
| /#profile | Sửa tên, email liên hệ, tùy chọn email rồi lưu | Lưu demo; không đổi credential đăng nhập |
| /#notifications | Xem thông báo suy ra từ state | Chưa có đánh dấu đã đọc/backend push |
| /#wishlist | Xem trang yêu thích | Danh sách trang này vẫn cố định; chưa đồng bộ đầy đủ với nút lưu |
| /#account | Xem tổng quan | Một số bảng/tác vụ chung vẫn minh họa |

Thông tin liên hệ/địa chỉ checkout hiện là form minh họa, chưa lưu vào đơn. Không có nút hủy đơn khách hàng hoàn chỉnh, xác nhận nhận hàng hay đánh giá sản phẩm.

## 4. Người bán

| Trang | Thao tác | Điều kiện / giới hạn |
|---|---|---|
| /#seller | Xem tổng quan, mở tạo sản phẩm/chiến dịch | Có KPI từ state và phần biểu đồ minh họa |
| /#seller-products | Xem sản phẩm của mình, thêm sản phẩm | Chưa có sửa/xóa/upload ảnh thật |
| /#seller-product-new | Đi qua form nhiều bước; nhập thông tin và lưu | Sản phẩm gắn seller đăng nhập, lưu demo; ảnh mới dùng ảnh mẫu |
| /#seller-campaign-new | Chọn sản phẩm mình sở hữu, nhập nội dung/giá/MOQ/mục tiêu/ngày, qua các bước, lưu nháp hoặc gửi duyệt | Lưu demo, kiểm tra dữ liệu ở wizard |
| /#seller-campaigns | Xem chiến dịch của mình, kích hoạt, kết thúc, hủy, tạo lệnh sản xuất | Các nút xuất hiện theo trạng thái |
| /#seller-orders | Mở trang đơn và chi tiết | Bảng chung/chi tiết vẫn có phần minh họa, chưa quản lý đơn đầy đủ |
| /#seller-ai, /#seller-success | Chọn chiến dịch, yêu cầu dự báo, xem lịch sử/đồ thị/số lượng/xác suất | Kết quả DEMO, không phải model đã train; có giới hạn lượt theo UI |
| /#seller-production | Xem chiến dịch thành công, tạo lệnh sản xuất, xem tiến độ | Chỉ chiến dịch thành công; không tạo trùng lệnh |
| /#seller-settings | Cập nhật thông tin liên hệ và tùy chọn email | Lưu demo; chưa đổi mật khẩu/cài đặt cửa hàng đầy đủ |
| /#seller-analytics, /#seller-finance | Xem biểu đồ và chỉ số | Hiện chủ yếu là số cố định, chưa báo cáo thật |

Vòng đời: gửi duyệt → admin duyệt → đã lên lịch/đang hoạt động → hết hạn xét tổng lượng so với MOQ → thành công hoặc không đạt MOQ. Kích hoạt thủ công cần đến ngày bắt đầu. Kết thúc thủ công cần đến hạn theo đồng hồ demo. Hủy chiến dịch chuyển đơn liên quan sang chờ hoàn tiền. Chưa có nút sửa/gửi lại bản nháp hoặc chiến dịch bị từ chối đầy đủ. Trang chi tiết chiến dịch/đơn chung chưa phải màn hình chi tiết riêng từng bản ghi.

## 5. Quản trị viên

| Trang | Thao tác | Mức hỗ trợ |
|---|---|---|
| /#admin | Xem thống kê demo và các yêu cầu chờ duyệt | Có dữ liệu dùng chung |
| /#admin-campaigns | Duyệt chiến dịch hoặc từ chối kèm lý do | Lưu demo; sau duyệt trạng thái tùy ngày bắt đầu |
| /#admin-transactions | Xem payment, bấm Xác nhận đã hoàn với giao dịch đang hoàn tiền | Đồng bộ trạng thái đơn/payment demo; không chuyển tiền thật |
| /#admin-users | Mở trang quản lý người dùng | Bảng mẫu; chưa khóa/mở/sửa tài khoản thật |
| /#admin-sellers | Mở trang xác minh người bán | Chưa có xử lý hồ sơ thật |
| /#admin-disputes | Mở trang khiếu nại | Chưa xử lý tranh chấp thật |
| /#admin-analytics | Xem phân tích | Chỉ số/biểu đồ minh họa |
| /#admin-settings | Mở cài đặt và sửa thông tin liên hệ admin | Chỉ phần hồ sơ dùng chung lưu được; chưa CRUD danh mục/cấu hình nền tảng |

## 6. Đối tác sản xuất

| Trang | Thao tác | Giới hạn |
|---|---|---|
| /#partner, /#partner-production | Xem lệnh được gán, số lượng, ngày dự kiến, tiến độ; Cập nhật +10%; Chuyển sang vận chuyển | UI hiện chọn lệnh đầu tiên được gán, chưa có bộ chọn mọi lệnh |
| /#partner-requests | Mở danh sách yêu cầu | Bảng chung còn minh họa |
| /#partner-profile | Sửa thông tin liên hệ, tùy chọn email | Lưu demo |

Với lệnh mới: lần cập nhật đầu tiếp nhận, lần tiếp theo chuyển sang sản xuất. Trạng thái cập nhật ở store phản ánh sang đơn và màn hình người bán. Nút chuyển sang vận chuyển chỉ có hiệu lực khi đang sản xuất; hiện nút này đồng thời đặt tiến độ 100%. UI chưa có thao tác đánh dấu Đã giao/Hoàn thành, cập nhật ngày dự kiến hoặc ghi chú từng công đoạn.

## 7. Trợ giúp cho cả bốn vai trò

Đường dẫn `/#customer-help`, `/#seller-help`, `/#admin-help`, `/#partner-help`: tìm nội dung FAQ, chọn chủ đề và mở câu trả lời.

Đường dẫn tương ứng đuôi `-guide`: đọc các bước hướng dẫn.

Đường dẫn tương ứng đuôi `-support`: bấm từng ticket để xem lịch sử riêng, tạo hội thoại, gửi câu hỏi cho trợ lý AI Ollama, đánh dấu đã giải quyết/mở lại. Hội thoại lưu theo tài khoản trên trình duyệt. Chưa gửi ticket cho nhân viên thật. Cách chạy backend và model tại [HO_TRO_AI.md](HO_TRO_AI.md).

## 8. Công cụ demo và dữ liệu

- Chuyển vai trò để kiểm tra trạng thái dùng chung trong cùng một trình duyệt/origin.
- **Reset demo** đưa localStorage về bộ mẫu, mất thay đổi demo hiện tại; dùng cửa sổ ẩn danh nếu muốn giữ bản cũ.
- **Đồng hồ mô phỏng**: trên màn hình đủ rộng (xl), chọn ngày rồi Áp dụng; có nút quay về thời gian thật. Dùng để thử chiến dịch bắt đầu/hết hạn. Khi dùng thời gian thật, store kiểm tra vòng đời mỗi phút.
- Tải lại trang để kiểm tra sản phẩm, chiến dịch, giỏ, đơn, payment, tiến độ và profile đã lưu demo.
- Dữ liệu không đồng bộ qua máy/trình duyệt khác và không bảo đảm đồng bộ giữa các tab đang mở; nên dùng một tab chuyển vai trò.
- SQL seed phục vụ phát triển backend; frontend chưa gọi database. Không có thanh toán thật, email thật hay AI đã train.

## 9. Kịch bản thử với bộ mẫu mới

1. **Mua hàng:** đăng nhập customer → mở `/#product/1` → chọn phiên bản → Đặt trước ngay → giỏ → tăng/giảm số lượng → checkout → đồng ý điều kiện → xác nhận → mở đơn hàng. Ghi nhận lượng đặt Aurora tăng đúng số sản phẩm.
2. **Phê duyệt:** đăng nhập admin → Duyệt chiến dịch → duyệt Nomad (`CD-2415`) → trạng thái Đã lên lịch vì bắt đầu sau 2 ngày. Dùng đồng hồ demo đến ngày bắt đầu để xem mở bán.
3. **Tạo mới:** đăng nhập seller Aurora → thêm sản phẩm → tạo chiến dịch cho sản phẩm đó → gửi duyệt → chuyển admin duyệt → trở lại customer kiểm tra chiến dịch nếu đang trong thời hạn.
4. **Sản xuất:** seller Aurora → Sản xuất → chọn `CD-SAMPLE-SUCCESS` → tạo lệnh. Muốn thử tiếp nhận lệnh mới ở UI partner hiện chỉ chọn lệnh đầu tiên: lệnh mới được thêm đầu danh sách nên chuyển partner sau khi tạo. Cập nhật +10% hai lần rồi chuyển vận chuyển; trở lại customer kiểm tra đơn keycap.
5. **Hoàn tiền:** admin → Giao dịch → tìm payment đang hoàn tiền của `CD-SAMPLE-REFUND` hoặc Pico → Xác nhận đã hoàn → customer xem trạng thái Đã hoàn tiền.
6. **Tiến độ có sẵn:** trước khi tạo lệnh mới, đăng nhập partner → thấy lệnh artbook ở 62% → cập nhật → customer xem đơn artbook thay đổi.
7. **AI demo:** seller Aurora → Dự báo AI → chọn chiến dịch Aurora đang chạy → tạo dự báo → xem lịch sử; ghi rõ DEMO trong báo cáo.
8. **Phân quyền:** đăng nhập customer rồi mở `/#admin` → bị chặn. Đây chỉ là kiểm tra UI, chưa chứng minh bảo mật API.

Nếu đã đổi đồng hồ demo để thử hết hạn, trả về thời gian thật hoặc Reset demo trước kịch bản mua hàng tiếp theo.

## Cập nhật phản hồi: đơn lặp, ticket và 200 chiến dịch

Bộ mẫu mới có 200 chiến dịch đang chạy và 5 đơn cá nhân khác sản phẩm, tự cập nhật fixture cũ nhưng giữ đơn người dùng tạo. Marketplace có phân trang 24 bản ghi. Hỏi đáp hỗ trợ là AI Ollama thật; dự báo nhu cầu seller vẫn là DEMO. Đã bổ sung mở đúng từng mã đơn và ticket riêng. Xem [HO_TRO_AI.md](HO_TRO_AI.md).
