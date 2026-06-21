## Why

Auf der Rezept-Detailseite (z.B. `/recipes/brotzeit`) können Zutaten nur über ein einfaches Autocomplete-Feld gesucht werden, das maximal 8 Ergebnisse ohne Preis-, Nährwert- oder Kategorie-Infos zeigt. Bei ähnlichen Zutaten (z.B. "Ei", "Bio-Ei", "Freiland-Ei") ist eine informierte Auswahl kaum möglich. Der Mahlzeiten-Planer hat bereits eine "Detailsuche" — diese Lücke soll für die Zutatensuche in Rezepten geschlossen werden.

## What Changes

- **Neuer Dialog `IngredientDetailSearchDialog`** in `frontend-food/`: Öffnet sich über einen [⚙]-Button neben dem "Zutat hinzufügen..."-Input im `InlineIngredientEditor`
- **Filterleiste im Dialog**: Abteilung (retail_section), Diät-Tags (nutritional_tags), Lagereignung (camp_suitable)
- **Sortierung**: Relevanz (Standard), Preis, Nutriscore, Kalorien
- **Ergebnisliste mit mittlerer Detailtiefe**: Name, Abteilung, Preis/kg, Nutriscore-Badge, kcal, Protein pro Zeile
- **Neuer Zwischenschritt nach Auswahl**: `IngredientQuantityDialog` — Nutzer wählt Menge und Einheit, bevor die Zutat in die Liste übernommen wird (analog zum MealSlot-Flow)
- **Backend-Erweiterungen** an `GET /api/ingredients/`: neuer `ordering`-Parameter, neuer `nutritional_tag`-Filter
- **Zod-Schema-Fix**: `quality_score` zu `IngredientListItemSchema` hinzufügen (bisher stumm weggeworfen)

## Capabilities

### New Capabilities

- `ingredient-detail-search`: Vollständiger Suchdilog für Zutaten mit Filtern (Abteilung, Diät-Tags, Lagereignung), Sortierung (Preis, Nutriscore, Kalorien) und mittlerer Detailtiefe pro Ergebnis-Zeile, inklusive Mengenauswahl-Schritt nach Auswahl

### Modified Capabilities

- `ingredient-search`: Der bestehende Ingredient-List-Endpoint erhält zwei neue Query-Parameter (`ordering`, `nutritional_tag`) — die Anforderungen an die API-Schnittstelle ändern sich

## Impact

**Backend** (`backend/supply/`):
- `supply/api/ingredients.py`: `list_ingredients` Endpoint — neuer `ordering`-Parameter, neuer `nutritional_tag`-Filter
- `supply/schemas/ingredients.py`: Keine Schema-Änderungen nötig

**Frontend** (`frontend-food/src/`):
- `components/recipe/InlineIngredientEditor.tsx`: [⚙]-Button + Dialog-Integration
- `components/recipe/IngredientDetailSearchDialog.tsx`: Neues Haupt-Komponente (Dialog)
- `components/recipe/IngredientQuantityDialog.tsx`: Neuer Mengenauswahl-Dialog (extrahiert aus `RecipeSearchDialog.tsx`)
- `api/supplies.ts`: Neuer `useIngredientSearch`-Hook mit Filter- und Sortierparametern
- `schemas/supply.ts`: `quality_score` zu `IngredientListItemSchema` hinzufügen

**Pydantic/Zod-Sync**:
- `IngredientListItemSchema` (Zod) muss `quality_score` erhalten — Backend sendet es bereits

**Keine Migrations** erforderlich (nur API-Parameter-Erweiterungen, keine Modell-Änderungen).
