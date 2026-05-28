.PHONY: help install dev backend frontend db migrate seed-users reset test lint format typecheck pre-commit clean deploy build setup-infra build-frontend build-backend push-frontend push-backend deploy-frontend deploy-backend

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
FRONTEND_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/frontend
VPC_CONNECTOR ?= inspi-connector
CLOUD_SQL_INSTANCE ?= inspi-db
DB_PASSWORD ?= changeme

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------
# Setup
# -----------------------------------------------

install: install-backend install-frontend install-food ## Install all dependencies

install-backend: ## Install backend dependencies with uv
	cd backend && $(UV) sync

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

install-food: ## Install food frontend dependencies
	cd frontend-food && npm install

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

seed-users: ## Create seed users only
	$(MANAGE) add_users

import-inspi: ## Import data from legacy Inspi project
	$(MANAGE) import_inspi_data

generate-embeddings: ## Generate missing embeddings for all content types using Gemini
	$(MANAGE) generate_embeddings

generate-embeddings-force: ## Regenerate ALL embeddings (even existing ones)
	$(MANAGE) generate_embeddings --force

init-db: ## Initialize database: migrate + create users
	$(MANAGE) migrate
	$(MANAGE) add_users
	$(MANAGE) generate_embeddings
	@echo "Database initialized with migrations and users."

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

food: ## Start Food app with backend (port 5174 + 8000)
	@trap 'kill 0' EXIT; \
	$(MAKE) backend & \
	cd frontend-food && npm run dev & \
	wait

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

setup-infra: ## Create GCP infrastructure (one-time)
	@echo "Creating Artifact Registry..."
	gcloud artifacts repositories create inspi \
		--repository-format=docker \
		--location=$(GCP_REGION) \
		--description="Inspi container images" || true
	@echo "Creating VPC Connector..."
	gcloud compute networks vpc-access connectors create $(VPC_CONNECTOR) \
		--region=$(GCP_REGION) \
		--range=10.8.0.0/28 || true
	@echo "Creating Cloud SQL instance..."
	gcloud sql instances create $(CLOUD_SQL_INSTANCE) \
		--database-version=POSTGRES_15 \
		--tier=db-f1-micro \
		--region=$(GCP_REGION) \
		--network=default \
		--no-assign-ip || true
	@echo "Creating database and user..."
	gcloud sql databases create inspi --instance=$(CLOUD_SQL_INSTANCE) || true
	gcloud sql users create inspi \
		--instance=$(CLOUD_SQL_INSTANCE) \
		--password=$(DB_PASSWORD) || true
	@echo "Infrastructure setup complete."

build-backend: ## Build backend container image
	podman build -t $(BACKEND_IMAGE):latest -f Dockerfile.backend .

build-frontend: ## Build frontend container image
	podman build -t $(FRONTEND_IMAGE):latest -f Dockerfile.frontend .

push-backend: build-backend ## Push backend image to Artifact Registry
	podman push $(BACKEND_IMAGE):latest

push-frontend: build-frontend ## Push frontend image to Artifact Registry
	podman push $(FRONTEND_IMAGE):latest

deploy-backend: push-backend ## Deploy backend to Cloud Run
	$(eval DB_HOST := $(shell gcloud sql instances describe $(CLOUD_SQL_INSTANCE) --format='value(ipAddresses[0].ipAddress)' 2>/dev/null))
	gcloud run deploy inspi-backend \
		--image $(BACKEND_IMAGE):latest \
		--region $(GCP_REGION) \
		--port 8000 \
		--cpu 1 --memory 512Mi \
		--min-instances 0 --max-instances 10 \
		--vpc-connector $(VPC_CONNECTOR) \
		--set-env-vars DJANGO_SETTINGS_MODULE=inspi.settings.production,DB_HOST=$(DB_HOST),DB_NAME=inspi,DB_USER=inspi,DB_PASSWORD=$(DB_PASSWORD) \
		--allow-unauthenticated

deploy-frontend: push-frontend ## Deploy frontend to Cloud Run
	$(eval BACKEND_URL := $(shell gcloud run services describe inspi-backend --region=$(GCP_REGION) --format='value(status.url)' 2>/dev/null))
	gcloud run deploy inspi-frontend \
		--image $(FRONTEND_IMAGE):latest \
		--region $(GCP_REGION) \
		--port 80 \
		--cpu 1 --memory 256Mi \
		--min-instances 0 --max-instances 5 \
		--set-env-vars BACKEND_URL=$(BACKEND_URL) \
		--allow-unauthenticated

deploy: deploy-backend deploy-frontend ## Deploy everything (backend first, then frontend)

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
