## 1. Backend

- [x] 1.1 Toleranz in `recipe/api/items.py:174` von `max(abs(expected) * 0.01, 0.01)` auf `max(abs(expected) * 0.15, 2.0)` ändern

## 2. Tests

- [x] 2.1 `test_mismatched_update_is_rejected` anpassen: Testwerte so wählen, dass sie außerhalb der neuen Toleranz liegen (z.B. `expected=3.0`, `quantity=0.5` → 50g, Differenz 47g > max(0.45, 2) → rejected)
- [x] 2.2 Neue Testfälle für Grenzwerte der neuen Toleranz: Legitime Variation knapp innerhalb (expected 50g, result 48g → accepted) und Floating-Point-Noise (expected 1g, result 0.99g → accepted)
- [x] 2.3 `uv run pytest recipe/tests/test_recipe_item_plausibility_guard.py` ausführen
