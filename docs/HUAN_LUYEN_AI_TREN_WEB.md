# Demand Forecasting đầy đủ theo sơ đồ PREORA

## Thao tác trên giao diện

1. Mở `START_PREORA_WITH_AI.bat`, đăng nhập admin → **Huấn luyện AI** (`/#admin-ai-training`).
2. Chọn sản phẩm trong chiến dịch đang chạy.
3. Chọn nguồn huấn luyện:
   - **Đầy đủ theo sơ đồ · demo mô phỏng**: tạo lịch sử nhiều chiến dịch bằng mô phỏng, sau đó fit hai model thật. Đây không phải dữ liệu thực, không dùng kết quả đánh giá này để tuyên bố độ chính xác PREORA.
   - **Đầy đủ theo sơ đồ · CSV lịch sử PREORA**: nhập dataset có snapshot và kết quả cuối kỳ của các chiến dịch đã kết thúc. Nguồn do admin khai báo, hệ thống không tự xác minh tính xác thực. Cần ít nhất 100 chiến dịch, đủ khoảng thời gian để purge, cả hai nhãn trong từng tập; 100 chiến dịch chưa bảo đảm đủ mẫu để đánh giá tốt.
   - **Thực nghiệm UCI · dự báo bán lẻ 7 ngày**: giữ chế độ cũ để nghiên cứu nguồn bán lẻ; không coi là ba đầu ra đầy đủ của sơ đồ.
4. Kiểm tra danh mục, loại sản phẩm, views/clicks/favorites/add-to-cart, lượng đã hủy và chính sách sản xuất.
5. Nhập CSV lượng hợp lệ theo ngày (`date,quantity`) hoặc sửa trực tiếp. Có thể dự báo từ ngày đầu: nhập các ngày đã chạy từ lúc bắt đầu đến hôm nay; nếu đã chạy hơn 28 ngày thì nhập 28 ngày gần nhất, mỗi ngày một dòng. Không thêm ngày trước khi chiến dịch bắt đầu. Lịch sử dưới 7 ngày có cảnh báo dự báo sớm, không bị chặn. Ngày 0 phải được xác nhận. Nếu bao phủ toàn bộ chiến dịch, tổng phải khớp currentOrders. Không có ngày tương lai, số âm, dòng trùng hoặc tổng vượt currentOrders.
6. Xác nhận đầu vào → **Bắt đầu huấn luyện & dự báo**. Xem tiến độ/log, tải lại trang để tiếp tục theo dõi. Chỉ một phiên web chạy cùng lúc.
7. Xem đủ ba ô kết quả và tải JSON. Người bán có thể vào **Dự báo AI** hoặc **Khả năng thành công** để xem kết quả full mới nhất của chiến dịch thuộc cửa hàng mình.

## Đầu vào thực sự dùng để train/inference

| Nhóm | Feature |
|---|---|
| Chiến dịch | durationDays, daysRemaining, elapsedDays, moq, target |
| Sản phẩm | category, price (VND), productType |
| Hành vi | views, clicks, favorites, addToCart |
| Đơn đặt trước | currentOrders, ordersPerDay, growthRate, cancellationRate |

- Tất cả 16 feature nằm trong pipeline của cả regressor và classifier, không chỉ đưa lên màn hình. Model artifact chứa danh sách feature.
- **Đơn vị thống nhất là sản phẩm**, không phải số hóa đơn: `currentOrders` = tổng số lượng còn hợp lệ sau hủy; `finalQuantity` = số lượng hợp lệ tại ngày kết thúc. Không đổi backers hoặc số tiền Kickstarter thành số sản phẩm.
- Duration = endDate − startDate; daysRemaining = endDate − snapshotDate; elapsedDays tính cả ngày bắt đầu đã quan sát.
- Orders/Day = tổng số lượng hợp lệ 7 ngày gần nhất / min(7, số ngày quan sát).
- Growth Rate = (tổng 7 ngày gần nhất − tổng 7 ngày trước đó) / max(1, tổng 7 ngày trước đó), giới hạn [-1, 1000]. Khi kỳ trước bằng 0, mẫu số 1 là quy ước tránh chia 0, không phải tăng trưởng thống kê ổn định.
- Cancellation Rate = cancelledQuantity / max(1, currentOrders + cancelledQuantity). CSV lịch sử và form phải dùng cùng quy tắc số lượng hợp lệ.
- Category `Collectible` chuẩn hóa thành `Sưu tầm`, `Merchandise` thành `Đời sống`; các danh mục khác giữ nguyên. Loại sản phẩm có thể chỉnh theo taxonomy thật.
- Hành vi tính lũy kế từ đầu chiến dịch đến snapshot. Các giá trị nhập tay cần được admin xác nhận. Không tự sinh các trường còn thiếu rồi mô tả chúng là dữ liệu thực.

## Ghi nhận hành vi trên website

- Click: khách/khách hàng bấm thẻ sản phẩm.
- View: khách/khách hàng mở trang sản phẩm; chống ghi trùng trong 30 giây mỗi tab/campaign. Không tính lượt kiểm tra của seller/admin/partner.
- Favorite: thao tác lưu sản phẩm thành công, chỉ tăng khi chuyển từ chưa lưu sang lưu.
- Add to Cart: thao tác `mode=add` thành công; đếm hành động, không cộng số sản phẩm vào số lượt.
- Sự kiện có ID idempotent; favorites/cart chỉ được ghi phía server sau bước xử lý mutation. Nếu telemetry không ghi được, không chặn mua sắm.
- Chỉ lưu campaign, loại sự kiện và thời gian UTC; không lưu email/IP/định danh khách hàng trong bảng này. Nguồn đọc trên admin ghi rõ chỉ có dữ liệu từ khi bật tracker, không khôi phục lịch sử cũ; không diễn giải số 0 là toàn bộ lịch sử không có tương tác.
- API: `POST /api/analytics/events` (view/click), `GET /api/analytics/campaigns/{id}?startDate=...&endDate=...` (admin).

## Dataset lịch sử để train thật

Tải mẫu cột CSV ngay trên trang. Một dòng = snapshot của một chiến dịch tại một ngày; có thể nhiều snapshot mỗi chiến dịch.

```csv
campaignId,snapshotDate,startDate,endDate,moq,target,category,price,productType,views,clicks,favorites,addToCart,currentOrders,ordersPerDay,growthRate,cancellationRate,finalQuantity
HIST-001,2025-01-10,2025-01-01,2025-01-31,100,200,Thời trang,450000,Thời trang,12000,1200,80,350,45,5.2,0.3,0.04,145
```

Đây chỉ là **ví dụ schema**, không phải lịch sử thực hay dataset đủ để train. Bạn cần dữ liệu thật với provenance. Cùng campaignId phải có cùng ngày bắt đầu/kết thúc, MOQ, target và finalQuantity. Dòng trùng campaign/ngày bị từ chối. Chỉ nhận chiến dịch đã kết thúc trước hôm nay. Không có finalQuantity/state cuối kỳ trong feature; `success` luôn được tính từ finalQuantity ≥ MOQ.

API nhập: `POST /api/admin/ai-training/datasets`, xác nhận dữ liệu lịch sử và khai báo nguồn. Server kiểm tra schema/range/nhất quán trước khi lưu dưới ID tự tạo, không dùng đường dẫn từ trình duyệt.

Ba bộ UCI, Virginia Tech, Web Robots đã tải **không đủ toàn bộ schema này**. Pipeline không ghép hành vi giả vào những bộ đó và gọi là dữ liệu thực.

## Hai model và hiệu chỉnh

1. **Demand model:** HistGradientBoostingRegressor dự đoán trực tiếp `log1p(finalQuantity)`; chuyển ngược về số lượng. Đây không phải nhân tốc độ 7 ngày thành nhu cầu cuối kỳ.
2. **MOQ classifier:** HistGradientBoostingClassifier học nhãn `finalQuantity >= moq`. Xác suất sigmoid được fit trên tập calibration riêng, không tính bằng predictedDemand/MOQ.
3. Chọn hai cấu hình số lá cây bằng validation, riêng cho hai model. Train/validation/calibration/test tách theo campaignId và thời gian launch (mốc 60%, 75%, 87.5%). Purge các chiến dịch có kết quả chưa biết trước cohort tiếp theo. Toàn bộ dữ liệu phải kết thúc trước ngày forecast; chiến dịch đang chọn bị loại khỏi train.
4. Khoảng dự báo dùng quantile hữu hạn của residual tuyệt đối ở không gian log trên calibration, mức danh nghĩa 80%. Đo coverage thực trên test; dữ liệu theo chuỗi/campaign có tương quan nên không tuyên bố bảo đảm distribution-free hay coverage ngoài nguồn train.
5. Báo MAE/RMSE/WAPE và baseline hiện tại + tốc độ × ngày còn lại; F1/ROC-AUC/Brier và baseline xác suất trung bình train. Calibration curve và permutation importance được lưu trong JSON. Feature importance không phải quan hệ nhân quả.
6. Nếu model chưa vượt baseline về MAE, trang nêu rõ. Không chỉnh model hay chọn hyperparameter bằng test.

## Khoảng sản xuất đề xuất

Đây là **quy tắc lập kế hoạch**, chưa phải tối ưu chi phí/lợi nhuận do chưa có cost, salvage, lead time và năng lực theo lịch.

- Cận dưới = làm tròn lên theo lô của max(cam kết hiện tại, MOQ, cận dưới dự báo).
- Cận trên = làm tròn lên của max(cận dưới, cận trên dự báo × (1 + buffer)).
- Cắt theo năng lực tối đa đã làm tròn xuống theo lô. Nếu năng lực không đủ cận dưới: trả không khả thi, không trả khoảng đảo ngược.
- Xác suất dưới ngưỡng: đề nghị chưa chốt sản xuất; trên ngưỡng chỉ lập kế hoạch. Không tự tạo lệnh sản xuất, không tự coi chiến dịch đã thành công.
- Đường nối từ hiện tại đến dự báo cuối kỳ chỉ minh họa nội suy, không phải dự báo từng ngày.

## Lưu trữ và sử dụng kết quả

- Phiên, log, dataset nhập, model và JSON: `tmp/ai-training/`, không commit Git.
- Artifact full chứa preprocessing, regressor, classifier, calibrator, radius, feature contract và provenance. Model theo từng phiên, không ghi đè artifact nghiên cứu chung.
- `GET /api/ai/campaigns/{campaignId}/latest` chỉ cho admin hoặc seller sở hữu chiến dịch server biết; chỉ trả phiên full đã thành công.
- Seller không còn tự tạo số liệu bằng công thức demo cũ ở hai trang dự báo chính. Nếu chưa train: báo chưa có kết quả. Nếu snapshot khác ngày/số lượng/MOQ/target/lịch/giá hiện tại: báo cũ và cần admin train lại.
- Các trang không khẳng định model demo là model đã được kiểm chứng trên dữ liệu thật. Độ chính xác thật chỉ có thể đo khi có dữ liệu PREORA độc lập đủ chất lượng.
- Worker heartbeat trong lúc fit; mất heartbeat hơn 3 phút sẽ đánh dấu thất bại để có thể chạy lại.

Chạy local bằng launcher hiện tại; môi trường ML dùng `ai-service/.venv`. Cài ML dependencies lần đầu bằng `TRAIN_AI.bat` hoặc `python -m pip install -r ai-service/training/requirements.txt`. Không chạy train CLI đọc lại UCI song song phiên web dùng cache retail.

## Kiểm thử

```powershell
$env:PYTHONPATH = "$PWD\backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -q
.\ai-service\.venv\Scripts\python.exe -m pytest ai-service/training/test_full_campaign.py ai-service/training/test_pipeline.py -q
npm --prefix frontend run build
```

Tham khảo kỹ thuật: [scikit-learn probability calibration](https://scikit-learn.org/stable/modules/calibration.html), [tránh data leakage](https://scikit-learn.org/stable/common_pitfalls.html).

## Theo dõi quá trình và đọc giải thích

Trang admin hiển thị timeline các mốc worker thực sự cập nhật: thời điểm, giai đoạn và mốc phần trăm. Lịch sử này lưu trong SQLite, không phát sinh bước giả do heartbeat/polling. Phần trăm là mốc workflow, không phải dự đoán thời gian còn lại. Phiên cũ chưa lưu các mốc sẽ được ghi rõ, không dựng ngược lịch sử giả.

Kết quả full ở cả admin/seller có mục **AI đã xử lý như thế nào?**: đọc snapshot, học/chia tập, so baseline, đưa ra hai dự báo, áp dụng ràng buộc sản xuất. Nội dung được tạo từ số liệu/metric/quy tắc có trong kết quả đã lưu; không gọi LLM để đóng vai suy nghĩ hay diễn giải permutation importance thành nguyên nhân riêng của một sản phẩm.

Khi chưa đủ 14 ngày, chưa thể so sánh hai tuần đầy đủ: feature growthRate tạm dùng 0 và kết quả có ghi chú, không coi đây là tăng trưởng đã đo. Bộ demo mới có cả snapshot ngày 1 và ngày 3; dự báo sớm vẫn cần được kiểm chứng trên dữ liệu thực.

## Kiến trúc, nguồn và quyền hiện tại

Huấn luyện chạy `backend → jobs SQLite → Python worker`, không đi qua HTTP AI service 8001. Seller đọc kết quả full đã lưu; chatbot là đường riêng. Xem [sơ đồ hiện trạng](ARCHITECTURE.md), [bảng ánh xạ dữ liệu](DATA_PROVENANCE.md) và [vai trò thiết kế/prototype](ROLE_MAPPING.md).

## Đơn hàng mẫu theo ngày

Campaign mẫu có lịch sử phân bổ theo ngày và profile tăng tự động; PR-SIM là đơn/phần thanh toán mô phỏng. Admin có nút tiến ngày và bật/tắt trên trang train. Đây không phải dữ liệu thị trường; xem [cơ chế và giới hạn](MO_PHONG_DON_HANG.md).

## Seller huấn luyện và theo dõi sản xuất

Seller → Dự báo AI nay dùng cùng quy trình huấn luyện với admin cho chiến dịch thuộc cửa hàng. Seller nhập CSV riêng, cấu hình snapshot, khởi chạy worker, xem tiến trình và kết quả. Xem [quyền và luồng theo tài khoản](SAN_XUAT_VA_AI_THEO_VAI_TRO.md) để biết phạm vi dữ liệu và các trang sản xuất.
