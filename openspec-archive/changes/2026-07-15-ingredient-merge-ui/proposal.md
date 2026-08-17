## Why

Der bestehende Admin-Merge-Endpoint für Ingredients (`POST /api/admin/data-quality/ingredients/merge/`) hat einen kritischen Bug: Er versucht `RecipeItem.portion_id=NULL` zu setzen, aber `RecipeItem.portion` ist eine nicht-nullable `ForeignKey(on_delete=PROTECT)`. Der Merge crasht daher garantiert, sobald eine Zutat in Rezepten verwendet wird.

Zusätzlich fehlt ein zugänglicher Einstieg für Staff-User: Der Merge ist nur über das Admin-Dashboard `DuplicateDetectionList` (automatische Duplikat-Erkennung via Embedding) erreichbar, aber nicht von der normalen IngredientEditPage aus. Staff-User, die manuell ein Duplikat erkennen, müssen über das Dashboard gehen.

## What Changes

- **Bugfix**: `merge_ingredients()` setzt nie mehr `portion_id=NULL` — alle Source-Portionen werden via Re-Parenting (`Portion.ingredient_id = target.id`) übernommen
- **Soft-Delete für Ingredient**: `Ingredient` erbt `SoftDeleteModel`, Migration für `deleted_at`-Feld; `DELETE /{slug}/`-Endpoint wird auf Soft-Delete umgestellt
- **Merge-Logik-Erweiterung**: `@transaction.atomic`; Alias-Übernahme (Source-Name + alle Aliase); MealItem-Remapping; Embedding-Neuberechnung synchron
- **Neue UI-Komponente**: `IngredientMergeDialog` als gemeinsame Komponente für IngredientEditPage (neuer Button) UND DuplicateDetectionList (ersetzt bestehenden Inline-Merge)
- **Merge-Flow**: Suche (Vorschläge + Freitext) → Quelle/Ziel-Auswahl → Preview (Anzahl betroffener Rezepte) → bei `usage_count>20`: Warnung + Pflicht-Checkbox
- **Audit-Trail**: `ContentLink(DUPLICATE_MERGED)` wie beim Recipe-Merge

## Capabilities

### New Capabilities
- `ingredient-merge-ui`: Staff-only Zutaten-Merge von der IngredientEditPage aus, mit Suchdialog, Preview und Sicherheitswarnung

### Modified Capabilities
- `data-quality-dashboard`: Bestehender Ingredient-Merge im Admin-Dashboard wird auf die neue gemeinsame Komponente migriert
- `ingredient-similar-endpoint`: Wird zusätzlich von der neuen Komponente genutzt

## Impact

- **Backend**: `supply/models/ingredient.py` — SoftDeleteModel-Integration + Migration
- **Backend**: `content/api/data_quality.py` — Bugfix merge_ingredients + merge_preview
- **Backend**: `supply/api/ingredients.py` — DELETE-Endpoint auf Soft-Delete umgestellt
- **Frontend-Food**: `src/pages/ingredients/IngredientEditPage.tsx` — neuer Merge-Button
- **Frontend-Food**: `src/components/data-quality/DuplicateDetectionList.tsx` — nutzt neue Komponente
- **Frontend-Food**: Neue Komponente `src/components/ingredients/IngredientMergeDialog.tsx`
