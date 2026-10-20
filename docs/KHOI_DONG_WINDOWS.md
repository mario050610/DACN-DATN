# Khoi dong PREORA tren Windows

Double-click `START_PREORA_WITH_AI.bat` (hoac `START_PREORA.bat`, `START_ALL_SERVICES.bat`). Launcher se:

1. Bat Docker Desktop neu Docker engine chua chay, roi `docker compose up -d --wait db` de bat PostgreSQL.
2. Dung Ollama dang chay, hoac tu bat Ollama da cai. Doc `OLLAMA_URL` va `OLLAMA_MODEL` tu `.env` (bien moi truong duoc uu tien). Model mac dinh la `qwen3:8b`; neu thieu se tu tai model, lan dau co the mat nhieu phut va nhieu GB.
3. Bat AI service (8001), backend (8000), frontend (5173); dung lai dich vu dang phan hoi tren cac URL nay.
4. Cho frontend san sang roi mo http://127.0.0.1:5173 trong trinh duyet mac dinh.

Can cai Docker Desktop, Ollama, Node.js 22.12+ va Python 3.11+ truoc. Python virtualenv va dependencies se duoc chuan bi o lan chay dau. Log dich vu nam trong `tmp/startup/`. Neu mot thanh phan bi loi, launcher van thu bat cac thanh phan con lai va hien loi cu the; khong bao thanh cong toan bo khi con loi.

PostgreSQL chay trong Docker. Backend va AI chay local, giu nguyen du lieu tai khoan SQLite local, tranh chay them backend Docker trung cong. Khong chay `docker compose up` toan bo song song voi launcher local.

Co the dong cua so launcher sau khi hoan tat; cac dich vu tiep tuc chay. Docker Desktop quan ly PostgreSQL; frontend/backend/AI chay nen va ghi log. De dung mot dich vu local, tim PID tren cong tuong ung bang `Get-NetTCPConnection -LocalPort 5173,8000,8001 -State Listen`, sau do dung dung tien trinh do. Khong dung Ollama hoac Docker khi ung dung khac dang su dung.

AI service forecast van la scaffold chua nap model; chatbot ho tro dung Ollama. Launcher khong train model forecast.
