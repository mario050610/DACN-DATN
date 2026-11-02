# Model huấn luyện và menu tài khoản

## Chọn model
Người bán → Dự báo AI, hoặc Quản trị viên → Huấn luyện AI: tại “Model huấn luyện”, chọn HistGradientBoosting, Random Forest hoặc Extra Trees trước khi xác nhận lịch sử và bấm bắt đầu. Chế độ đầy đủ train cả regressor nhu cầu cuối kỳ và classifier đạt MOQ theo họ thuật toán đã chọn; chế độ UCI train regressor bán lẻ. Worker thử hai cấu hình số lá, chọn bằng validation, hiệu chỉnh bằng calibration và đánh giá bằng test như trước. Không tự kết luận model nào tốt nhất khi chưa đọc chỉ số trên dữ liệu tương ứng.

Lựa chọn `modelAlgorithm` được allowlist trong API, lưu cùng snapshot, artifact và kết quả; yêu cầu cũ không truyền trường này mặc định HistGradientBoosting. Phiên đang chạy khóa bộ chọn. Tên model hiện trong tiến trình/kết quả.

## Tài khoản
Bấm vùng tên/avatar ở góc phải để mở menu:
- Hồ sơ cá nhân → trang thông tin của tài khoản đang đăng nhập.
- Cài đặt và bảo mật → trang cài đặt đúng vai trò (seller/admin dùng trang cài đặt hiện có; customer/partner có trang bảo mật riêng).
- Cá nhân hóa → giao diện sáng/tối, cỡ chữ, giảm chuyển động; seller/admin có model mặc định.
- Đăng xuất → gọi API đăng xuất và trở về trang đăng nhập; nếu API lỗi hiển thị lỗi, không giả báo đã thoát.

Menu đóng khi bấm ngoài, nhấn Escape hoặc điều hướng. Hỗ trợ mở bằng phím mũi tên, chuyển mục bằng mũi tên/Home/End. Các route hồ sơ/cá nhân hóa/cài đặt được kiểm tra đúng vai trò.

Cỡ chữ, giảm chuyển động và model mặc định lưu bằng `preora-preferences-<userId>` trên trình duyệt, không phải cấu hình của seller khác; chế độ sáng/tối vẫn là tùy chọn giao diện của thiết bị. Thay model mặc định không khởi chạy job hoặc sửa kết quả cũ. Hồ sơ hiển thị vẫn thuộc dữ liệu prototype; mật khẩu/2FA dùng backend như trước.

## Kiểm chứng
- Backend: từ backend chạy `.venv/Scripts/python.exe -m pytest tests -q`.
- ML: từ thư mục gốc chạy `ai-service/.venv/Scripts/python.exe -m pytest ai-service/training/test_model_algorithms.py ai-service/training/test_full_campaign.py -q`.
- Integration ML dùng dữ liệu mô phỏng và cache bán lẻ tổng hợp trong thư mục kiểm thử, fit/lưu/load/dự đoán thật với từng thuật toán. Không ghi đè mô hình đang sử dụng.
