# Đơn hàng, ưu đãi, tài chính và xác minh hồ sơ

## Mốc thời gian và luồng phụ
Đơn mới tạo qua checkout có timestamp riêng cho đặt trước và thanh toán mô phỏng. Khi store quan sát thay đổi trạng thái đơn, thanh toán hoặc kết quả chiến dịch, sự kiện được lưu cùng timestamp ghi nhận; hoàn tiền có mốc riêng. Timeline không suy đoán ngày thanh toán cho dữ liệu cũ thiếu mốc. Thời gian hiển thị theo Việt Nam; timestamp lưu ISO.

Chiến dịch không đạt MOQ/đã hủy dẫn sang đối soát và hoàn tiền, không tiếp tục giả định bước sản xuất. Admin → Tài chính xác nhận hoàn tiền mô phỏng; timeline khách cập nhật theo cùng đơn.

Partner → Tiến độ → Chi tiết lệnh có form điều chỉnh ngày dự kiến. Ngày mới và lý do ít nhất 10 ký tự là bắt buộc; chỉ đối tác được giao mới cập nhật được, lệnh hoàn thành không được sửa. Lịch sử giữ ngày cũ/mới, lý do và thời điểm; khách/seller/admin thấy cùng kế hoạch. Dữ liệu sản xuất/vòng đời prototype vẫn nằm trong trình duyệt, đồng bộ giữa tab cùng origin, chưa phải đồng bộ đa thiết bị.

## Tổng quan
Customer, seller, admin và partner có nhóm “Các sản phẩm nổi bật” và “Sản phẩm đang được quan tâm”. Nhóm đầu xếp theo lượng đặt hiện tại; nhóm quan tâm theo lượng đặt 7 ngày, không giả gọi đó là lượt xem. Chỉ các chiến dịch đang chạy được chọn; seller chỉ thấy của cửa hàng mình. Số liệu bộ demo có thể được mô phỏng.

## Ưu đãi
Kho có 18 mã. Giỏ hàng và checkout hiện HSD, giá trị đủ điều kiện tối thiểu, danh mục áp dụng, mức giảm/trần giảm, một mã/giao dịch và một lần/tài khoản. Nút mã đã lưu hiển thị “Hạn sử dụng còn x ngày”; dùng ngày Việt Nam. HSD bao gồm ngày ghi trên mã. Máy chủ vẫn kiểm tra lại giá, nhóm sản phẩm, số tiền, trạng thái lưu/dùng và hiệu lực khi quote/checkout; không tin số giảm từ giao diện.

## Tài chính và bản nháp thuế
Trang tài chính có lọc theo ngày đặt đơn, phân trang, các khoản đã thanh toán/chờ thanh toán/chờ hoàn/đã hoàn và CSV. Mốc thu tiền/hoàn tiền được hiển thị riêng nếu đã ghi nhận, không gán ngày đặt thay cho ngày đối soát. Các số vẫn là giao dịch mô phỏng, không phải đối soát ngân hàng.

Bản nháp thuế dùng tên khoản thuế, cơ sở và tỷ lệ do người lập nhập; không mặc định thuế suất hay xác định nghĩa vụ theo loại người bán. CSV được đánh dấu CHƯA KÊ KHAI. Đây không phải hóa đơn hoặc tờ khai nộp cơ quan thuế, cần đối chiếu dữ liệu và quy định thực tế trước khi sử dụng.

## Hồ sơ pháp lý
Seller → Hồ sơ pháp lý: tên pháp lý, MST, số đăng ký/giấy phép, người đại diện, địa chỉ, email và tài liệu PDF/PNG/JPEG tối đa 3 MB. Xác nhận nguồn tài liệu trước khi gửi. File và hồ sơ lưu trong SQLite tài khoản backend (ngoài Git); endpoint tải kiểm tra chủ tài khoản/admin và trả dạng attachment, không render nội dung file trong app.

Admin → Xác minh người bán: tải bản gốc, xem SHA-256 và đối chiếu thủ công tên/số đăng ký, MST, đại diện, khả năng đọc tài liệu và tình trạng hiệu lực. Cần nguồn/mã đối chiếu cùng nhận xét để xác minh. Có yêu cầu bổ sung/từ chối và lịch sử quyết định theo revision. Hồ sơ nộp lại làm mất hiệu lực của thao tác duyệt dùng revision cũ (409). Hash chỉ nhận diện bản file, không xác minh giấy phép thật/chữ ký; chưa có tích hợp tự xác minh với cơ quan đăng ký. Hồ sơ mẫu cũ không tự chuyển thành hồ sơ pháp lý đã xác minh.

## Trường bắt buộc
Control có `required` được đánh dấu * và dùng constraint validation của trình duyệt; dữ liệu quan trọng được kiểm tra lại trong handler/API. Các form checkout, đăng nhập/đăng ký, sản phẩm/chiến dịch, hồ sơ, kế hoạch và bản nháp thuế đều có ràng buộc tương ứng. Các giá trị số 0 hợp lệ không bị coi là thiếu.

## Kiểm tra
Từ backend: `.venv/Scripts/python.exe -m pytest tests -q`.
Từ gốc: `node scripts/test_order_events.cjs`, `node scripts/test_demo_sales.cjs`, `node scripts/test_demo_behavior.cjs`, `npm.cmd --prefix frontend run build`.
Kiểm thử trình duyệt dùng API giả lập và tài liệu TEST ONLY, không tạo giao dịch hoặc nộp tài liệu của người dùng thật.
