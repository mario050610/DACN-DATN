# Vòng đời sản phẩm PREORA — bản triển khai 30/10/2026

## Nơi kiểm tra

- Mọi tài khoản có menu **Vòng đời sản phẩm** và **Sản phẩm đã sản xuất**.
- Trang chi tiết sản phẩm có góp ý trước sản xuất, phương án và lịch sử phiên bản, ảnh/video thành phẩm, điểm sao và feedback sau nhận hàng.
- Người bán: Phương án → Báo giá → chọn đối tác → Thành phẩm → Giao hàng → Đổi trả → Đối soát.
- Đối tác: khai báo **Năng lực sản xuất**, vào Báo giá để phản hồi yêu cầu; tiếp nhận và cập nhật lệnh ở các trang sản xuất hiện có.
- Khách: xác nhận phương án hoặc đề nghị hoàn tiền trước sản xuất; xác nhận nhận hàng ở Giao hàng; đánh giá sản phẩm từ 1–5 sao sau đó.
- Admin: kiểm chứng AI, cảnh báo, báo cáo đánh giá, xử lý đổi trả và đối soát/hoàn tiền mô phỏng.

## Quy tắc nghiệp vụ

1. Góp ý trước sản xuất không phải đánh giá sau mua. Khách được gửi góp ý trước khi bắt đầu sản xuất; mỗi góp ý lưu phiên bản phương án tại thời điểm gửi. Người bán được phản hồi.
2. Công bố phương án tạo phiên bản mới, thông số, tổng hợp góp ý, lý do và ngày dự kiến. Khách đã thanh toán phải xác nhận phiên bản mới nhất; xác nhận cũ không còn đủ điều kiện khi phương án thay đổi. Khách từ chối được chuyển chờ hoàn tiền. Không tự sửa thiết kế sau khi đã bắt đầu sản xuất; thay đổi lịch dùng luồng điều chỉnh kế hoạch có lý do.
3. Chỉ chiến dịch thành công, đạt MOQ mới mời báo giá. Công suất được kiểm tra theo nhóm hàng/ngày khả dụng/lead time/lô sản xuất. Khi chọn báo giá hệ thống kiểm tra lại; bản hiện tại chặn phân công thêm lệnh cùng nhóm hàng cho đối tác còn lệnh chưa hoàn thành để tránh cộng công suất trùng. Chưa là bộ tối ưu lịch nhiều dây chuyền.
4. Không cho bắt đầu sản xuất nếu lượng đặt hợp lệ thấp hơn MOQ hoặc còn khách đã thanh toán chưa xác nhận phương án. Tiếp nhận lệnh không tự tạo sản lượng.
5. Hoàn thành lệnh tại xưởng không đồng nghĩa khách đã nhận hàng. Chỉ sản lượng 100% mới công bố ảnh thành phẩm. Ảnh PNG/JPEG/WebP tối đa 2 MB; video dùng link HTTPS do người đăng cung cấp, mở dưới dạng liên kết ngoài, không nhúng tự động.
6. Danh mục đã sản xuất chỉ lấy sản phẩm có lô hoàn thành và thành phẩm đã công bố. Phân biệt ảnh thiết kế với ảnh thực tế do người bán/đối tác cung cấp; không khẳng định đã kiểm định độc lập.
7. Người bán tạo vận đơn sau công bố thành phẩm. Khách xác nhận đã nhận hàng thì đơn mới ghi nhận `receivedAt` và được đánh giá. Mỗi đơn một đánh giá, điểm nguyên 1–5; điểm trung bình, phân bố sao chỉ lấy đánh giá đang công khai. Đơn mẫu có nhãn mô phỏng; seller không tự ẩn đánh giá tiêu cực, chỉ phản hồi/báo cáo. Admin xem xét báo cáo với lý do.
8. Chính sách thử nghiệm cho phép yêu cầu đổi trả trong 14 ngày sau nhận hàng: yêu cầu → chấp nhận hoặc từ chối có lý do → nhận lại hàng → chờ hoàn tiền → đã hoàn tiền mô phỏng. Mỗi bước lưu timestamp và người xử lý.

## Backend và đồng bộ

- API `/api/lifecycle/state` là nguồn nghiệp vụ chính: sản phẩm, chiến dịch, đơn và lệnh sản xuất. Dữ liệu lưu SQLite cùng cơ sở tài khoản, trong `lifecycle_state` và `lifecycle_items`.
- Frontend lấy thay đổi mỗi 10 giây; các thao tác quan trọng gọi command backend, kiểm tra chủ sở hữu/vai trò, transition và revision. Revision cũ trả 409 và tải lại, tránh ghi đè thay đổi tài khoản khác.
- Checkout lấy giá/trạng thái chiến dịch từ backend, cập nhật đơn và số lượng trong cùng transaction; khóa idempotency của biên nhận vẫn được giữ. Cập nhật đơn đồng bộ vào shopping/receipts. Địa chỉ giao hàng chỉ trả cho chủ đơn, người bán của đơn và admin.
- Không gửi toàn bộ snapshot trình duyệt để ghi lên server, không tự tin dữ liệu thanh toán do client khai. Không lưu các đơn/địa chỉ backend vào localStorage.
- Đơn và địa chỉ đã lưu trong shopping SQLite từ bản trước được chuyển sang nguồn nghiệp vụ đúng một lần, giữ ID và tránh cộng trùng lượng đặt; không nhập giao dịch từ snapshot client vào bước chuyển này.
- Dữ liệu prototype cũ được giữ ở `preora-before-backend-v1` trong trình duyệt đã có cache; admin có nút tải bản sao tại Đối soát. Các giao dịch/campaign tùy chỉnh chỉ có trong cache cũ chưa được tự công nhận/import vào backend; cần đối chiếu từ bản sao, tránh đưa số tiền/trạng thái giả từ client vào dữ liệu có thẩm quyền. Hồ sơ cộng đồng/tài liệu xác minh đã lưu SQLite vẫn giữ nguyên.
- SQLite phù hợp bản local/prototype; đây chưa phải chuyển toàn hệ thống sang PostgreSQL. Cần backup file tài khoản, các thư mục job/artifact và bản sao dữ liệu cũ trước triển khai thực tế.

## AI và cảnh báo

- Kiểm chứng AI đọc các job đã thành công và lưu snapshot dự báo; không nhận dự báo hoặc kết quả cuối kỳ do client tự khai vào endpoint đánh giá. Khi chiến dịch đóng, đối chiếu với lượng đặt hợp lệ ghi nhận, tính MAE/RMSE và baseline tốc độ. UI phân biệt nguồn mô phỏng/CSV và kết quả demo/đơn hệ thống.
- Đây là đánh giá snapshot trên kết quả ghi nhận, chưa chứng minh hiệu quả ngoài mẫu trên chiến dịch PREORA thật. Nhiều snapshot cùng chiến dịch có tương quan; không diễn giải số lượng snapshot thành số chiến dịch độc lập. Chưa có kết quả thì hiển thị chưa đủ dữ liệu, không tạo điểm số giả.
- Cảnh báo quy tắc: tốc độ có thể không đạt MOQ; lượng hủy/hoàn tiền từ 15%; sản xuất quá hạn; chưa đủ khai báo công suất theo khoảng ngày còn lại. Mỗi cảnh báo nêu dữ liệu và đường dẫn xử lý; không gọi quy tắc tốc độ là xác suất ML.

## Thanh toán và vận chuyển

- Sandbox thanh toán nội bộ cho đơn chờ thanh toán kiểm tra thành công/thất bại/gọi lặp; không thu tiền thật. Checkout hiện có vẫn ghi thanh toán mô phỏng ngay khi xác nhận.
- Đối soát so khớp số tiền/trạng thái giữa đơn và sổ thanh toán; trang Tài chính hiện có vẫn xuất CSV. Không kết nối ngân hàng hoặc nhà cung cấp thanh toán thật khi chưa có thông tin tích hợp.
- Vận đơn nhập tay; chưa gọi API hãng giao hàng. Timestamp nhận hàng do khách xác nhận, không giả lập trạng thái hãng vận chuyển.

## Xác minh

```powershell
cd D:\PREORA-Monorepo-Starter\PREORA\backend
.venv\Scripts\python.exe -m pytest tests -q
cd ..
npm.cmd --prefix frontend run build
node scripts/test_order_events.cjs
node scripts/test_capacity_progress.cjs
```

Chrome kiểm thử bằng bốn browser context riêng với FastAPI/SQLite thật trong cơ sở dữ liệu kiểm thử độc lập, đi hết feedback → phương án → xác nhận → báo giá → phân công → sản xuất → ảnh thực tế → vận đơn → nhận hàng → đánh giá → yêu cầu đổi trả. Không dùng mock response cho luồng này.
