# Training pipeline — TODO

Nguồn tham khảo: Virginia Tech crowdfunding histories (tiến độ người ủng hộ), Kickstarter campaign metadata, và dữ liệu pre-order thực tế PREORA sau này.

- Mô hình demand forecasting: dự báo **số lượng sản phẩm đặt trước cuối kỳ**.
- Mô hình success: dự báo **xác suất tổng số lượng hợp lệ ≥ MOQ**.
- Dữ liệu Kickstarter chỉ mang tính **proxy**; người ủng hộ và mục tiêu gọi vốn bằng tiền không tương đương số sản phẩm/MOQ.
- Tránh leakage: feature tại thời điểm dự báo không được dùng kết quả cuối kỳ.
- Không ghi dữ liệu nhận dạng cá nhân nhạy cảm vào tập huấn luyện.

Chưa cung cấp tập dữ liệu hoặc model nào trong template.
