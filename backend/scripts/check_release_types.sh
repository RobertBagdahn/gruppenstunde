#!/bin/sh
set -eu

uv run --extra dev mypy --follow-imports=silent \
  core/errors.py \
  core/middleware.py \
  core/services/ai_budget.py \
  core/services/background.py \
  core/services/database_capacity.py \
  core/management/commands/check_database_capacity.py \
  content/admin_api.py \
  content/api/admin.py \
  content/services/embedding_service.py \
  recipe/api/items.py \
  recipe/schemas/__init__.py \
  recipe/schemas/items.py \
  recipe/schemas/recipes.py \
  recipe/management/commands/audit_exchange_alternatives.py \
  supply/api/ingredient_statistics.py \
  planner/api/buffet.py
