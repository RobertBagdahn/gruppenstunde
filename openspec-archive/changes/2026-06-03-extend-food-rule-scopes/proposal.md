## Why

Die aktuellen Rezeptregeln werden zu breit auf alle Rezepttypen angewendet, obwohl sie fachlich nur für Kalte und Warme Mahlzeiten sinnvoll sind. Gleichzeitig fehlen konsistente Preis-, Gewicht- und Nutri-Regeln über Rezept-, Mahlzeit-, Tages- und Gesamtplaner-Ebene, sodass der Planer nicht dieselben Qualitätsaussagen wie die Rezeptanalyse liefern kann.

## What Changes

- Rezeptregeln werden auf Rezeptebene nur noch für `warm_meal` und `cold_meal` ausgewertet.
- Für andere Rezepttypen zeigt das Food Frontend einen Hinweis, dass Rezeptregeln dort nicht sinnvoll sind und die Regeln im Planer auf Mahlzeit-Ebene angewendet werden.
- Regelparameter werden um Preis-, Gewicht- und Nutri-Score-Auswertungen ergänzt, soweit sie noch nicht in den Aggregationen verfügbar sind.
- Die gleichen fachlichen Regelideen werden auf `recipe`, `meal`, `day` und `meal_event` abgebildet, mit scope-spezifischen Schwellenwerten.
- Der Planer wertet die entsprechenden Regeln für alle Mahlzeittypen aus, also auch Frühstück, Snack, Nachtisch, Getränke und einfache Mahlzeiten.
- Seed-Daten für Regeln werden erweitert, damit neue Installationen sinnvolle Standardregeln erhalten.
- Food-Admin-Regelverwaltung bleibt die zentrale Stelle, an der Regeln sichtbar und editierbar sind.

## Capabilities

### New Capabilities

- Keine neuen Capabilities.

### Modified Capabilities

- `recipe-rules-display`: Rezeptregeln gelten nur für Kalte und Warme Mahlzeiten; andere Rezepttypen zeigen einen erklärenden Hinweis statt einer Regelbewertung.
- `meal-plan-suggestions`: Planer-Vorschläge sollen Preis-, Gewicht-, Nutri- und Nährstoffregeln über Mahlzeit, Tag und Gesamtplan auswerten.
- `meal-cockpit`: Die Aggregations- und Regelbasis für Mahlzeiten muss dieselben regelbaren Parameter wie die Rezeptanalyse unterstützen, inklusive Preis, Gewicht und Nutri-Score.
- `seed-data`: Standard-Regeln werden um Preis-, Gewicht-, Nutri- und weitere sinnvolle Nährstoffregeln für alle relevanten Scopes erweitert.
- `food-admin`: Die Regelverwaltung muss die neuen Parameter und scope-spezifischen Standardregeln nachvollziehbar anzeigen und bearbeiten können.

## Impact

- Backend: `backend/recipe/services/recipe_checks.py`, `backend/recipe/services/nutrition_aggregation.py`, `backend/recipe/services/suggestion_service.py`, `backend/recipe/models/recipe.py`, `backend/recipe/management/commands/seed_rules.py`, Tests in `backend/recipe/tests/` und ggf. `backend/planner/tests/`.
- APIs: `GET /api/recipes/{recipe_id}/rules/` und `GET /api/meal-plans/{meal_plan_id}/suggestions/` behalten ihre URLs, liefern aber fachlich angepasste Ergebnisse.
- Schemas: Backend-Pydantic-Schemas für Rezeptregeln und Planer-Vorschläge prüfen; Frontend-Zod-Schemas in `frontend-food/src/schemas/recipe.ts` und `frontend-food/src/schemas/suggestions.ts` synchron halten, falls Antwortfelder erweitert werden.
- Frontend: `frontend-food/src/components/recipe/RecipeRulesBox.tsx`, `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`, `frontend-food/src/components/suggestions/*`, Food-Admin-Regelkomponenten in `frontend-food/src/pages/admin/RuleTab.tsx` und `frontend-food/src/components/admin/RuleEditDialog.tsx`.
- Datenbank: Migration für zusätzliche gecachte Rezeptwerte, falls `weight_g` oder andere aggregierte Werte als Cache-Feld gespeichert werden.
