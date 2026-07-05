## 1. Chart-Darstellung

- [x] 1.1 `frontend-food/src/components/charts/NutrientBalanceChart.tsx`: Nährstoffe mit `max = null` als Mindest-Schwelle darstellen (Wert ≥ min = erreicht), nicht als Soll-Säule auf dem Minimum
- [x] 1.2 Sicherstellen, dass Obergrenzen-Nährstoffe (Zucker, Salz) unverändert mit Maximum dargestellt werden
- [x] 1.3 `SollIstBar.tsx` und `NutritionView.tsx` prüfen (sollen bereits korrekt sein), ggf. angleichen

## 2. Datenhygiene Rules

- [x] 2.1 Check/Command: keine `fibre_g`-Rule mit gesetztem `max_green`/`max_yellow` (idempotent bereinigen)
- [x] 2.2 Re-Seed-Pfad (`seed_rules --clear`) dokumentieren/verifizieren

**Re-Seed Documentation:**
- Command: `uv run python manage.py seed_rules --clear`
- Effect: Deletes all existing rules, then re-seeds from RULES_DATA constants
- Verification: Run `uv run python manage.py check_fibre_rules` to confirm no fiber rules have max thresholds
- All fiber rules (day, meal_event, meal scopes) have been verified to have min_green/min_yellow only (no max)
- Idempotent: Safe to run multiple times, always results in correct state

## 3. Tests

- [x] 3.1 Frontend: Ballaststoff über Minimum → erreicht/positiv, nicht „zu viel"
- [x] 3.2 Frontend: Obergrenzen-Nährstoff über Maximum → weiterhin „zu viel"
- [x] 3.3 Backend: nach Bereinigung keine fibre_g-Rule mit Maximum

## 4. Abschluss

- [x] 4.1 Keine `console.log`/`print`
- [x] 4.2 Visuell auf Mobile prüfen
