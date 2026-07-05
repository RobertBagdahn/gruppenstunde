## 1. Backend Schema-Änderungen

- [x] 1.1 `start_datetime` in `MealPlanCreateIn` required machen
- [x] 1.2 `end_datetime` als Pflichtfeld zu `MealPlanDuplicateIn` hinzufügen
- [x] 1.3 Meta-Felder (`meals_copied`, `items_copied`, `overrides_copied`) zu `MealPlanOut` und `MealPlanDetailOut` hinzufügen

## 2. Backend Model + Migration

- [x] 2.1 `start_datetime` auf `MealPlan`-Model auf `null=False` ändern
- [x] 2.2 Data-Migration für bestehende NULL-Einträge (auf `created_at`-Datum setzen)
- [x] 2.3 Schema-Migration erstellen und ausführen

## 3. Backend Algorithmus

- [x] 3.1 Day-Index-basierten Duplicate-Algorithmus implementieren
- [x] 3.2 Day-Mismatch-Validierung (`end_datetime` - `start_datetime` == source duration)
- [x] 3.3 Meta-Felder im View nach dem Klonen befüllen

## 4. Backend Tests

- [x] 4.1 Test: erfolgreicher Duplicate mit Tag-Mapping
- [x] 4.2 Test: Day-Mismatch gibt 400
- [x] 4.3 Test: Uhrzeiten bleiben exakt erhalten

## 5. Frontend Schema-Sync (Zod)

- [x] 5.1 `end_datetime` zu `MealPlanDuplicateInSchema` hinzufügen
- [x] 5.2 Meta-Felder (`meals_copied`, `items_copied`, `overrides_copied`) zu `MealPlanSchema` und `MealPlanDetailSchema` hinzufügen

## 6. Frontend API-Integration

- [x] 6.1 `useDuplicateMealPlan`-Hook um `end_datetime` erweitern
- [x] 6.2 `MealEventListPage`: Duplicate-Button unsichtbar bei fehlenden Daten, `end_datetime` mitsenden
- [x] 6.3 `MealPlanWizardPage`: `end_datetime` im Duplicate-Aufruf ergänzen
