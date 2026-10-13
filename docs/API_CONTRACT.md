# PREORA — Draft API Contracts

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
