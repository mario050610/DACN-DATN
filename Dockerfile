# Build the existing React app; Node is not needed in the runtime image.
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim-bookworm AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    AUTH_DATABASE_PATH=/var/data/accounts.sqlite3 \
    TRAINING_JOBS_DIR=/var/data/ai-training \
    AUTH_COOKIE_SECURE=true \
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
# Use the worker's existing Linux virtualenv contract for both API and training.
RUN python -m venv /app/ai-service/.venv
ENV PATH="/app/ai-service/.venv/bin:$PATH"
COPY backend/requirements.txt /app/backend/requirements.txt
COPY ai-service/requirements.txt /app/ai-service/requirements.txt
COPY ai-service/training/requirements.txt /app/ai-service/training/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt -r ai-service/training/requirements.txt
COPY backend/app /app/backend/app
COPY ai-service/training /app/ai-service/training
COPY database/seeds /app/database/seeds
COPY --from=frontend /build/dist /app/frontend/dist
RUN mkdir -p /var/data /app/ai-service/data/raw /app/ai-service/data/processed
WORKDIR /app/backend
EXPOSE 10000
# One API process shares SQLite revisions and the existing single-job ML lock.
CMD ["sh", "-c", "exec python -m uvicorn app.hosted:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
