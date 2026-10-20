# Hộp thư hỗ trợ và AI PREORA

## Chạy trên Windows

Nhấp đúp `START_PREORA_WITH_AI.bat`: bật frontend và backend nếu cổng 8000 chưa được dùng. Launcher không dừng tiến trình đã có. Nếu cổng 8000 đang chạy ứng dụng khác, hãy chuyển ứng dụng đó sang cổng khác trước khi mở PREORA.

Ollama phải đang chạy. Máy đã có model `qwen3:8b`, dùng cùng API Ollama như DADN. PREORA không sửa code hoặc cấu hình DADN. Nếu cần model khác, cấu hình trong `.env` ở repo root:

```dotenv
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

Khi chạy backend Docker, URL mặc định là `http://host.docker.internal:11434` để truy cập Ollama trên máy host; có thể đổi qua `OLLAMA_DOCKER_URL`. Khi chạy Python local thì dùng `OLLAMA_URL`.

Trong terminal WSL, có thể mở launcher Windows:

```bash
cmd.exe /c START_PREORA_WITH_AI.bat
```

Nếu muốn chạy từng phần trong PowerShell:

```powershell
# Terminal 1, repo root
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Terminal 2, repo root
npm.cmd --prefix frontend run dev
```

## Sử dụng

Đăng nhập rồi mở **Hộp thư hỗ trợ**. Bấm từng ticket bên trái để xem đúng lịch sử. Mở **Hỏi trợ lý PREORA** hoặc tạo hội thoại mới. Có thể hỏi MOQ, cách đặt trước, trạng thái đơn hiện tại, hoàn tiền demo và các thao tác seller/admin/partner.

Trợ lý sử dụng model ngôn ngữ Ollama, hướng dẫn nghiệp vụ và phần dữ liệu demo của tài khoản đang mở. Không cần train mô hình mới cho hỏi đáp. Đây là phần riêng với dự báo nhu cầu của seller (vẫn DEMO).

Hội thoại lưu localStorage theo user, có thể đánh dấu đã giải quyết và mở lại. Không gửi ticket cho nhân viên thật. Chỉ gửi đơn của tài khoản hiện tại và bản tóm tắt chiến dịch liên quan tới backend, không gửi danh sách người dùng hoặc đơn của khách khác. Backend chưa có xác thực nghiệp vụ nên ngữ cảnh chỉ là dữ liệu client demo, không dùng làm bằng chứng quyền truy cập production.

Nếu Ollama/backend tắt, UI báo lỗi và có nút thử lại, không tạo câu trả lời giả. Có thời gian chờ tối đa, trạng thái đang trả lời và khóa gửi trùng trong khi chờ. Trợ lý chỉ hỏi đáp, không có công cụ thay đổi đơn/thanh toán/duyệt chiến dịch. Nội dung AI có thể sai và không thay thế trạng thái trên màn hình.

## Dữ liệu mẫu sau sửa

200 chiến dịch đang hoạt động, tổng 210 chiến dịch và 210 sản phẩm; có tìm kiếm, lọc, phân trang 24 chiến dịch/trang. 100 khách mô phỏng bổ sung nhận phần lớn đơn mẫu. Tài khoản customer demo chỉ có 5 đơn mẫu của 5 sản phẩm khác nhau.

Bản cập nhật tự thay bộ fixture cũ một lần, giữ đơn do người dùng tạo (ID không mang tiền tố mẫu), giữ session và giỏ. Các sửa đổi trên chính bản ghi mẫu có thể được khởi tạo lại; dữ liệu sản phẩm/chiến dịch người dùng thêm mới được giữ theo ID. Không cần Reset demo để khắc phục hàng loạt đơn mẫu cũ. Đồng hồ mô phỏng vẫn có thể làm chiến dịch hết hạn; quay về thời gian thật để kiểm tra 200 chiến dịch đang mở.

Các đơn người dùng tự tạo vẫn được giữ riêng, không gộp hoặc xóa vì trùng sản phẩm. Trang đơn có tìm mã/tên, lọc trạng thái, 10 đơn/trang. Bấm tên hoặc Theo dõi mở đúng mã đơn, kể cả nhiều đơn chung sản phẩm.
