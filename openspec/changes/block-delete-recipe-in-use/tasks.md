## 1. Backend: Löschregel und Usage

- [x] 1.1 `delete_recipe` um Prüfung auf `MealItem.objects.filter(recipe=recipe)` erweitern, 409 mit Planzahl, bestehenden Varianten-Check übernehmen
- [x] 1.2 Pydantic-Schema `RecipeUsageOut` und Endpunkt `GET /api/recipes/{id}/usage/` mit Sichtbarkeitsfilter für `plans`
- [x] 1.3 Tests: 409 bei Verwendung, Soft-Delete bei Nichtverwendung, Usage-Antwort inkl. fremdem privaten Plan

## 2. Backend: Konsistenz

- [x] 2.1 Soft-gelöschte Rezepte in der Plan-Berechnung ignorieren (`resolve_cost_eur`/`resolve_total_cost_eur` und kcal-Auflösung in `backend/planner/schemas/meal_plan.py`, `backend/planner/services/plan_check.py`) und in `duplicate_meal_plan` (`backend/planner/api/meal_plan.py`) überspringen
- [x] 2.2 Management-Command `cleanup_deleted_recipe_meal_items` mit Dry-Run als Standard und `--apply`
- [x] 2.3 Tests: Plan mit gelöschtem Bestandsrezept (Kosten = Einkaufsliste), Kopie ohne Eintrag, Command-Dry-Run

## 3. Frontend (frontend-food)

- [x] 3.1 Zod-Schema und TanStack-Query-Hook für `/usage/`
- [x] 3.2 Lösch-Dialog in `RecipeDetailPage.tsx`: Nutzung laden, Pläne mit Link zeigen, Button deaktivieren, 409-Meldung anzeigen
- [x] 3.3 Frontend-Test oder Smoke-Test für beide Dialogzustände, mobil ab 320 px prüfen

## 4. Abschluss

- [x] 4.1 `uv run pytest` für `recipe` und `planner` sowie Frontend-Typecheck und Lint
- [x] 4.2 Bereinigung in den gebündelten Prod-Rollout aufnehmen (Dry-Run zuerst, `--apply` nur nach OK, siehe `openspec/prod-rollout-prod-test-2026-10-03.md`)
