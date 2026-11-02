# PREORA — Draft API Contracts

## Hiện trạng API (30/10/2026)

Phần draft phía dưới là hợp đồng thiết kế ban đầu, không phải danh sách đầy đủ endpoint đang chạy. Swagger `/docs` từ backend là hợp đồng runtime.

| Endpoint | Hiện trạng |
|---|---|
| `/api/auth/*`, `/api/admin/users` | Auth/session/2FA và tra cứu admin đã có; persistence SQLite |
| `/api/shopping/*` | Shopping theo tài khoản, checkout mô phỏng; không thanh toán thật |
| `POST/GET /api/admin/ai-training`, `GET /api/admin/ai-training/{id}` | Admin tạo/poll job; backend chạy worker, lưu result/artifact/log theo job |
| `/api/admin/ai-training/datasets`, `/dataset-template` | Nhập/list dataset hoặc tải schema cho full model |
| `POST /api/analytics/events`, `GET /api/analytics/campaigns/{id}` | Ghi view/click và admin xem số đếm; favorite/cart ghi từ shopping |
| `GET /api/ai/campaigns/{id}/latest` | Admin hoặc seller sở hữu đọc kết quả full đã lưu; không inference mới |
| `POST /api/ai/chat` | Ollama support chat, độc lập forecasting |
| `POST /api/ai/forecast`, `/api/ai/predict-success` | Proxy HTTP tới 8001; loader chưa tích hợp nên 503; không phải luồng train web |

Chi tiết [kiến trúc](ARCHITECTURE.md), [nguồn dữ liệu](DATA_PROVENANCE.md), [quyền](ROLE_MAPPING.md).

---

**Quy ước đề xuất (CHƯA HOÀN THÀNH):** JSON camelCase cho frontend; DB snake_case; timestamps ISO 8601 UTC; `campaignId` là định danh duy nhất.

## Đã có endpoint khung

| Method | Path | Hiện trạng |
|---|---|---|
| GET | `/api/health` | Backend hoạt động |
| GET | `/api/v1/health` | Backend hoạt động |
| POST | `/api/ai/forecast` | Proxy → AI service; trả 503 nếu chưa có ML |
| POST | `/api/ai/predict-success` | Proxy → AI service; trả 503 nếu chưa có ML |
| GET | AI `:8001/health` | AI service hoạt động, model chưa load |

## Dự kiến Backend team phát triển

- `POST /api/v1/auth/register`, `/auth/login`, `/auth/logout`
- `GET/POST /api/v1/products`, `GET/PATCH /api/v1/products/{id}`
- `GET/POST /api/v1/campaigns`, `PATCH /api/v1/campaigns/{id}`, `POST /api/v1/campaigns/{id}/submit`
- `POST /api/v1/admin/campaigns/{id}/approve`, `/reject`
- `POST /api/v1/preorders/checkout`, `GET /api/v1/preorders/me`, `GET /api/v1/seller/orders`
- `GET /api/v1/production-requests`, `POST ...`, `PATCH .../{id}`
- `GET /api/v1/forecasts?campaignId=...`

Bản thiết kế API chỉ là đề xuất, chưa triển khai. Phân biệt `MOQ`, `targetQuantity`, `validPreorderQuantity`; lưu trạng thái payment riêng.

## ForecastRequest (đang dùng trong Frontend Figma)

```json
{
  "campaignId": "CD-2408",
  "productCategory": "Công nghệ",
  "currentOrders": 184,
  "moq": 300,
  "target": 500,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31",
  "currentDate": "2026-10-13",
  "elapsedDays": 12,
  "daysRemaining": 18,
  "dailyOrderQuantities": [{"date": "2026-10-12", "quantity": 10}]
}
```

AI thật phải trả `predictedDemand`, `lowerBound`, `upperBound`, `successProbability`, `modelVersion`, `warnings` và `series` theo hợp đồng Frontend.

### Lựa chọn thuật toán huấn luyện
`POST /api/admin/ai-training` và `POST /api/seller/ai-training` nhận `modelAlgorithm`: `hist_gradient_boosting` (mặc định), `random_forest`, `extra_trees`. Giá trị khác bị từ chối với 422. Snapshot, kết quả và artifact giữ thuật toán đã chọn; metadata kết quả bổ sung `modelAlgorithm` và `modelLabel`. Quyền chiến dịch/dataset/phiên không thay đổi. Xem [MODEL_VA_MENU_TAI_KHOAN.md](MODEL_VA_MENU_TAI_KHOAN.md).

### Hồ sơ và timestamp checkout
`POST /api/shopping/checkout` trả `orders[].events[]` gồm `title`, `kind`, `at` ISO. Request idempotent giữ nguyên sự kiện cũ. Voucher mở rộng lên 18 mã và kiểm tra hiệu lực theo ngày Việt Nam.

`/api/verification/me` GET/POST dành cho seller; POST nhận thông tin pháp lý, xác nhận và file base64 PDF/PNG/JPEG tối đa 3 MB cùng revision hiện tại. `/api/verification/admin` GET và `/api/verification/admin/{owner}` POST dành cho admin. Xác minh yêu cầu 5 mục checklist, nguồn tham chiếu và nhận xét. Revision sai trả 409. `/api/verification/documents/{id}` chỉ cho chủ tài khoản/admin tải; trả attachment/no-store/nosniff. Xem [DON_HANG_TAI_CHINH_XAC_MINH.md](DON_HANG_TAI_CHINH_XAC_MINH.md).
# Community profiles and partner capacity

`GET /api/community/profiles?q=&role=&offset=`, `GET /profiles/{uid}`, `GET /profiles/{uid}/posts` publish only public profile fields and published posts. Routes below use the `/api/community` prefix.

- `POST /me/profile`, `POST /me/media/{avatar|cover}`: authenticated owner only.
- `POST /profiles/{uid}/follow`: explicit `following` boolean; no self-follow.
- `POST /posts`, `PATCH /posts/{id}`, `DELETE /posts/{id}`: owner only; publish/edit requires `rulesAccepted: true`, version `community-v1`. `GET /rules` provides published rules.
- `POST /posts/{id}/report`, admin-only `GET /moderation` and `POST /moderation/{reportId}`. Decisions require reason; processed reports return 409 on repeat; hidden post images return 404.
- `GET /messages`, `GET|POST /messages/{uid}`: authenticated conversation pair only. No admin bypass. Fixture-only profiles cannot receive messages.
- `GET /notifications`, `POST /notifications/read`: current account only.
- `POST /me/capacity`: partner-only rows of category, productType, dailyUnits, batchSize, leadDays, committedUnits, availableFrom/To, weekdays (0=Sunday). Maximum 30 rows, 730-day window.

Data persists in account SQLite. Campaign and manufacturing workflow now uses the lifecycle backend with scoped reads and revision-checked commands; see [community and capacity details](CONG_DONG_VA_NANG_LUC_SAN_XUAT.md).

## Product lifecycle — 30/10/2026

- `GET /api/lifecycle/state?since=<revision>`: role-scoped canonical state, or unchanged; anonymous access returns public products/campaigns and no orders/payments.
- `POST /api/lifecycle/commands`: `{action, revision, payload}`; stale revision 409; server checks roles/ownership/transitions, serializes updates in a transaction.
- Actions: `product.create`, `campaign.create|approve|reject|activate|cancel|finish`; `feedback.create|reply`; `plan.publish|respond`; `rfq.create`; `quote.create|accept`; `production.update|plan`; `release.publish`; `shipment.create|receive`; `review.create|reply|report|moderate`; `return.create|decide`; `payment.sandbox`; `refund.complete`.
- `GET /api/lifecycle/products/{productId}`: public feedback/plan versions/releases/published reviews and star distribution; eligible orders and consent/order controls are current-customer-only.
- `GET /api/lifecycle/workspace`: account-scoped RFQs, quotes, shipments, returns, notices and consents; review reports admin-only.
- `GET /api/lifecycle/produced`: products with published completed-production releases.
- `GET /api/lifecycle/evaluation`: seller/admin saved model snapshots, final outcome comparisons and baseline errors; retrospective snapshots are labeled. No invented score when no ended outcome exists.
- `GET /api/lifecycle/alerts`: seller/partner/admin actionable MOQ, cancellation, overdue production and capacity warnings.

Storage: `lifecycle_state` and `lifecycle_items` in account SQLite. Checkout and canonical order/campaign updates share the same transaction. Model/job artifacts remain in training job storage. Payment sandbox does not move real funds; shipping events are manual/customer-confirmed. [Full workflow and limits](VONG_DOI_SAN_PHAM.md).
