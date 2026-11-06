import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / '.env', override=False)
AI_SERVICE_URL = os.getenv('AI_SERVICE_URL', 'http://127.0.0.1:8001').rstrip('/')
CORS_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if origin.strip()]
# Render supplies this trusted environment value after assigning the public URL.
# Keep cookie authentication same-origin without allowing arbitrary request origins.
PUBLIC_ORIGIN = (os.getenv('PUBLIC_ORIGIN') or os.getenv('RENDER_EXTERNAL_URL', '')).rstrip('/')
if PUBLIC_ORIGIN and PUBLIC_ORIGIN not in CORS_ORIGINS:
    CORS_ORIGINS.append(PUBLIC_ORIGIN)
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://preora:preora_local_dev_only@localhost:5433/preora')
