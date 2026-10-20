# Huấn luyện AI với dữ liệu thực tế

Chạy từ thư mục PREORA trên Windows:

```powershell
.\TRAIN_AI.bat
```

Launcher tạo virtualenv AI nếu cần, cài dependencies trong `training/requirements.txt`, rồi xử lý và train cả ba nguồn. Dữ liệu raw được giữ nguyên và không đưa vào Git. Lần đầu đọc Excel và các CSV có thể mất vài phút. Không cần GPU, không cần Ollama, Docker hoặc backend khi train.

Chạy từng nguồn hoặc thay đổi số sản phẩm UCI:

```powershell
.\ai-service\.venv\Scripts\python.exe -u -X utf8 ai-service\training\train.py --dataset retail --top-products 100
.\ai-service\.venv\Scripts\python.exe -u -X utf8 ai-service\training\train.py --dataset vt
.\ai-service\.venv\Scripts\python.exe -u -X utf8 ai-service\training\train.py --dataset webrobots
```

## Dữ liệu và ba mô hình

| Mô hình | Dữ liệu | Đầu ra |
|---|---|---|
| `retail_next7` | UCI Online Retail II | Tổng số lượng bán dương trong 7 ngày tiếp theo, theo sản phẩm |
| `vt_campaign_success` | Virginia Tech metadata + History | Xác suất chiến dịch Kickstarter thành công, tại ngày 7/14/21 |
| `webrobots_launch_success` | Web Robots, loại trùng ID giữa các bản chụp | Xác suất thành công dựa vào metadata dự kiến có lúc khởi chạy |

File Virginia Tech `18k_Projects.csv` phân cách bằng tab; `History.csv` không có header. Pipeline xử lý theo định dạng file thực tế, không tự bỏ dòng đầu.

UCI: đọc cả hai sheet, bỏ dòng trùng hoàn toàn, lọc hủy/quantity không dương/price không dương/mã không phải sản phẩm, tổng hợp ngày. Dòng giống nhau có thể là giao dịch hợp lệ nên việc bỏ trùng là một giả định cần nêu trong báo cáo. Dự báo gross sales, không phải lượng bán ròng hoặc nhu cầu tiềm ẩn khi hết hàng. Điền 0 cho ngày không có bán; không có dữ liệu tồn kho để phân biệt hết hàng. Giá chỉ forward-fill, không lấy giá tương lai. Chọn 100 sản phẩm có lượng bán cao nhất trong tập train để có bản thực nghiệm chạy được trên laptop; kết quả không đại diện toàn danh mục. Cùng sản phẩm có thể xuất hiện ở các giai đoạn khác nhau vì đây là dự báo tương lai cho sản phẩm đã biết.

Virginia Tech: lấy quan sát lịch sử trước thời điểm dự báo, không dùng số backers/pledged cuối kỳ làm feature. Bỏ mẫu nếu quan sát gần nhất cũ quá 2 ngày. Nhãn là state successful/failed; chiến dịch live/canceled/suspended không thuộc bài toán nhị phân này. Giá trị funding và số funders vẫn giữ nguyên ngữ nghĩa crowdfunding.

Web Robots: chỉ đọc cột cần thiết, loại trùng ID trước khi chia tập; ưu tiên bản chụp sau theo thư mục ngày. Không dùng pledged, backers_count, percent_funded, spotlight hoặc state_changed_at làm đầu vào. State chỉ dùng làm nhãn. Metadata goal/category từ bản chụp có thể đã thay đổi sau launch, nên đây là benchmark hồi cứu, không chứng minh dự báo lúc launch hoàn toàn không có sai lệch. Không xuất creator profiles, customer IDs hoặc URL có tham số chữ ký vào processed/model/report.

## Chia tập và đánh giá

- UCI: train trước 01/03/2011, validation từ đó đến trước 01/07/2011, test từ 01/07/2011. Loại mẫu nếu nhãn 7 ngày vượt qua ranh giới tập; bỏ cuối chuỗi chưa đủ 7 ngày tương lai. Mẫu dự báo cách nhau 7 ngày.
- Chiến dịch: mốc chia tại phân vị ngày launch 60%/85% cho Virginia Tech, 70%/85% cho Web Robots; toàn bộ snapshot cùng chiến dịch ở cùng tập. Purge các chiến dịch train chưa kết thúc trước mốc validation, và validation chưa kết thúc trước mốc test. Tỷ lệ cuối khác các phân vị dự kiến vì purge và nhiều snapshot.
- Chỉ fit preprocessing trên train. So hai cấu hình cây theo validation; test chỉ đánh giá cuối cùng. Không refit bằng test.
- Regression: MAE, RMSE, WAPE; baseline = lượng bán 7 ngày vừa qua.
- Classification: F1 (ngưỡng 0.5), ROC-AUC, Brier; baseline = xác suất thành công trung bình của train.
- Cờ `test_beats_baseline` dùng MAE cho regression, Brier cho classification. Không khẳng định model tốt nếu chỉ một chỉ số được cải thiện. Các xác suất chưa được hiệu chỉnh riêng và chưa có đánh giá trên PREORA.

## Đầu ra

- `data/processed/*_samples.csv`: mẫu đã xử lý, feature, nhãn và tập train/validation/test.
- `data/processed/*_predictions.csv`: kết quả validation/test để kiểm tra.
- `training/reports/*_data_audit.json`: thống kê nguồn, lọc dữ liệu và mốc chia.
- `training/reports/*.json`: chỉ số thực tế, baseline, cấu hình chọn, giới hạn và SHA-256 artifact.
- `training/reports/run_summary.json`: các tác vụ vừa chạy; chạy một nguồn sẽ ghi summary cho nguồn đó, không xóa báo cáo khác.
- `model_artifacts/research/*.joblib`: cả preprocessing và model, version thư viện, tên feature, ý nghĩa target. Chỉ load file joblib do chính bạn tạo hoặc tin cậy.

Mỗi lần chạy ghi đè đầu ra của tác vụ tương ứng, raw không đổi. Để lặp lại chính xác môi trường hiện tại, dùng `training/requirements-lock.txt`. Seed là 42.

## Tích hợp PREORA

Các artifact hiện là **mô hình nghiên cứu**, chưa nối vào `/forecast`, `/predict-success` và chưa thay `demoForecastApi` ở frontend. UCI không có campaign/MOQ; Kickstarter không có số lượng sản phẩm pre-order. Không tự đổi tiền/người ủng hộ thành số sản phẩm.

Muốn triển khai đúng hai chức năng PREORA, cần dữ liệu chiến dịch pre-order với lịch sử quantity theo ngày và kết quả cuối kỳ, thống nhất quy tắc đơn hợp lệ; sau đó tái huấn luyện/đánh giá với feature và target khớp API. Có thể dùng các script này làm nền cho quy trình đó.

Nguồn:
- https://archive.ics.uci.edu/dataset/502/online+retail+ii (CC BY 4.0, ghi công nguồn).
- https://dmkd.cs.vt.edu/projects/crowdfunding/dataset.htm (kiểm tra điều kiện sử dụng của nhóm tác giả trước khi phân phối lại).
- https://webrobots.io/kickstarter-datasets/ (kiểm tra điều kiện của nguồn trước khi phân phối lại).
- https://scikit-learn.org/stable/common_pitfalls.html

Virginia Tech dùng validation từ phân vị launch 60% để còn đủ chiến dịch sau khi purge. Mốc 70% chỉ còn 91 snapshot validation nên không được giữ cho bản thực nghiệm cuối. Không dùng kết quả test để chọn mốc hoặc hyperparameter.

## Giao diện quản trị

Mở **Quản trị → Huấn luyện AI** để chọn chiến dịch, xác nhận lịch sử và train model trong trình duyệt. Xem [hướng dẫn thao tác và giới hạn](../../docs/HUAN_LUYEN_AI_TREN_WEB.md). Model của mỗi phiên được lưu riêng trong `tmp/ai-training/`, không ghi đè model nghiên cứu chung.

## Train lại sau khi làm sạch và bổ sung lịch ngày

`ai-service\.venv\Scripts\python.exe -u -X utf8 ai-service/training/train.py --dataset all --cleaned`

Chế độ `--cleaned` đọc các file trong `data/processed/cleaned/`, không đọc lại toàn bộ CSV Web Robots vào RAM. Virginia Tech dùng lịch ngày đã bổ sung nhưng tính độ cũ từ `source_observed_date` thật, vẫn loại mẫu cũ hơn 2 ngày. Không coi ngày được điền là quan sát mới.

UCI dự báo **lượng bán được ghi nhận trong 7 ngày**, không phải nhu cầu thực tế bị thiếu quan sát. Ngày thiếu không có bản ghi đóng góp 0 vào tổng bản ghi; mô hình có thêm `observed_days_last7` và `observed_days_last28` để biết độ phủ lịch sử trên toàn nguồn. Việc thêm cờ không khôi phục được doanh số bị thiếu. Web Robots lấy bản mới nhất có dữ liệu hợp lệ của từng dự án từ bộ sạch, vẫn là benchmark metadata lúc launch với giới hạn hồi cứu.

Các mô hình trong `model_artifacts/research/` không tự thay mô hình chiến dịch của các phiên huấn luyện trên giao diện.
