# Kết quả thực nghiệm AI

Model nghiên cứu trên dữ liệu nguồn; chưa thay dự báo demo PREORA.

| Tác vụ | Train / Validation / Test | Chỉ số test | Model | Baseline |
|---|---|---|---|---|
| retail_next7 | 5738 / 1600 / 2200 | mae | 144.2595 | 186.2273 |
| retail_next7 | 5738 / 1600 / 2200 | rmse | 313.2615 | 380.5441 |
| retail_next7 | 5738 / 1600 / 2200 | wape | 0.5384 | 0.6950 |
| vt_campaign_success | 17568 / 1741 / 7158 | f1 | 0.9017 | 0.6696 |
| vt_campaign_success | 17568 / 1741 / 7158 | roc_auc | 0.9691 | 0.5000 |
| vt_campaign_success | 17568 / 1741 / 7158 | brier | 0.0704 | 0.2500 |
| vt_campaign_success | 17568 / 1741 / 7158 | positive_rate | 0.5034 | 0.5034 |
| webrobots_launch_success | 170746 / 34491 / 37010 | f1 | 0.8720 | 0.8465 |
| webrobots_launch_success | 170746 / 34491 / 37010 | roc_auc | 0.7907 | 0.5000 |
| webrobots_launch_success | 170746 / 34491 / 37010 | brier | 0.1498 | 0.2191 |
| webrobots_launch_success | 170746 / 34491 / 37010 | positive_rate | 0.7339 | 0.7339 |

MAE/RMSE: sản phẩm trong 7 ngày. WAPE/Brier thấp hơn tốt hơn; F1/ROC-AUC cao hơn tốt hơn.

UCI dùng 100 sản phẩm chọn từ train; Kickstarter không phải dữ liệu pre-order/MOQ của PREORA.
Các snapshot của một chiến dịch không độc lập; chỉ số snapshot chưa kèm khoảng tin cậy theo chiến dịch.
Metadata crowdfunding có thể đã được sửa sau launch. Xem README và JSON từng model để đọc giới hạn đầy đủ.
