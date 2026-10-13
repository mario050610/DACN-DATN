# PREORA Frontend

Frontend React 19 + TypeScript + Vite + Tailwind CSS 4, giữ nguyên mã giao diện từ Figma Make của nhóm.

Yêu cầu: **Node.js 22.12+**, npm, Internet lần cài đầu.

```powershell
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173. Frontend vẫn dùng `DemoStore.tsx`/localStorage và `demoForecastApi` (mô phỏng) nên **chạy độc lập, không cần bật Backend/AI/PostgreSQL**. Vite đã cấu hình proxy `/api` tới http://127.0.0.1:8000 để tiện chuyển sang backend sau này.

Kiểm tra: `npm run typecheck` và `npm run build`.
