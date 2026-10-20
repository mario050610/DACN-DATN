# PREORA — Ánh xạ nguồn dữ liệu

Đối chiếu code ngày 19/10/2026. Ba loại thông tin cần tách: **dữ liệu huấn luyện**, **snapshot chiến dịch được dự báo**, **chính sách lập kế hoạch**. Input có đủ cột không chứng minh đã được quan sát thực tế.

## Vai trò từng nguồn

| Nguồn | Có gì | Dùng ở đâu | Không được suy diễn |
|---|---|---|---|
| UCI Online Retail II | InvoiceDate, Quantity, Price, StockCode; giao dịch/hoàn hàng bán lẻ | `retail_next7`: lượng bán dương được ghi nhận trong 7 ngày; chế độ web retail là thực nghiệm chuyển giao | Không có campaign/MOQ/hành vi; không phải nhãn finalQuantity PREORA |
| Virginia Tech | Metadata Start/End/Goal/State/category/currency, History raised/funders theo ngày | `vt_campaign_success`: thành công huy động vốn tại snapshot; ngày thiếu có cờ và source_observed_date | Goal là tiền, funders là người; không đổi thành MOQ/số sản phẩm |
| Web Robots | Snapshot Kickstarter theo các thời điểm, metadata, tiền huy động/backers/state | `webrobots_launch_success`: benchmark metadata hồi cứu; bộ sạch giữ lịch sử và latest view | Không phải lịch sử ngày liên tục; goal/category có thể đã sửa sau launch; không có views/cart của PREORA |
| Tracker PREORA | View/click và mutation favorite/cart từ khi bật ghi nhận | Hành vi snapshot được admin đọc rồi xác nhận | Tương tác với prototype không đồng nghĩa nhu cầu thị trường; số 0 không chứng minh lịch sử đầy đủ |
| Prototype trong trình duyệt | Campaign/product/counters từ mẫu hoặc do người dùng thao tác/nhập | Snapshot được chọn trên trang train | Không phải một kho lịch sử PostgreSQL đã đồng bộ đầy đủ; số lượng chiến dịch chưa tự suy ra từ mọi checkout server |
| CSV lịch sử do admin cung cấp | Nhiều campaign đã kết thúc, feature snapshot và finalQuantity | `campaign_history` sau validation | Nguồn do admin khai báo, không độc lập xác minh; không nối ngẫu nhiên các nguồn công khai |
| Lịch sử mô phỏng | Trajectory hành vi/đơn và nhãn được generator tạo | `campaign_demo`; regression/classifier fit thật trên data giả lập | Không gọi các metric demo là chất lượng trên thị trường thực |
| Retailrocket | Chưa nằm trong ba pipeline nghiên cứu hiện tại | Chỉ là nguồn dự kiến nếu báo cáo còn đề cập | Không ghi đã làm sạch/train hoặc ghép với Kickstarter khi chưa có bằng chứng và khóa liên kết |

## 16 feature của full campaign model

| Feature | Snapshot PREORA hiện tại | UCI / Kickstarter tương ứng | Quy tắc |
|---|---|---|---|
| durationDays | endDate − startDate | Kickstarter có launch/deadline; UCI không có campaign | Số ngày, không lấy thông tin tương lai ngoài lịch đã biết |
| daysRemaining | endDate − currentDate | Có thể tính với snapshot Kickstarter hợp lệ | Ngày mô phỏng trên UI phải được nhận diện |
| elapsedDays | currentDate − startDate + 1 | Có thể tính khi biết snapshot time | Từ 1 ngày đã dự báo được |
| moq | Campaign prototype/admin xác nhận | Không có MOQ sản phẩm; goal Kickstarter là tiền | Sản phẩm, không tự gán funding goal |
| target | Campaign prototype/admin xác nhận | Không có target quantity tương đương | Sản phẩm; tách với MOQ |
| price | Campaign/product snapshot | UCI có đơn giá; Kickstarter goal không phải giá sản phẩm | Full PREORA dùng VND; không trộn GBP/currency crowdfunding |
| category | Danh mục sản phẩm | Kickstarter có category; UCI không có taxonomy tương đương sẵn | Chuẩn hóa tên theo contract |
| productType | UI gợi ý theo category, admin sửa/xác nhận | Không có ánh xạ đồng nhất sẵn | Gợi ý không phải ground truth |
| views | Tracker hoặc nhập tay | Ba nguồn train hiện tại không có views PREORA | `source=observed` chỉ nghĩa được tracker ghi nhận; không mặc định toàn kỳ |
| clicks | Tracker hoặc nhập tay | Không có clicks PREORA | Lượt sự kiện, không phải số người duy nhất |
| favorites | Mutation favorite hoặc nhập tay | Không ánh xạ backers thành favorites | Số sự kiện được ghi nhận, không phải snapshot số người đang yêu thích |
| addToCart | Mutation thêm giỏ hoặc nhập tay | Không ánh xạ backers thành cart | Số sự kiện, không phải số lượng sản phẩm còn trong giỏ |
| currentOrders | Counter campaign prototype, admin xác nhận với CSV ngày | UCI quantity không gắn campaign; Kickstarter backers không phải quantity | Tổng sản phẩm hợp lệ sau hủy, không phải số hóa đơn |
| ordersPerDay | Tổng quantity 7 ngày gần nhất / min(7, elapsedDays) | UCI có thể tạo rolling sales; funders vẫn là đơn vị khác | Chỉ dùng lịch sử đến snapshot, không dùng số lượng cuối kỳ |
| growthRate | So sánh tổng 7 ngày gần nhất với 7 ngày trước | Có thể tạo theo đơn vị nguồn riêng, không coi tương đương | Khi elapsedDays < 14 dùng 0 kèm ghi chú chưa đủ hai tuần; không phải tăng trưởng đã đo |
| cancellationRate | cancelledQuantity / (currentOrders + cancelledQuantity) | Hoàn hàng UCI không tương đương hủy pre-order; không tự suy từ state crowdfunding | cancelledQuantity hiện được admin nhập/xác nhận, không mặc định đã tổng hợp từ mọi đơn server |

Dataset `campaign_history` nhận các feature snapshot theo CSV contract; feature lịch sử do nguồn cung cấp, một số tỉ lệ không tự tái dựng được nếu thiếu event/raw history. `campaign_demo` tạo các giá trị qua mô phỏng. Không điền hành vi giả vào data công khai rồi gọi là dữ liệu thật.

## Nhãn, đầu ra và chính sách

- Full regression: `finalQuantity` = tổng số lượng sản phẩm hợp lệ cuối chiến dịch; classifier: `finalQuantity >= moq`.
- Snapshot đang chạy không cung cấp finalQuantity để model suy luận. Nhãn chỉ thuộc chiến dịch đã kết thúc trong tập train/evaluate.
- Khoảng nhu cầu có mức tham khảo danh nghĩa; successProbability là xác suất đạt MOQ, không phải confidenceScore chung. Kết quả phải gắn nguồn dataset/model version.
- `batchSize`, `capacity`, `safetyBuffer`, `minimumProbability` là chính sách admin nhập để lập khoảng sản xuất, không phải feature học nhu cầu và không tự phát lệnh sản xuất.
- Field/hành vi nhập tay được ghi `source=manual`; không tự xác minh đúng lịch sử. Dữ liệu tracker vẫn có thể là lượt thao tác demo.

## Ngày thiếu và đánh giá

Virginia Tech có `is_observed`, `source_observed_date`, `observation_age_days`; điền tiến từ quan sát trước trong khoảng đã ghi nhận, không nội suy từ tương lai. Tuổi dữ liệu phải tính từ quan sát thật. UCI có ngày không có bán hợp lệ chưa biết là đóng cửa hay thiếu; target nghiên cứu là recorded sales, không phải latent demand. Web Robots giữ bản chụp thưa, không giả dữ liệu ngày.

Chia tập theo thời gian/campaign; fit preprocessing chỉ trên train, chọn model trên validation; calibration/test giữ riêng khi pipeline có sử dụng. Metric từng nguồn không thay thế kiểm chứng trên PREORA. Chi tiết và số dòng thực tế nằm ở `data/processed/cleaned/cleaning_report.json`, `daily_gap_report.json` và `training/reports/`.

## Đơn hàng mẫu theo ngày

Campaign mẫu có lịch sử phân bổ theo ngày và profile tăng tự động; PR-SIM là đơn/phần thanh toán mô phỏng. Admin có nút tiến ngày và bật/tắt trên trang train. Đây không phải dữ liệu thị trường; xem [cơ chế và giới hạn](MO_PHONG_DON_HANG.md).
