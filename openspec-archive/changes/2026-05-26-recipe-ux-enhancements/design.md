## Context

Inspi hat bereits ein vollständiges Rezept-, MealPlan- und Shopping-System. Die 10 neuen Features erweitern bestehende Apps um UX-Verbesserungen. Keine neuen Apps nötig — alles wird in `recipe`, `supply`, `planner` und `shopping` integriert.

Bestehende relevante Models: `Recipe`, `RecipeItem`, `Ingredient`, `Portion`, `MeasuringUnit`, `MealPlan`, `Meal`, `MealItem`, `ShoppingList`, `ShoppingListItem`.

## Goals / Non-Goals

**Goals:**
- Rezepte schneller erfassen (URL-Import, Autocomplete, Fuzzy-Match)
- Bessere Offline-Nutzung auf Lagern (PDF-Export, Druckversion)
- Flexiblere Planung (Overrides, Simple Meals, Ordner)
- Intelligentere Einheiten-Handhabung (Umrechnung)

**Non-Goals:**
- Cooklang-Support (zu nischig)
- Offline-PWA / Service Worker
- Multi-User Echtzeit-Editing im MealPlan (Shopping hat bereits WebSocket)
- Rezept-Import aus Dateien (.cook, .json)

## Decisions

### 1. URL-Import: Server-side Scraping mit Structured Data

**Entscheidung:** Backend-Service scrapt URL, extrahiert Schema.org/JSON-LD Recipe, mappt auf unser Model.

**Alternativen:**
- Client-side Parsing → CORS-Probleme, unzuverlässig
- Browser-Extension → Zu viel Aufwand

**Umsetzung:**
- `backend/recipe/services/import_service.py` — Neuer Service
- `POST /api/recipes/import-from-url/` — Neuer Endpunkt
- Parsers: Schema.org JSON-LD (generisch), Chefkoch (fallback scraping)
- Response: Preview-Daten, User bestätigt vor Speicherung
- Dependency: `httpx` (bereits vorhanden), `beautifulsoup4` (neu)

### 2. Einheiten-Umrechnung: Neues Model `UnitConversion`

**Entscheidung:** Dediziertes Model in `supply` App mit optionalem Ingredient-FK für zutatspezifische Dichten.

**Model:**
```
UnitConversion:
  from_unit: FK(MeasuringUnit)
  to_unit: FK(MeasuringUnit)
  factor: Decimal
  ingredient: FK(Ingredient, null=True)  # null = generisch
```

**Alternativen:**
- Hardcoded Umrechnungstabelle → Nicht erweiterbar
- Feld auf MeasuringUnit → Zu simpel für zutatspezifische Werte

**API:** `GET /api/unit-conversions/?from=EL&to=g&ingredient=mehl`

### 3. Fuzzy-Match: Trigram-Similarity in PostgreSQL

**Entscheidung:** `pg_trgm` Extension + `IngredientAlias` für Matching. Dialog im Frontend bei Similarity > 0.3.

**Umsetzung:**
- `backend/supply/services/fuzzy_match.py`
- `GET /api/ingredients/suggest/?q=Tomaten` → Returns ranked matches
- Frontend: Modal bei "Neue Zutat erstellen" mit Vorschlägen

### 4. Shopping-List Ansichtsmodi: Query-Parameter

**Entscheidung:** `?view=detailed|summarized|by-recipe` Parameter auf bestehendem Endpunkt. Backend aggregiert Items je nach Modus.

**Keine neuen Models nötig** — reine Darstellungslogik.

### 5. Druckversion: CSS @media print

**Entscheidung:** Rein frontend-seitig mit Print-CSS. Kein separater Endpunkt.

**Datei:** `frontend/src/pages/shopping/ShoppingListPrintView.tsx`

### 6. MealPlan PDF-Export: WeasyPrint

**Entscheidung:** `weasyprint` für Server-side PDF-Generierung aus HTML-Template.

**Alternativen:**
- reportlab → Zu low-level für Tabellen-Layout
- Client-side (jsPDF) → Limitierte Formatierung
- Puppeteer → Zu schwer für Cloud Run

**API:** `GET /api/meal-plans/{id}/export/pdf/` → Returns PDF file
**Dependency:** `weasyprint` (neu)

### 7. MealPlan Erweiterungen (Kundenfeedback)

**Neue Felder auf `Meal`:**
```
Meal:
  override_portions: Integer(null=True)  # Überschreibt norm_portions für diese Mahlzeit
  note: TextField(blank=True, default="")
  note_is_published: Boolean(default=False)  # Sichtbar in Print/Export?
```

**Neue Felder auf `MealItem`:**
```
MealItem:
  display_name: CharField(max_length=200, null=True, blank=True)  # Custom Anzeigename
  ingredient: FK(Ingredient, null=True, blank=True)  # Alternative zu recipe
  quantity: Decimal(null=True)  # Menge für Einzelzutat
  measuring_unit: FK(MeasuringUnit, null=True)  # Einheit für Einzelzutat
```
Constraint: Entweder `recipe` ODER `ingredient` muss gesetzt sein (nicht beides).

**MealItemOverride Model (NEU):**
```
MealItemOverride:
  meal_item: FK(MealItem)
  recipe_item: FK(RecipeItem)
  quantity_override: Decimal(null=True)
  excluded: Boolean(default=False)
```

**Default Meals:** SNACK wird in `DEFAULT_MEAL_TYPES` aufgenommen (4 statt 3 Slots pro Tag).

**PDF-Export:** Query-Parameter `?include_notes=true` für Küchen-Version mit Notizen.

**API:**
- `PATCH /api/meal-plans/{id}/meals/{meal_id}/` — note, note_is_published, override_portions
- `PATCH /api/meal-plans/{id}/meal-items/{item_id}/overrides/`
- `POST /api/meal-plans/{id}/meals/{meal_id}/items/` — erweitert um ingredient/quantity/measuring_unit

### 8. Rezept-Ordner: Neues Model `RecipeFolder`

**Model:**
```
RecipeFolder:
  name: CharField
  owner: FK(User)
  sort_order: Integer
  parent: FK(self, null=True)  # Nested folders
```
Plus `folder: FK(RecipeFolder, null=True)` auf `Recipe`.

**API:** CRUD unter `/api/recipe-folders/`

### 9. Simple Meal: recipe_type Erweiterung

**Entscheidung:** Kein neues Model. `Recipe` mit `recipe_type="simple_meal"` und leerer `description`. Frontend zeigt vereinfachtes Formular.

**Alternativen:**
- Eigenes Model → Dupliziert zu viel Logik (Skalierung, Einkaufsliste)
- Flag auf Recipe → recipe_type choice reicht

### 10. Autocomplete Ghost-Text: Frontend-Only

**Entscheidung:** Bestehendes `GET /api/ingredients/?q=` reicht. Frontend-Komponente mit Debounce + Inline-Ghost-Text.

**Komponente:** `frontend/src/components/recipe/IngredientAutocomplete.tsx`

## Risks / Trade-offs

- **[WeasyPrint auf Cloud Run]** → Braucht System-Dependencies (cairo, pango). Mitigation: Multi-stage Dockerfile, oder Alternative `xhtml2pdf` (reines Python, weniger hübsch).
- **[URL-Import Fragility]** → Websites ändern Markup. Mitigation: Schema.org JSON-LD als Primary, site-specific Scraper nur als Fallback. Graceful degradation bei Parse-Fehlern.
- **[pg_trgm Extension]** → Muss auf Cloud SQL aktiviert werden. Mitigation: Bereits `pgvector` aktiv, `pg_trgm` ist Standard-Extension.
- **[Ordner + Tags Redundanz]** → User könnten verwirrt sein. Mitigation: Ordner nur für "Meine Rezepte", öffentliche Rezepte nur Tags.

## Migrations

1. `supply`: `UnitConversion` Model + pg_trgm Extension
2. `recipe`: `RecipeFolder` Model + `folder` FK auf Recipe
3. `planner`: `MealItemOverride` Model + Meal-Felder (override_portions, note, note_is_published) + MealItem-Felder (display_name, ingredient, quantity, measuring_unit) + SNACK in DEFAULT_MEAL_TYPES
4. `recipe`: Neuer `recipe_type` choice "simple_meal"

## Betroffene Dateien

**Backend:**
- `backend/recipe/models/` — RecipeFolder, recipe_type choice
- `backend/recipe/api/` — import-from-url, folders CRUD
- `backend/recipe/schemas/` — ImportSchema, FolderSchema
- `backend/recipe/services/import_service.py` (neu)
- `backend/supply/models/` — UnitConversion
- `backend/supply/services/fuzzy_match.py` (neu)
- `backend/supply/api/` — unit-conversions, suggest endpoint
- `backend/planner/models/` — MealItemOverride
- `backend/planner/api/` — overrides CRUD, PDF export
- `backend/planner/services/pdf_export.py` (neu)
- `backend/shopping/api/` — view parameter

**Frontend:**
- `frontend/src/components/recipe/IngredientAutocomplete.tsx` (neu)
- `frontend/src/components/supply/UnknownIngredientDialog.tsx` (neu)
- `frontend/src/pages/recipe/RecipeImportPage.tsx` (neu)
- `frontend/src/pages/shopping/ShoppingListPrintView.tsx` (neu)
- `frontend/src/schemas/recipe.ts` — Folder, Import schemas
- `frontend/src/schemas/mealPlan.ts` — Override schema
- `frontend/src/hooks/api/recipes.ts` — import, folders hooks
- `frontend/src/hooks/api/ingredients.ts` — suggest hook
