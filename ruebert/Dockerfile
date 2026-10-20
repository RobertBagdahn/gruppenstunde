# Rübert demo container: built frontend + API in one image, served on Cloud Run.
# Build context is ruebert/. The v1 database is copied in by CI (data/seed_demand.duckdb, not in git).

# Static output is platform-independent, so the frontend builds on the native build platform (esbuild crashes under emulation).
FROM --platform=$BUILDPLATFORM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    FRONTEND_DIST=/app/frontend/dist \
    PORT=8080
WORKDIR /app

# Dependencies exactly as locked in backend/uv.lock; the application runs from source (REPO_ROOT = /app).
COPY backend/pyproject.toml backend/uv.lock /app/backend/
RUN pip install --no-cache-dir uv && \
    cd /app/backend && \
    uv export --frozen --no-dev --no-emit-project --no-hashes > /tmp/requirements.txt && \
    uv pip install --system --no-cache -r /tmp/requirements.txt

COPY backend/ /app/backend/
COPY knowledge/ /app/knowledge/
COPY journal/ /app/journal/
COPY data/ /app/data/
COPY --from=frontend /build/dist /app/frontend/dist

# Derived store built from the v1 database at image build time; `make nuke && make rebuild` produces the same file.
RUN cd /app/backend && python -m ruebert.data rebuild

WORKDIR /app/backend
EXPOSE 8080
# One worker: the derived store is read-only, the journal is local to the instance.
CMD ["sh", "-c", "exec uvicorn ruebert.main:app --host 0.0.0.0 --port ${PORT}"]
