# PREORA demo trên Render

## Trạng thái và chi phí

Cấu hình triển khai nằm trong `render.yaml` và `Dockerfile` ở thư mục gốc.
Đây là bản chuẩn bị triển khai, không phải bằng chứng đã có website live.

Link bắt đầu triển khai:

https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmario050610%2FDACN-DATN

Blueprint yêu cầu **web service có phí, 1 CPU / 2 GB RAM (`1c-2g`) và ổ lưu 5 GB**.
Xem tổng chi phí hiện tại trong Render trước khi xác nhận. Việc đưa file này lên GitHub
không tạo tài nguyên và không tự đăng ký gói trả phí. Không chọn Free cho cấu hình này:
Free ngủ khi không có truy cập và không hỗ trợ persistent disk.

## Các bước của chủ tài khoản

1. Đăng ký/đăng nhập Render bằng tài khoản của bạn.
2. Mở link triển khai trên; nếu repo private, cấp Render quyền đọc riêng repo DACN-DATN.
3. Kiểm tra service `preora-demo`, region Singapore, compute `1c-2g`, disk 5 GB.
4. Xem giá, thêm phương thức thanh toán nếu Render yêu cầu và tự xác nhận triển khai.
5. Chờ build/deploy thành công; sao chép URL chính thức trong dashboard.

URL dự kiến có dạng `https://preora-demo.onrender.com`. Nếu tên đã được sử dụng,
Render có thể cấp tên khác. Đây chưa phải link live được xác minh. Tên miền mặc định
của Render không có chữ `chatgpt`. Có thể gắn domain riêng sau này.

`RENDER_EXTERNAL_URL` do Render cấp sẽ được thêm vào danh sách origin tin cậy,
nên auth dùng cookie HTTPS cùng domain và không cần mở CORS cho mọi nguồn.
Nếu gắn domain riêng, đặt `PUBLIC_ORIGIN=https://ten-mien-cua-ban` và redeploy.

## Thành phần chạy

- Docker build React/TypeScript/Vite, sau đó FastAPI phục vụ cả giao diện lẫn `/api`.
- Worker AI dùng Python virtualenv trong image, chạy dưới tiến trình con như luồng local.
- Một API worker, một instance; giữ cơ chế khóa job và revision của SQLite hiện tại.
- Health check: `/api/health`; Render tự cấp HTTPS và biến `PORT`.
- `autoDeployTrigger: off`: cập nhật GitHub chưa tự triển khai lại; chọn Manual Deploy
  trong dashboard khi cần xuất bản phiên bản mới.

## Dữ liệu bền vững

| Nội dung | Vị trí trên persistent disk |
|---|---|
| Tài khoản, phiên đăng nhập, hồ sơ, đơn hàng, vòng đời, ảnh upload, xác minh | `/var/data/accounts.sqlite3` |
| Phiên train, dataset lịch sử upload, model/kết quả/log theo job và tracker | `/var/data/ai-training/` |

Container không chứa `.env`, database local, giấy tờ upload, raw dataset hay model cũ.
Lần đầu chạy tạo database demo mới từ seed có sẵn; không sao chép database trên máy.
Không xóa disk khi redeploy. Sao lưu dữ liệu bằng SQLite online backup và sao lưu thư mục
training trước các thay đổi lớn; code migration không thay thế cho bản sao lưu.

## Tài khoản và AI demo

Tài khoản mẫu: `customer@preora.demo`, `seller@preora.demo`, `seller.b@preora.demo`,
`partner@preora.demo`, `admin@preora.demo`. Mật khẩu ban đầu: `Demo123!`.
Đây là môi trường dùng thử chung: chỉ nhập dữ liệu thử; đổi mật khẩu admin trước khi
chia sẻ rộng nếu muốn giữ quyền quản trị riêng. Sau khi tạo, mật khẩu và 2FA không bị seed reset.

Huấn luyện chế độ campaign demo và dataset lịch sử do người dùng upload dùng worker thật.
Raw UCI trên máy không được đưa lên GitHub/image, nên chế độ retail chưa sẵn sàng nếu
chưa cung cấp file nguồn trên host. Metric mô phỏng không chứng minh độ chính xác thực tế.

Chatbot Ollama cần endpoint Ollama riêng được cấu hình bằng `OLLAMA_URL`/`OLLAMA_MODEL`;
image không chạy Ollama và không có GPU. Nếu chưa cấu hình, chatbot báo chưa kết nối.
HTTP AI service độc lập cổng 8001 chưa có loader; web training dùng backend job/worker,
không phụ thuộc service 8001 và không cần triển khai service giả.
Thanh toán vẫn là mô phỏng của prototype.

## Kiểm tra sau triển khai

- `/` hiện PREORA; `/api/health` trả `status: ok`.
- Đăng nhập các vai trò, hồ sơ, giỏ hàng/đặt trước, partner chỉ thấy lệnh được giao.
- Train một campaign bằng chế độ demo; kiểm tra job thành công và xem kết quả.
- Khởi động lại service rồi kiểm tra dữ liệu vừa tạo và kết quả train còn tồn tại.
- Kiểm tra cửa sổ ẩn danh và mobile trước khi gửi link cho giảng viên.

## Chạy Docker để kiểm tra local

```powershell
docker build -t preora-demo .
docker run --rm -p 10000:10000 -e AUTH_COOKIE_SECURE=false -e PUBLIC_ORIGIN=http://localhost:10000 -v preora-demo-data:/var/data preora-demo
```

Mở `http://localhost:10000`. Cấu hình cookie HTTP trên chỉ dành cho local;
Render vẫn dùng `AUTH_COOKIE_SECURE=true`.

## Xác minh trước khi bàn giao (06/11/2026)

- Frontend production build và TypeScript: thành công.
- Backend: 119 test passed, gồm test entry point hosting, HTTPS cookie và origin guard.
- `docker build -t preora-demo:render-check .`: thành công trên Linux Docker.
- Container thực: frontend, API health, đăng nhập admin và train campaign demo bằng
  Python worker thật đều thành công; không mock API hoặc kết quả model.
- Khởi động lại container với cùng volume: tài khoản mới và kết quả train vẫn còn.
- Công cụ kiểm tra trình duyệt bị timeout; chưa xác minh trực quan bản hosting.
- Chưa tạo tài nguyên Render và chưa có URL live: cần chủ tài khoản đăng nhập và
  xác nhận gói dịch vụ. Kiểm tra live/redeploy trên Render vẫn phải làm sau bước này.

## Tài liệu Render

- https://render.com/docs/blueprint-spec
- https://render.com/docs/disks
- https://render.com/docs/free
- https://render.com/docs/deploy-to-render
