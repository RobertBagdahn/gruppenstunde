## 1. Backend — usage_count Feld auf Ingredient

- [x] 1.1 `usage_count` Feld auf Ingredient Model hinzufügen (`IntegerField(default=0)`) in `backend/supply/models/ingredient.py`
- [x] 1.2 Django Migration erstellen und ausführen (`uv run python manage.py makemigrations supply`, `uv run python manage.py migrate`)
- [x] 1.3 Backfill-Management-Command erstellen (`backend/supply/management/commands/backfill_ingredient_usage_count.py`) — zählt RecipeItem pro Ingredient über portion FK
- [x] 1.4 Django Signals in `backend/recipe/signals.py` erstellen: post_save/post_delete auf RecipeItem (increment/decrement usage_count), post_save auf RecipeItem bei portion-Wechsel (altes Ingredient decrement, neues increment)
- [x] 1.5 Signal-Konfiguration in `backend/recipe/apps.py` anmelden (bereits registriert via `recipe.signals` Import)

## 2. Backend — Suggest-Endpunkt erweitern

- [x] 2.1 `fuzzy_match.py` erweitern: `usage_count`, `nutri_class`, `price_per_kg` in die Query aufnehmen, Sortierung auf `(-similarity, -usage_count)`, Default-Limit von 5 auf 15 ändern, Max-Limit 30 hinzufügen
- [x] 2.2 Suggest-Response-Schema in `backend/supply/schemas/ingredients.py` erstellen (`IngredientSuggestOut` mit id, name, slug, similarity, matched_via, nutri_class, price_per_kg, usage_count)
- [x] 2.3 Suggest-Endpunkt in `backend/supply/api/ingredients.py` aktualisieren: `response=list[IngredientSuggestOut]`, Limit-Validierung (max 30), Default 15
- [x] 2.4 `usage_count` zu `IngredientDetailOut` und `IngredientListOut` Schemas hinzufügen

## 3. Backend — Tests

- [x] 3.1 Unit-Tests für usage_count Signals (create, delete, portion-change, no-below-zero) in `backend/supply/tests/test_ingredient_usage_count.py`
- [x] 3.2 Backfill-Command Test in `backend/supply/tests/test_backfill_ingredient_usage_count.py`
- [x] 3.3 Suggest-Endpunkt Integrationstest aktualisieren: neue Felder, Limit-Parameter, Sekundär-Sortierung nach usage_count

## 4. Frontend-Food — Autocomplete umstellen

- [x] 4.1 Zod-Schema für Suggest-Response erstellen/aktualisieren in `frontend-food/src/schemas/supply.ts` (id, name, slug, similarity, matched_via, nutri_class, price_per_kg, usage_count)
- [x] 4.2 `IngredientAutocomplete` umschreiben: API-Call von `GET /api/ingredients/?name=&page_size=8` auf `GET /api/ingredients/suggest/?q=&limit=15`, Response-Typ anpassen
- [x] 4.3 Ghost-Text entfernen (nicht mehr zuverlässig mit Trigram-Ranking)
- [x] 4.4 Dropdown-UI erweitern: Nutri-Score-Badge (farbig A–E), Preis pro kg (`X.XX €/kg`), usage_count (`N× verwendet`) anzeigen
- [x] 4.5 Nutri-Score-Badge-Komponente erstellen oder bestehende wiederverwenden (farbige Badges wie in IngredientCard)

## 5. Schema-Sync & Cleanup

- [x] 5.1 Pydantic-Schemas (Backend) und Zod-Schemas (Frontend-Food) auf Synchronität prüfen
- [x] 5.2 `IngredientListOut` Response in regulärem List-Endpunkt um `usage_count`-Feld ergänzt
- [x] 5.3 Keine console.log / print-Statements im Frontend-Code