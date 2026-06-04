## 1. Backend: Datenmodell & Migration

- [x] 1.1 Feld `activity_factor` aus `planner/models/meal_plan.py` (Klasse `MealPlan`) entfernen
- [x] 1.2 Property `scaling_factor` in `MealPlan` anpassen: `return self.norm_portions * self.reserve_factor`
- [x] 1.3 Migration erzeugen: `uv run python manage.py makemigrations planner` (RemoveField `activity_factor`)
- [x] 1.4 Migration anwenden: `uv run python manage.py migrate planner` und Erfolg verifizieren

## 2. Backend: Pydantic-Schemas

- [x] 2.1 `activity_factor` aus allen MealPlan-Schemas in `planner/schemas/meal_plan.py` entfernen (Create/Update/Out/Detail – alle Stellen, die das Feld führen)
- [x] 2.2 `MealPlanCostSummaryOut` (`planner/schemas/meal_plan.py:372`) um Reserve-Felder erweitern: `total_cost_without_reserve` und `total_cost_with_reserve` (Decimal); `total_cost` als Kosten ohne Reserve beibehalten oder klar umbenennen

## 3. Backend: Services & API

- [x] 3.1 `supply/services/shopping_service.py`: sicherstellen, dass `scaling = meal_plan.scaling_factor` nun `norm_portions × reserve_factor` ist (durch 1.2 automatisch); Docstring/Kommentar aktualisieren, kein PAL mehr
- [x] 3.2 `planner/api/meal_plan.py` Kosten-Endpoint (`GET /{meal_plan_id}/costs/`, ab Zeile 606): Gesamtkosten zusätzlich mit Reserve berechnen (`× reserve_factor`) und in der Response ausgeben
- [x] 3.3 `planner/api/meal_plan.py`: `activity_factor` aus der Copy-/Duplicate-Logik (Zeile ~219) entfernen
- [x] 3.4 `planner/services/pdf_export.py:100`: Ausgabe „Aktivitätsfaktor {meal_plan.activity_factor}" entfernen
- [x] 3.5 `core/management/commands/seed_all.py`: alle `activity_factor`-Zuweisungen aus den MealPlan-Seeds entfernen
- [x] 3.6 Repo-weiter Grep `activity_factor` im Backend ausführen und verbleibende Referenzen bereinigen

## 4. Backend: Tests

- [x] 4.1 Shopping-Service-Test: aggregierte Menge ohne PAL prüfen (`300 × norm_portions × reserve_factor`); bestehende Tests an neue `scaling_factor`-Definition anpassen
- [x] 4.2 Kosten-API-Test: Response enthält Kosten mit und ohne Reserve; `cost_with_reserve = cost_without_reserve × reserve_factor`
- [x] 4.3 Sicherstellen, dass keine Test-Factory/Seed mehr `activity_factor` setzt

## 5. Frontend (frontend-food): Schemas & UI

- [x] 5.1 Zod-MealPlan-Schema(s): `activity_factor` entfernen (1:1 synchron zu Pydantic)
- [x] 5.2 Zod-Kosten-Schema: Felder für Kosten mit/ohne Reserve ergänzen (synchron zu `MealPlanCostSummaryOut`)
- [x] 5.3 Essensplan-Einstellungen-UI: Aktivitätsfaktor-Eingabefeld entfernen
- [x] 5.4 Kosten-Tab-Komponente: Gesamtkosten „ohne Reserve" und „inkl. Reserve" anzeigen (klare deutsche Labels)
- [x] 5.5 Repo-weiter Grep `activity_factor` / `activityFactor` im Frontend ausführen und Referenzen bereinigen; TypeScript-Build muss fehlerfrei sein

## 6. Verifikation

- [x] 6.1 Plan #8 (`/meal-plans/8`) prüfen: Brot ergibt `6.48 kg` (mit Reserve 1.2) bzw. `5.4 kg` ohne Reserve – nicht mehr 11 kg
- [x] 6.2 Kosten-Tab zeigt beide Beträge korrekt; Nährwert-/Soll-Ist-Werte unverändert
- [x] 6.3 Backend-Tests und Frontend-Build grün
