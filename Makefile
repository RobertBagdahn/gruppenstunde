.PHONY: help install dev backend frontend db migrate seed-users reset test lint format typecheck pre-commit clean deploy build setup-infra build-frontend build-frontend-food build-backend push-frontend push-frontend-food push-backend deploy-frontend deploy-frontend-food deploy-backend migrate-cloud kill-port smoke-test

# ============================================================
# Inspi – Makefile for local development
# ============================================================

UV := uv
MANAGE := cd backend && $(UV) run python manage.py
PODMAN := podman compose

# GCP settings – override via environment or .env
GCP_PROJECT ?= $(shell gcloud config get-value project 2>/dev/null)
GCP_REGION ?= europe-west3                # Artifact Registry + Cloud Build region
GCP_RUN_REGION ?= europe-west1            # Cloud Run deployment region (west1, was west3)
GCP_FOOD_REGION ?= europe-west1
BACKEND_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/backend
FRONTEND_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/frontend
FRONTEND_FOOD_IMAGE := $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT)/inspi/frontend-food
VPC_CONNECTOR ?= inspi-connector
CLOUD_SQL_INSTANCE ?= inspi-db-west1
CLOUD_SQL_CONNECTION_NAME ?= $(GCP_PROJECT):$(GCP_RUN_REGION):$(CLOUD_SQL_INSTANCE)
DB_PASSWORD ?= changeme
GCS_BUCKET_NAME ?= inspi-media

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
	$(MANAGE) add_users --if-empty

import-inspi: ## Import data from legacy Inspi project
	$(MANAGE) import_inspi_data

generate-embeddings: ## Generate missing embeddings for all content types using Gemini
	$(MANAGE) generate_embeddings

generate-embeddings-force: ## Regenerate ALL embeddings (even existing ones)
	$(MANAGE) generate_embeddings --force

init-db: ## Initialize database: migrate + create users
	$(MANAGE) migrate
	$(MANAGE) add_users --if-empty
	$(MANAGE) generate_embeddings
	@echo "Database initialized with migrations and users."

reset-db: ## Reset database completely (WARNING: destroys all data)
	$(PODMAN) down -v
	$(PODMAN) up -d db
	@echo "Waiting for PostgreSQL to start..."
	@sleep 3
	$(MANAGE) migrate
	$(MANAGE) add_users --if-empty
	$(MANAGE) seed_all --only recipes --if-empty
	$(MANAGE) seed_all --only planner --if-empty
	@echo "Database reset complete."

# -----------------------------------------------
# Development Servers
# -----------------------------------------------

kill-port: ## Kill process on given port (usage: make kill-port PORT=8000)
	@lsof -ti tcp:$(PORT) 2>/dev/null | xargs -r kill -9 && echo "  ✓ Killed process on port $(PORT)" || echo "  ✓ Port $(PORT) is free"

dev: ## Start both backend and frontend concurrently
	@echo "Checking ports..."
	@$(MAKE) kill-port PORT=8000
	@$(MAKE) kill-port PORT=5173
	@trap 'kill 0' EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

backend: ## Start Django dev server
	@$(MAKE) kill-port PORT=8000
	$(MANAGE) runserver

frontend: ## Start Vite dev server
	@$(MAKE) kill-port PORT=5173
	cd frontend && npm run dev

frontend-food: ## Start Food Vite dev server (port 5174)
	@$(MAKE) kill-port PORT=5174
	cd frontend-food && npm run dev

food: ## Start Food app with backend (port 5174 + 8000)
	@echo "Checking ports..."
	@$(MAKE) kill-port PORT=8000
	@$(MAKE) kill-port PORT=5174
	@trap 'kill 0' EXIT; \
	$(MAKE) backend & \
	cd frontend-food && npm run dev & \
	wait

smoke-test: ## Run Playwright end-to-end smoke tests
	@bash e2e/smoke-test.sh

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
	printf '%s\n' \
		"steps:" \
		"  - name: 'gcr.io/cloud-builders/docker'" \
		"    args: ['build', '-t', '$(BACKEND_IMAGE):latest', '-f', 'Dockerfile.backend', '.']" \
		"images:" \
		"  - '$(BACKEND_IMAGE):latest'" \
		> /tmp/cloudbuild-backend.yaml
	gcloud builds submit --config=/tmp/cloudbuild-backend.yaml --region=$(GCP_REGION) --project=$(GCP_PROJECT) .

build-frontend: ## Build frontend container image
	printf '%s\n' \
		"steps:" \
		"  - name: 'gcr.io/cloud-builders/docker'" \
		"    args: ['build', '-t', '$(FRONTEND_IMAGE):latest', '-f', 'Dockerfile.frontend', '.']" \
		"images:" \
		"  - '$(FRONTEND_IMAGE):latest'" \
		> /tmp/cloudbuild-frontend.yaml
	gcloud builds submit --config=/tmp/cloudbuild-frontend.yaml --region=$(GCP_REGION) --project=$(GCP_PROJECT) .

build-frontend-food: ## Build food frontend container image
	printf '%s\n' \
		"steps:" \
		"  - name: 'gcr.io/cloud-builders/docker'" \
		"    args: ['build', '-t', '$(FRONTEND_FOOD_IMAGE):latest', '-f', 'Dockerfile.frontend-food', '.']" \
		"images:" \
		"  - '$(FRONTEND_FOOD_IMAGE):latest'" \
		> /tmp/cloudbuild-frontend-food.yaml
	gcloud builds submit --config=/tmp/cloudbuild-frontend-food.yaml --region=$(GCP_REGION) --project=$(GCP_PROJECT) .

push-backend: build-backend ## Push backend image to Artifact Registry
	@echo "Backend image was pushed by Cloud Build."

push-frontend: build-frontend ## Push frontend image to Artifact Registry
	@echo "Frontend image was pushed by Cloud Build."

push-frontend-food: build-frontend-food ## Push food frontend image to Artifact Registry
	@echo "Food frontend image was pushed by Cloud Build."

deploy-backend: push-backend ## Deploy backend to Cloud Run (west1)
	gcloud run deploy inspi-backend \
		--image $(BACKEND_IMAGE):latest \
		--region $(GCP_RUN_REGION) \
		--add-cloudsql-instances $(CLOUD_SQL_CONNECTION_NAME) \
		--project $(GCP_PROJECT)

migrate-cloud: ## Run Django migrations via Cloud Run job (west3, connects to west1 DB)
	gcloud run jobs execute inspi-migrate --region europe-west3 --wait

deploy-frontend: push-frontend ## Deploy frontend to Cloud Run (west1)
	gcloud run deploy inspi-frontend \
		--image $(FRONTEND_IMAGE):latest \
		--region $(GCP_RUN_REGION) \
		--project $(GCP_PROJECT)

deploy-frontend-food: push-frontend-food ## Deploy food frontend to Cloud Run (west1)
	gcloud run deploy inspi-frontend-food \
		--image $(FRONTEND_FOOD_IMAGE):latest \
		--region $(GCP_RUN_REGION) \
		--project $(GCP_PROJECT)

deploy: deploy-backend migrate-cloud deploy-frontend deploy-frontend-food ## Deploy everything (backend first, migrations, then frontends)

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
