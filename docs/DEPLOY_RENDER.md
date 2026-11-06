# PREORA demo trên Render

## Trạng thái và chi phí

Cấu hình triển khai nằm trong `render.yaml` và `Dockerfile` ở thư mục gốc.
Đây là bản chuẩn bị triển khai, không phải bằng chứng đã có website live.

Link bắt đầu triển khai:

https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmario050610%2FDACN-DATN

Blueprint mặc định dùng **Render Free**, không khai báo disk hoặc dịch vụ trả phí.
Free ngủ sau 15 phút không có truy cập. Database SQLite, upload và kết quả model nằm
trên filesystem tạm nên mất khi restart, redeploy hoặc service ngủ. Đây là demo dùng thử,
chưa có lưu trữ lâu dài; không nhập dữ liệu thật. Train AI bị giới hạn bởi RAM/CPU của
gói Free và có thể không đủ cho dataset lớn. Cấu hình trả phí 1 CPU / 2 GB RAM với ổ
lưu 5 GB được giữ riêng tại `infra/render-persistent.yaml`, chỉ dùng khi chủ tài khoản
chủ động chọn và chấp nhận chi phí. Đẩy code không tự tạo tài nguyên Render.

## Các bước của chủ tài khoản

1. Đăng ký/đăng nhập Render bằng tài khoản của bạn.
2. Mở link triển khai trên; nếu repo private, cấp Render quyền đọc riêng repo DACN-DATN.
3. Kiểm tra service `preora-demo`, region Singapore, compute **Free**, không có disk.
4. Chọn Deploy. Nếu Render yêu cầu nâng cấp trả phí, dừng lại và kiểm tra plan.
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

## Vị trí dữ liệu

Với `render.yaml` Free, các vị trí dưới đây là **tạm**, không được đảm bảo giữ qua
restart/redeploy. Chỉ cấu hình `infra/render-persistent.yaml` gắn disk mới lưu lâu dài.

| Nội dung | Vị trí trong container (disk chỉ có ở cấu hình trả phí) |
|---|---|
| Tài khoản, phiên đăng nhập, hồ sơ, đơn hàng, vòng đời, ảnh upload, xác minh | `/var/data/accounts.sqlite3` |
| Phiên train, dataset lịch sử upload, model/kết quả/log theo job và tracker | `/var/data/ai-training/` |

Container không chứa `.env`, database local, giấy tờ upload, raw dataset hay model cũ.
Lần đầu chạy tạo database demo mới từ seed có sẵn; không sao chép database trên máy.
Với bản trả phí: không xóa disk khi redeploy. Sao lưu bằng SQLite online backup và sao lưu thư mục
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
- Với bản trả phí có disk: khởi động lại và kiểm tra dữ liệu/kết quả train còn tồn tại.
- Với bản Free: xác nhận seed demo được tạo lại sau restart; không cam kết giữ dữ liệu.
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
- Các kiểm tra persistence ở trên dùng Docker volume riêng, không chứng minh gói Free
  lưu dữ liệu lâu dài hoặc train vừa giới hạn RAM. Gói Free chưa được chạy live.
- Chưa tạo tài nguyên Render và chưa có URL live: cần chủ tài khoản đăng nhập và
  xác nhận gói dịch vụ. Kiểm tra live/redeploy trên Render vẫn phải làm sau bước này.

## Tài liệu Render

- https://render.com/docs/blueprint-spec
- https://render.com/docs/disks
- https://render.com/docs/free
- https://render.com/docs/deploy-to-render
