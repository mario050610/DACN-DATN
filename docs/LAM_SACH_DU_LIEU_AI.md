# Làm sạch dữ liệu nghiên cứu

Chạy `CLEAN_AI_DATA.bat` ở thư mục gốc. Lệnh này chỉ làm sạch, không huấn luyện lại mô hình. Không chạy hai phiên cùng lúc. Khi tải thêm dữ liệu, chạy lại để tạo lại bộ sạch.

Đầu ra: `ai-service/data/processed/cleaned/`.

- `webrobots.sqlite3`: bảng `observations` giữ từng bản chụp theo tháng, khóa `(snapshot, campaign_id)`; view `latest_projects` lấy bản mới nhất có dữ liệu hợp lệ của từng dự án.
- `webrobots_latest.csv`: một dòng mỗi dự án, có cột nguồn và số dòng để truy ngược file raw.
- `webrobots_completed.csv`: bản mới nhất của các dự án successful/failed.
- `vt_projects.csv`, `vt_history.csv`: metadata và lịch sử ngày của Virginia Tech; kiểm tra khóa liên kết.
- `vt_history_unmatched.csv`: lịch sử hợp lệ nhưng thiếu metadata dự án tương ứng; giữ riêng, không ghép vào tập có metadata.
- `retail_sales.csv`, `retail_returns.csv`: bán hàng dương và hoàn/hủy riêng; không trừ hoàn hàng vào ngày bán không xác định. Không xuất Customer ID.
- `cleaning_report.json`: số dòng đầu vào/đầu ra/loại/trùng, thống kê từng bản chụp và metadata file nguồn.

Ngày Web Robots chuẩn hóa UTC, số tiền giữ nguyên đơn vị tiền tệ gốc. Bản ghi thiếu/không hợp lệ không được điền bằng dữ liệu giả. Những bản ghi trùng trong cùng bản chụp giữ dòng hợp lệ đầu tiên theo thứ tự tên file; lịch sử giữa các tháng được giữ lại. Trùng lịch sử Virginia Tech theo dự án/ngày giữ dòng cuối. Retail loại dòng trùng toàn bộ trường gốc; giao dịch thực tế giống hệt nhau có thể bị gộp theo giả định này. Không cắt bỏ giá trị lớn chỉ vì là ngoại lệ.

Đây là dữ liệu nghiên cứu: pledged là tiền huy động, backers là người ủng hộ, không phải số lượng sản phẩm. Nguồn này thiếu các trường views/clicks/cart/MOQ/finalQuantity cần cho chế độ huấn luyện lịch sử PREORA đầy đủ. Không tải trực tiếp các CSV này vào biểu mẫu lịch sử PREORA nếu chưa có dữ liệu nghiệp vụ tương ứng.

Việc làm sạch không thay thế mô hình hiện đang chạy và không tạo lại các file `*_samples.csv` cũ. Dữ liệu raw được giữ nguyên để kiểm tra lại. Bộ xử lý Web Robots dùng từng khối 20.000 dòng và SQLite để không ghép toàn bộ gần 20 GB vào RAM.

Kiểm tra lại đầu ra: `ai-service\.venv\Scripts\python.exe -X utf8 ai-service/training/verify_cleaned_data.py`.

## Xử lý ngày thiếu

Pipeline làm sạch tự chạy bước bổ sung lịch ngày. Chạy riêng, không đọc lại 20 GB raw:

`ai-service\.venv\Scripts\python.exe -X utf8 ai-service/training/fill_daily_gaps.py`

- `vt_history_daily.csv`: lịch liên tục **trong khoảng quan sát đầu–cuối của từng chiến dịch**, không giả định đã có dữ liệu đủ vòng đời. `is_observed` phân biệt dữ liệu thật; ngày bổ sung dùng giá trị tích lũy trước đó. `source_observed_date`, `observation_age_days`, `fill_method` cho phép truy nguồn. Không nội suy từ tương lai. `training_eligible=false` khi dữ liệu cũ hơn 2 ngày. Không dùng chênh lệch ngày đã điền như tăng trưởng thật; khi train phải tính tuổi từ ngày quan sát gốc.
- `retail_daily.csv`: tổng bán hàng theo ngày toàn nguồn (GBP, chưa trừ hoàn hàng). Ngày không có dòng bán hợp lệ vẫn hiện trên lịch nhưng quantity/revenue để trống, không tự điền 0. Đây không phải lịch từng sản phẩm.
- `daily_gap_report.json`: số ngày bổ sung và chính sách xử lý.

Web Robots vẫn là bản chụp thưa theo tháng; không chuyển thành dữ liệu ngày giả. Các file sạch gốc, các tập train cũ và mô hình hiện tại không bị thay thế bởi bước bổ sung ngày.
