## 1. Fix Migration Drift

- [x] 1.1 Un-fake migration supply/0013: `uv run python manage.py migrate supply 0012 --fake`
- [x] 1.2 Re-apply migration: `uv run python manage.py migrate supply 0013`
- [x] 1.3 Verify column is gone: Check `supply_contentmaterialitem` no longer has `quantity_type`

## 2. Re-run Seed

- [x] 2.1 Run `uv run python manage.py seed_all` — verify no errors
- [x] 2.2 Verify Brotzeit has ingredients: Check `RecipeItem.objects.filter(recipe__title="Brotzeit").count() == 5`
