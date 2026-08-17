## 1. Model & Migration

- [x] 1.1 Add `rule_type` CharField with choices `"min"`/`"max"` (default `"max"`) to `HealthRule` model in `backend/recipe/models/health_rule.py`
- [x] 1.2 Update `evaluate()` method to use `>=` comparisons when `rule_type="min"`
- [x] 1.3 Run `uv run python manage.py makemigrations recipe` and verify migration
- [x] 1.4 Run `uv run python manage.py migrate`

## 2. Admin

- [x] 2.1 Add `rule_type` to `list_display`, `list_filter`, and `list_editable` in `HealthRuleAdmin`

## 3. Seed-Daten

- [x] 3.1 Update `seed_all.py`: set `rule_type="max"` for Zucker, Energie, Kosten, Nutri-Score rules (IDs 1-6)
- [x] 3.2 Update `seed_all.py`: set `rule_type="min"` for all vitamin, mineral, protein, fibre rules (IDs 10-21, 30-32)

## 4. Verifikation

- [x] 4.1 Run seed command and verify rules have correct `rule_type` in DB
- [ ] 4.2 Manual test: open Tagesplan with empty day, confirm red dots appear for min-rules
