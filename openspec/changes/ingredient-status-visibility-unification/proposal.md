## Why

Zutaten haben heute zwei widersprüchliche Status-Welten:
- Die Model-Choices sind `draft`, `verified` und `user_content`.
- Der Zugriffscode (`food_access`, `supply/api/ingredients.py`) prüft an 15 Stellen auf `approved`, einen Wert, den es als Choice nicht gibt (5 Altzeilen aus Skripten/Tests).

Folgen:
- Alle 469 System-Zutaten, die in freigegebenen Rezepten stecken, sind Entwürfe und für Nicht-Staff unsichtbar (404 auf Zutaten-Links, auch für angemeldete Nutzer; leerer Frühstückskatalog).
- Neue Zutaten aus Rezept-Import und KI-Diensten werden ohne `created_by` angelegt. Ihr Ersteller findet sie danach nicht wieder, und beim nächsten Import entsteht eine Dublette („Nudeln“ 34×).
- Der Zutaten-Matcher sucht ohne Sichtbarkeitsfilter und kann **private Zutaten anderer Nutzer** vorschlagen.
- Die Sichtbarkeit ist doppelt definiert: Objekt-Prüfung (`can_read`) und Queryset widersprechen sich; parallele Frühstücks-Helfer sind toter Code.
- `Ingredient.visibility` kennt nur `private`/`shared`, das Pydantic-Ausgabeschema zusätzlich `public`/`group`.

## What Changes

- **BREAKING** Der Zutat-Status wird auf `draft` und `verified` reduziert (DB-CheckConstraint, Pydantic `Literal`, Zod `enum`). `user_content` entfällt. Recipe-Status bleibt unverändert.
- Datenmigration: `user_content` → `draft`, `approved` → `draft`. Keine Löschungen in der Migration; Altlasten wie „LauchTest“ räumt das Testdaten-Paket.
- Ein Sichtbarkeitsmodell in `content/services/food_access` für Objekt-Prüfung und Queryset gleichermaßen:
  - System-Zutaten (`owner=None`): `verified` öffentlich lesbar; Entwürfe nur für Creator, Collaborators und Staff.
  - Nutzer-Zutaten: `private`/`shared` wie bisher; `public` nur, wenn `verified`.
- Verifizieren (nur Staff): setzt `status=verified`; hat die Zutat einen Owner, wird zusätzlich `visibility=public` gesetzt. Der Owner bleibt erhalten, darf eine verifizierte Zutat aber nicht mehr bearbeiten. Neuer Visibility-Wert `public` im Model, nur über Verifizierung erreichbar (CheckConstraint `public ⇒ verified`).
- Bearbeitungsrecht: verifizierte Zutaten nur Staff; Portion-, Package- und Alias-Änderungen folgen derselben Regel. Die frühere Sonderregel „approved-System-Zutat darf jeder Angemeldete ergänzen“ entfällt.
- API liefert `can_verify` je Zutat; das Frontend nutzt dieses Flag statt `user.is_staff` (Regel aus `frontend-food/AGENTS.md`).
- Alle Erzeugungspfade setzen `status=draft` **und** `created_by` (Rezept-Erstellung, Rezept-Items, KI-Zutaten, KI-Vorschläge, URL-Import, Cooklang).
- Zutaten-Matcher: Kandidaten = für den Nutzer sichtbare Zutaten plus System-Entwürfe (`owner=None`), nie private Zutaten anderer Nutzer.
- Essenspläne dürfen weiterhin System-Entwürfe per ID aufnehmen (`allow_system_draft`); die Ausnahme wird in der Spec festgehalten.
- Neuer Befehl `verify_ingredients_in_approved_recipes` (Trockenlauf mit Lückenliste, `--apply`, idempotent, Audit-Log je Zutat).
- **BREAKING** Entfernt: `GET /api/supply/breakfast-catalog/debug/` sowie die toten Helfer `_can_view_ingredient_breakfast`, `_get_visible_ingredients_for_breakfast_qs`, `_can_view_recipe_breakfast`, `_get_visible_recipes_for_breakfast_qs` samt Tests.

## Capabilities

### New Capabilities
- `ingredient-status`: Erlaubte Status, Verifizierung (inkl. Sichtbarkeitsfolge), Rechte, Erzeugungspfade mit Ersteller, Migration, Verifizierungs-Befehl, kein Debug-Endpunkt.

### Modified Capabilities
- `food-access-policy`: Einheitliche Zutaten-Sichtbarkeit (Objekt und Queryset), Bearbeitungsrecht verifizierter Zutaten, Kandidatenregel für Matcher und Essenspläne.
- `ingredient-verify`: Badge ohne `user_content`, Verifizieren nur Staff (API-seitig), Button über `can_verify`.
- `cooklang-ingredient-autocreate`: Automatisch angelegte Zutaten erhalten `status=draft`.

## Impact

- **Backend-Model und Migration:** `supply/choices.py`, `supply/models/ingredient.py` (Status-Choices, Visibility `public`, zwei CheckConstraints); eine Migration mit `RunPython` vor `AddConstraint`.
- **Backend-API und Services:**
  - `content/services/food_access.py`: `can_read`, `can_edit`, `visible_ingredient_queryset`, `public_ingredient_queryset`
  - `supply/api/ingredients.py`: Rechte, Verifizieren, `can_verify`, tote Helfer; `supply/api/breakfast_catalog.py`; `recipe/api/recipes.py`
  - `recipe/services/ingredient_matcher.py`: Kandidatenfilter
  - Erzeugungspfade: `recipe/api/recipes.py:775`, `recipe/api/items.py:726`, `recipe/services/ai_ingredients_service.py:302`, `recipe/services/url_import_service.py:377, 1183`, `recipe/services/recipe_ai_suggest_service.py:321, 437`, `supply/services/ingredient_ai_suggest_service.py:349`, `recipe/management/commands/import_cooklang.py:540`
  - `content/admin_api.py`
- **Pydantic:** `supply/schemas/ingredients.py`: `status: Literal["draft", "verified"]`, `visibility: Literal["private", "shared", "public"]` (Ausgabe), `can_verify: bool`; Eingabe-Visibility bleibt `private`/`shared`.
- **Zod:** `frontend-food/src/schemas/supply.ts`: Status- und Visibility-Enums, `can_verify`.
- **Frontend (`frontend-food`):** `pages/ingredients/CreateIngredientPage.tsx`, `IngredientEditPage.tsx`, `IngredientDetailPage.tsx`, `components/recipe/RecipeSearchCard.tsx`, neue Datei `lib/ingredientStatus.ts`.
- **Tests:** 30 Zutaten-Erzeugungen mit `approved`/`user_content` in 16 Dateien. Tests in `supply/tests/test_api.py` (Aliase/Portionen durch Nicht-Staff an approved-Zutaten) drehen fachlich auf 403 bzw. wechseln auf Owner-Entwürfe. `supply/tests/test_breakfast_wizard_visibility.py` wird reduziert.
- **Daten:** lokal 469 Zutaten zu verifizieren (Lücken: 35 ohne kcal, 7 ohne Preis, 0 ohne Abteilung); auf Prod erst nach Trockenlauf und Freigabe.
