# Mô phỏng đơn hàng theo ngày

Cập nhật 20/10/2026. Đây là dữ liệu tổng hợp cho trải nghiệm và kiểm thử, không phải đơn hoặc nhu cầu thị trường thật.

## Cách dùng

Đăng nhập admin → Huấn luyện AI → mục **Đơn hàng thay đổi theo ngày**.

- **Tự tăng theo ngày** mặc định bật cho campaign mẫu có profile mô phỏng. Mỗi campaign có nhịp khác nhau, biến động theo ngày, cuối tuần và giai đoạn.
- **+1 ngày mô phỏng** cho phép thử ngay; tổng sản phẩm và lịch sử CSV cập nhật cùng nhau. Cần xác nhận lại input trước khi train.
- Khi dùng ngày thực, ứng dụng kiểm tra đổi ngày mỗi phút lúc đang mở; khi mở lại sẽ bù các ngày chưa sinh. Không có dịch vụ backend chạy mua hàng nền khi đóng trình duyệt.
- Tắt sẽ bỏ qua những ngày tạm dừng, không bù đơn khi bật lại.
- **Về ngày thực tế** thu hồi đơn PR-SIM thuộc những ngày tương lai. Trạng thái đóng/hoàn tiền tự động do đồng hồ có thể hoàn tác khi chưa tạo lệnh sản xuất. Thao tác nghiệp vụ thủ công không phải lịch sử undo tổng quát.
- Không lùi trước mốc snapshot gốc; không lùi qua lần đóng đã tạo lệnh sản xuất, để giữ số lượng của lệnh.

## Tính nhất quán

- Lịch sử ban đầu được phân bổ nguyên theo ngày và giữ đúng tổng; không dồn toàn bộ vào 1–2 ngày. Những ngày 0 vẫn hợp lệ nếu campaign chưa mở hoặc không có lượng mô phỏng.
- Mỗi lần tăng có đơn mẫu và payment mẫu tương ứng, ID PR-SIM theo campaign/ngày/lô. Cursor lưu ở salesSimulation; reload/cùng ngày không cộng thêm.
- Ngừng sinh sau endDate; campaign nháp/chờ duyệt/từ chối/hủy không tự có đơn. Campaign người dùng tự tạo không tự được gắn profile mô phỏng.
- Đơn shopping mới được nhập vào snapshot đồng thời tăng đúng dòng lịch sử của ngày đặt, không chỉ tăng currentOrders.
- Bản nâng dữ liệu giữ ID sản phẩm/campaign và các đơn/sản phẩm/campaign người dùng. Không cần reset trình duyệt để có mẫu mới.
- State lưu bằng định dạng compact-v1 (cột + bảng chuỗi) để thử nhiều ngày không đầy localStorage quá sớm. Bộ đọc tương thích JSON cũ. Không lưu được sẽ có cảnh báo trên trang train.
- Số liệu mô phỏng chỉ thuộc browser/origin hiện tại; không giả là đã đồng bộ mọi checkout server hoặc PostgreSQL.

## Đồng bộ và kiểm tra

- `node scripts/export_sample_data.cjs`
- `python -X utf8 scripts/generate_sample_sql.py`
- `node scripts/test_demo_sales.cjs`

Kiểm thử gồm tổng lịch sử/đơn/payment, idempotence, pause/resume, giới hạn ngày, đóng và quay lại, migration giữ đơn người dùng, codec không mất dữ liệu. Đã chạy 63 test backend cùng catalogue mới; frontend build thành công. Kiểm tra browser dùng API mock trong context riêng: tăng ngày/CSV, reload, pause, đồng hồ, quay lại ngày gốc, lưu dữ liệu dài ngày và mobile 390px. Không gửi giao dịch hoặc tạo training job thật trong kiểm thử.

## Hành vi và hủy đơn mô phỏng
Trong Quản trị → Huấn luyện AI, nguồn mặc định “Mô phỏng theo sản phẩm và ngày” tạo lượt xem, click, yêu thích, thêm giỏ và số lượng đã hủy cho mọi chiến dịch được chọn. Mỗi chiến dịch có tỷ lệ riêng, kết quả ổn định khi tải lại, thay đổi theo ngày snapshot và số lượng hiện tại; dừng tính thời gian tại ngày kết thúc. Chiến dịch chưa bắt đầu có thể có số 0 hợp lệ.

Chọn “Tracker thực tế” để đọc lượt sự kiện đã ghi nhận (không thay đổi tracker); số đã hủy cần nhập riêng từ dữ liệu thực. Chỉnh bất kỳ giá trị nào sẽ chuyển bộ đầu vào sang “Nhập tay”. Số hủy mô phỏng chỉ là feature thử nghiệm, không hủy đơn thật và không thay đổi số lượng hợp lệ hay thanh toán. Nguồn demo được gửi cùng yêu cầu huấn luyện để kết quả cảnh báo đúng nguồn dữ liệu. Các giá trị này không phải dữ liệu thị trường đã thu thập.

Kiểm tra bộ sinh: `node scripts/test_demo_behavior.cjs`.
