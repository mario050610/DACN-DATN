# PREORA — Draft API Contracts

## Hiện trạng API (19/10/2026)

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
