#!/bin/sh
set -eu

uv run --extra dev ruff format --check \
  content/admin_api.py \
  content/api/admin.py \
  content/services/embedding_service.py \
  content/tests/test_ai_interaction_api.py \
  content/tests/test_embedding_service.py \
  core/errors.py \
  core/middleware.py \
  core/services/ai_budget.py \
  core/services/background.py \
  inspi/settings/production.py \
  planner/api/buffet.py \
  recipe/api/items.py \
  recipe/schemas/__init__.py \
  recipe/schemas/items.py \
  recipe/schemas/recipes.py \
  recipe/tests/test_exchanges_and_variants.py \
  recipe/tests/test_ingredient_replacement.py \
  supply/api/ingredient_statistics.py
