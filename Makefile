.PHONY: help install dev backend frontend db migrate seed seed-fixtures seed-users seed-data reset test lint format typecheck pre-commit clean deploy build

# ============================================================
# Inspi – Makefile for local development
# ============================================================

UV := uv
MANAGE := cd backend && $(UV) run python manage.py
PODMAN := podman compose

# GCP settings – override via environment or .env
GCP_PROJECT ?= $(shell gcloud config get-value project 2>/dev/null)
GCP_REGION ?= europe-west3
BACKEND_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/backend
DB_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/db

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------
# Setup
# -----------------------------------------------

install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install backend dependencies with uv
	cd backend && $(UV) sync

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

pre-commit-install: ## Install pre-commit hooks
	$(UV) pip install pre-commit
	pre-commit install
	pre-commit install --hook-type pre-push

# -----------------------------------------------
# Database
# -----------------------------------------------

db: ## Start PostgreSQL with Podman
	$(PODMAN) up -d db

db-stop: ## Stop PostgreSQL
	$(PODMAN) down

migrate: ## Run Django migrations
	$(MANAGE) migrate

makemigrations: ## Create new migrations
	$(MANAGE) makemigrations

createsuperuser: ## Create Django superuser
	$(MANAGE) createsuperuser

seed: ## Load seed data (users + dynamic data)
	$(MANAGE) add_users
	$(MANAGE) seed_all

seed-users: ## Create seed users only
	$(MANAGE) add_users

seed-data: ## Seed dynamic test data only (sessions, recipes, events, etc.)
	$(MANAGE) seed_all

generate-embeddings: ## Generate missing embeddings for all content types using Gemini
	$(MANAGE) generate_embeddings

generate-embeddings-force: ## Regenerate ALL embeddings (even existing ones)
	$(MANAGE) generate_embeddings --force

init-db: ## Initialize database: migrate + seed (users + dynamic data)
	$(MANAGE) migrate
	$(MANAGE) add_users
	$(MANAGE) seed_all
	$(MANAGE) generate_embeddings
	@echo "Database initialized with migrations, seed data, and users."

reset-db: ## Reset database completely (WARNING: destroys all data)
	$(PODMAN) down -v
	$(PODMAN) up -d db
	@echo "Waiting for PostgreSQL to start..."
	@sleep 3
	$(MANAGE) migrate
	$(MANAGE) createsuperuser --noinput --email admin@inspi.dev || true
	@echo "Database reset complete."

# -----------------------------------------------
# Development Servers
# -----------------------------------------------

dev: ## Start both backend and frontend concurrently
	@trap 'kill 0' EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

backend: ## Start Django dev server
	$(MANAGE) runserver

frontend: ## Start Vite dev server
	cd frontend && npm run dev

# -----------------------------------------------
# Code Quality
# -----------------------------------------------

test: ## Run all tests
	cd backend && $(UV) run pytest

test-cov: ## Run tests with coverage report
	cd backend && $(UV) run pytest --cov --cov-report=html
	@echo "Coverage report: backend/htmlcov/index.html"

test-fast: ## Run fast tests only (skip slow)
	cd backend && $(UV) run pytest -m "not slow" -x -q

lint: ## Run ruff linter
	cd backend && $(UV) run ruff check .

lint-fix: ## Run ruff linter with auto-fix
	cd backend && $(UV) run ruff check --fix .

format: ## Format code with ruff
	cd backend && $(UV) run ruff format .

typecheck: ## Run mypy type checking
	cd backend && $(UV) run mypy .

check: lint typecheck test-fast ## Run all checks (lint + types + fast tests)

pre-commit: ## Run all pre-commit hooks
	pre-commit run --all-files

# -----------------------------------------------
# Frontend
# -----------------------------------------------

frontend-build: ## Build frontend for production
	cd frontend && npm run build

frontend-lint: ## Lint frontend code
	cd frontend && npm run lint

frontend-typecheck: ## TypeScript type check
	cd frontend && npx tsc --noEmit

# -----------------------------------------------
# GCP Cloud Run Deployment
# -----------------------------------------------

collectstatic: ## Collect Django static files
	$(MANAGE) collectstatic --noinput

artifact-repo: ## Create Artifact Registry repo (one-time)
	gcloud artifacts repositories create inspi \
		--repository-format=docker \
		--location=$(GCP_REGION) \
		--description="Inspi container images" || true

build-backend: ## Build backend container image
	podman build -t $(BACKEND_IMAGE):latest -f Dockerfile.backend .

build-db: ## Build DB container image with pgvector
	podman build -t $(DB_IMAGE):latest -f Dockerfile.db .

push-backend: build-backend ## Push backend image to Artifact Registry
	podman push $(BACKEND_IMAGE):latest

push-db: build-db ## Push DB image to Artifact Registry
	podman push $(DB_IMAGE):latest

deploy-db: push-db ## Deploy PostgreSQL to Cloud Run with volume
	gcloud run deploy inspi-db \
		--image $(DB_IMAGE):latest \
		--region $(GCP_REGION) \
		--port 5432 \
		--cpu 1 --memory 1Gi \
		--min-instances 1 --max-instances 1 \
		--no-cpu-throttling \
		--execution-environment gen2 \
		--add-volume name=pgdata,type=cloud-storage,bucket=inspi-pgdata-$(GCP_PROJECT) \
		--add-volume-mount volume=pgdata,mount-path=/var/lib/postgresql/data \
		--set-env-vars POSTGRES_DB=inspi,POSTGRES_USER=inspi,POSTGRES_PASSWORD=$(DB_PASSWORD) \
		--no-allow-unauthenticated

deploy-backend: push-backend ## Deploy backend to Cloud Run
	gcloud run deploy inspi-backend \
		--image $(BACKEND_IMAGE):latest \
		--region $(GCP_REGION) \
		--port 8000 \
		--cpu 1 --memory 512Mi \
		--min-instances 0 --max-instances 10 \
		--set-env-vars DJANGO_SETTINGS_MODULE=inspi.settings.production \
		--allow-unauthenticated

deploy-frontend: frontend-build ## Deploy frontend to GCS
	gsutil -m rsync -r frontend/dist/ gs://gruppenstunde-static/

deploy: deploy-db deploy-backend deploy-frontend ## Deploy everything

# -----------------------------------------------
# OpenTofu (GCP Infrastructure)
# -----------------------------------------------

ENV ?= prod

tf-init: ## Initialize OpenTofu
	cd terraform && tofu init -backend-config="prefix=terraform/$(ENV)" -reconfigure

tf-plan: ## Plan OpenTofu changes
	cd terraform && tofu plan -var-file=env/$(ENV).tfvars

tf-apply: ## Apply OpenTofu changes
	cd terraform && tofu apply -var-file=env/$(ENV).tfvars

tf-destroy: ## Destroy OpenTofu infrastructure (DANGER)
	cd terraform && tofu destroy -var-file=env/$(ENV).tfvars

tf-output: ## Show OpenTofu outputs
	cd terraform && tofu output

tf-state-bucket: ## Create GCS bucket for OpenTofu state (one-time)
	gsutil mb -l $(GCP_REGION) gs://inspi-terraform-state/ || true
	gsutil versioning set on gs://inspi-terraform-state/

# -----------------------------------------------
# Cleanup
# -----------------------------------------------

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/htmlcov backend/.coverage
	rm -rf frontend/dist frontend/node_modules/.vite
	@echo "Cleaned."
