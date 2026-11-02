# Hồ sơ cộng đồng và năng lực sản xuất

- Mỗi tài khoản: menu tài khoản → Trang cá nhân (`#profile/<userId>`). Ảnh bìa, avatar, tên hiển thị, lĩnh vực, khu vực, giới thiệu công khai. Thông tin đăng nhập và tài liệu pháp lý không công khai.
- Menu Cộng đồng (`#community`) tìm theo tên/vai trò, mở hồ sơ để theo dõi hoặc Chat. Hồ sơ seed chưa có tài khoản thật được ghi là hồ sơ mẫu và không nhận chat.
- Mọi vai trò đăng/sửa/xóa bài của mình. Đăng và sửa cần chấp nhận quy tắc `community-v1`; quy tắc tại `#community-rules`. Ảnh PNG/JPEG/WebP tối đa 2 MB. Nội dung văn bản được React hiển thị dạng text.
- Tài khoản đăng nhập báo cáo bài. Quản trị → Kiểm duyệt cộng đồng (`#admin-community`) đối chiếu quy tắc, nhập lý do để ẩn bài hoặc đóng báo cáo. Quyết định lưu reviewer/thời điểm/lý do; báo cáo đã xử lý trả 409 khi xử lý lại. Đây là duyệt thủ công, không xác nhận tự động tính đúng hay hợp pháp của nội dung.
- Chat riêng theo cặp tài khoản; admin không có endpoint đọc hội thoại người khác. Giao diện lấy tin mới mỗi 5 giây; thông báo cộng đồng mỗi 15 giây. Chuông thông báo mở danh sách và dẫn tới nội dung liên quan.
- Hồ sơ, ảnh, bài, theo dõi, chat, báo cáo, thông báo và năng lực lưu SQLite backend, không nằm trong localStorage. Cần backup cùng cơ sở dữ liệu tài khoản. Từ 30/10, tiến trình sản xuất/chiến dịch đọc nguồn backend SQLite và đồng bộ giữa thiết bị qua polling; xem [Vòng đời sản phẩm](VONG_DOI_SAN_PHAM.md).

## Người bán

Danh mục chỉ hiện sản phẩm đang bán có chiến dịch công khai được duyệt. Bộ lọc Phổ biến theo số lượng ghi nhận của chiến dịch; Mới nhất theo ngày bắt đầu; Đang chạy lọc trạng thái đang hoạt động. Có lọc nhóm hàng và giá tăng/giảm. Không đưa sản phẩm nháp hoặc chiến dịch chờ duyệt ra danh mục này.

## Đối tác sản xuất

Menu Năng lực sản xuất (`#partner-capacity`): mỗi dòng là nhóm hàng và quy cách sản phẩm, công suất sản phẩm/ngày làm việc, kích thước lô, ngày chuẩn bị, ngày khả dụng và thứ làm việc. Không dùng một số sản phẩm/tháng cho mọi loại hàng.

Ước tính lệnh được giao lọc đúng nhóm hàng (quy cách đối chiếu thủ công), lấy giao khoảng ngày với hạn lệnh, cộng ngày chuẩn bị theo ngày lịch, đếm thứ làm việc. Khả dụng = làm tròn xuống theo lô của `max(0, ngày làm việc × sản phẩm/ngày − số lượng đã cam kết với lệnh khác)`. Nhu cầu làm tròn lên theo lô. Không cộng gộp những dòng cùng dây chuyền hoặc trừ lại chính lệnh đang kiểm tra. Đây là ước tính tự khai báo, chưa là lịch phân bổ nguồn lực tự động.

## Thanh tiến độ và timestamp

Tiến độ xử lý lệnh: Chờ tiếp nhận 0%, Đã tiếp nhận 10%, Đang sản xuất 20–80% theo sản lượng, Đang vận chuyển 90%, Hoàn thành 100%. Thanh sản lượng riêng vẫn 0% sau khi nhận lệnh. Tạo lệnh/chuyển bước ghi ISO timestamp thực tế, tách ngày kế hoạch hoặc đồng hồ mô phỏng. Chỉ hiển thị timestamp bước khi có lịch sử ghi nhận; dữ liệu cũ thiếu mốc ghi rõ chưa có.

Chiến dịch mới và lần đổi trạng thái tiếp theo có lịch sử timestamp; các sự kiện đã được tab khác ghi không nhân đôi. Timeline phân biệt ngày kế hoạch với thời điểm thao tác. Nhãn “Chờ kết quả chiến dịch” hiển thị một dòng; bảng cuộn ngang trên màn hình hẹp.

## Kiểm tra

```powershell
cd D:\PREORA-Monorepo-Starter\PREORA\backend
.venv\Scripts\python.exe -m pytest tests -q
cd ..
node scripts/test_order_events.cjs
node scripts/test_capacity_progress.cjs
npm.cmd --prefix frontend run build
```
