## 1. Backend: Split-Validierung korrigieren

- [x] 1.1 `_validate_split_shares` in `backend/planner/api/meal_plan.py` anpassen: Optionale Items nur auf 0.0–1.0 prüfen (nicht Σ=1.0), Exchange-Gruppen unverändert Σ=1.0. Kontext-abhängige Fehlermeldungen.

## 2. Backend: get_included_fractions korrigieren

- [x] 2.1 `get_included_fractions` in `backend/planner/services/split_service.py` anpassen: Für optionale Items `share` direkt als Inklusions-Fraktion verwenden (`fractions[ri.id] = splits[ri.id]`). Kein `largest_remainder_round` für Gruppen mit nur einem Eintrag.

## 3. Tests

- [x] 3.1 Bestehende Exchange-Tests (`test_exchanges_and_splits.py`) prüfen: `test_invalid_sum_rejected` und `test_valid_sum_accepted` müssen weiterhin grün sein.
- [x] 3.2 Neue Tests in `test_exchanges_and_splits.py` für optionale Items: `test_optional_share_accepted` (share=0.6 → 200), `test_optional_share_zero_accepted` (share=0.0 → 200), `test_optional_share_invalid_rejected` (share=-1 oder 2.0 → 400).
- [x] 3.3 Neue Tests für `get_included_fractions` mit optionalen Items: `test_optional_fraction_direct` (share=0.6 → fraction 0.6), `test_optional_fraction_zero` (share=0.0 → fraction 0.0), Sicherstellen dass Exchange-Rounding weiterhin funktioniert.

## 4. Verifikation

- [x] 4.1 Alle Tests laufen lassen: `uv run pytest recipe/tests/test_exchanges_and_splits.py -xvs` → 34 passed, 1 skipped
- [x] 4.2 Manuell testen: MealPlan mit optionaler Zutat anlegen, Split mit share=0.6 via API speichern → HTTP 200 prüfen
