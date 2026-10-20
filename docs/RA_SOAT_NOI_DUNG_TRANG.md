# Rà soát nội dung trang PREORA — 16/10/2026

## Nguyên nhân và thay đổi

Các route quản trị và một số dashboard trước đây chỉ thay tiêu đề nhưng dùng lại bảng `DataTable` sinh các dòng `REC-2026-*` từ danh sách sản phẩm cũ. Các trang phân tích/tài chính dùng cùng KPI cố định và biểu đồ minh họa; trang liên hệ/điều khoản/quyền riêng tư dùng lại FAQ.

Đã bỏ bảng dự phòng đó và ánh xạ nội dung rõ ràng theo từng route:

| Trang | Nội dung hiện tại |
|---|---|
| Quản lý người dùng | Tên, email, vai trò, nguồn tài khoản, trạng thái 2FA; tìm kiếm, lọc và xem hồ sơ. API backend chỉ cho admin đọc metadata tài khoản, không trả bí mật bảo mật. Hồ sơ mẫu được đánh dấu riêng. |
| Xác minh người bán | Cửa hàng, mã hồ sơ, số chiến dịch, trạng thái xác minh; ghi nhận xét và lưu quyết định xử lý hồ sơ mẫu. Không giả lập tài liệu doanh nghiệp thật. |
| Báo cáo và khiếu nại | Khiếu nại mẫu có mã riêng, nội dung phản ánh, đơn liên quan, ưu tiên, trạng thái và lịch sử xử lý có ghi chú. |
| Phân tích người bán/quản trị | Tổng đơn, số lượng sản phẩm, giá trị đã thanh toán, xu hướng theo ngày và thống kê theo nhóm; lọc đúng phạm vi sở hữu hoặc toàn nền tảng. |
| Tài chính/giao dịch | Sổ payment của đúng các đơn trong phạm vi; tách đã thanh toán, chờ thanh toán, đang hoàn và đã hoàn. Có tìm/lọc/phân trang. |
| Tổng quan khách hàng | Chỉ đơn của tài khoản hiện tại, số món đã lưu/giỏ, mã chưa dùng và đường dẫn tới đơn gần đây. |
| Yêu cầu/tiến độ đối tác | Chỉ lệnh được phân công; chọn đúng lệnh, tiếp nhận, bắt đầu sản xuất, cập nhật tiến độ, vận chuyển khi đã đạt 100% và hoàn thành. |
| Hồ sơ đối tác/cửa hàng | Thông tin doanh nghiệp, liên hệ, lĩnh vực; đối tác có năng lực sản phẩm/tháng. Lưu riêng theo ID tài khoản; bảo mật đăng nhập vẫn dùng API thật hiện có. |
| Danh mục và cài đặt | Sáu nhóm sản phẩm với số lượng hiện có, tùy chọn nhắc việc quản trị mẫu và phần bảo mật. |
| Thông báo | Nội dung liên quan đến vai trò/tài khoản, bấm mở đúng đơn, sản xuất hoặc trang duyệt. Bỏ số huy hiệu cố định. |
| Sản phẩm/đơn/chiến dịch người bán | Bảng đúng loại dữ liệu, có tìm kiếm/phân trang và chi tiết. Trang chiến dịch không còn giới hạn tám dòng khi bấm Xem tất cả. |
| Liên hệ, trợ giúp, cách hoạt động, điều khoản, quyền riêng tư | Nội dung riêng đúng mục đích từng trang; không dùng chung một bộ FAQ. Cửa hàng công khai lấy đúng người bán và sản phẩm hiện tại. |

Các route sản phẩm không tồn tại không còn tự hiển thị sản phẩm mặc định. Tên người bán và trạng thái chiến dịch lấy từ bản ghi tương ứng; thao tác lưu/mua chỉ hiển thị cho vai trò phù hợp. Trang xác nhận đọc receipt từ dữ liệu mua sắm của tài khoản và giữ khung dashboard.

## Kiểm chứng

- Edge headless: **52 trang** trong menu bốn vai trò và trang công khai; **22 đường dẫn bổ sung** gồm chi tiết, thông báo, tạo mới, checkout/xác nhận, theo dõi, đăng nhập/đăng ký/khôi phục và sản phẩm không tồn tại.
- Đã thử tìm người dùng, mở hồ sơ, lưu đánh giá người bán và refresh; lưu trạng thái/ghi chú khiếu nại và đọc lại lịch sử sau refresh; lưu lĩnh vực/năng lực đối tác và đọc lại.
- Kiểm tra layout 390px cho cả bốn vai trò, không tràn ngang toàn trang. Bảng rộng cuộn ngang trong vùng bảng.
- Kiểm tra tài khoản khách hàng bị chặn ở trang quản trị; tiến độ sản xuất chưa đủ 100% không được chuyển vận chuyển. Không ghi nhận lỗi JavaScript runtime trong lượt kiểm tra đạt.
- Build TypeScript/Vite đạt. Backend **25 test đạt**, gồm test mới cho API danh sách người dùng: 401 khi chưa đăng nhập, 403 cho customer/seller, admin đọc được và không lộ password/TOTP/recovery/session.
- Giữ 300 sản phẩm đang mở, bốn chủ đề bổ sung mỗi chủ đề 20 sản phẩm; không đổi ID hay dữ liệu giỏ hàng.

## Phạm vi lưu trữ

Thông tin xác thực và mua sắm tiếp tục lưu backend theo tài khoản. Xác minh hồ sơ mẫu, khiếu nại mẫu, hồ sơ doanh nghiệp và tùy chọn quản trị trong thay đổi này lưu trên trình duyệt. Các màn hình ghi rõ giới hạn đó; chưa triển khai quy trình xác minh pháp lý, xử lý tranh chấp hay đối soát tiền thật. Báo cáo tài chính/phân tích dựa trên dữ liệu demo và các đơn hiện được tải vào store, không phải số liệu tài chính vận hành thực tế.
