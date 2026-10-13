import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / '.env', override=False)
AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', 'http://127.0.0.1:8001').rstrip('/')
CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if origin.strip()]
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://preora:preora_local_dev_only@localhost:5433/preora')
