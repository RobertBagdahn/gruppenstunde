## Why

Mengenangaben im Food-Bereich (Rezepte, Essensplan, Einkaufsliste) werden aktuell inkonsistent angezeigt — mal nur Gramm, mal nur die Portionsbezeichnung, mal gar keine Einheit. Nutzer können nicht auf einen Blick erkennen wie viel von einer Zutat benötigt wird. Einkaufslisten zeigen keine Packungsgrößen, obwohl diese im Datenbankmodell (`Portion` mit `is_system`) bereits vorhanden sind.

## What Changes

- **Einheitliches Anzeigeformat** für alle Zutatenlisten: `3,4 Äpfel (970g)`, `1 Prise Salz (300mg)`, `2 EL Honig (30g)`
- **Intelligente Gewichtsformatierung** mit automatischer Einheitenwahl: `mg` (< 1g), `g` (1–999g), `kg` (≥ 1000g), kontextabhängige Rundung
- **Neues Backend-Feld `portion_display`** auf `RecipeItem`- und `MealItem`-API-Responses — kein Breaking Change (alte Felder bleiben)
- **Erweiterter `display_quantity`-String** in `ShoppingListItemOut` mit Packungsoptionen: `750g · 3×250g · 2×500g`
- **Packungsanzeige in Einkaufsliste** — alle verfügbaren Packungsgrößen nebeneinander, Reserve-Faktor eingerechnet, nur lesend (kein Speichern der Auswahl)
- **Gewicht pro NormPerson** im Essensplan mit explizitem Hinweis dass die Skalierung auf echte Personenzahl im Essensplan erfolgt
- **Zutaten ohne `weight_g`** werden orange markiert (kein Absturz, kein Ausblenden)
- **`_format_weight()` Backend-Util** um `mg`-Schwelle ergänzt

## Capabilities

### New Capabilities

- `portion-weight-display`: Kombiniertes Anzeigeformat `"{quantity} {unit_name} {ingredient_name} ({weight})"` für alle Zutatenlisten im Food-Frontend. Beinhaltet Gewichtsformatierung (mg/g/kg), deutsche Zahlenformatierung, kontextabhängige Rundung, und Unterdrückung von „Stück" zugunsten des Ingredient-Namens.
- `shopping-list-package-display`: Packungsoptionen in Einkaufslisten-Zeilen. Berechnung aus `Portion`-Einträgen des Ingredients, Aufrunden mit Rest-Anzeige wenn Packungsmenge nicht aufgeht, Reserve-Faktor des MealPlans bereits eingerechnet.

### Modified Capabilities

- `shopping-list`: `display_quantity` wird um Packungsoptionen erweitert. Bestehende Felder bleiben unverändert.
- `recipe-quantity-display`: Bestehende Anzeige wird durch neues `portion_display`-Feld ersetzt/ergänzt in RecipeDetailPage und RecipeEditPage.
- `quantity-display-formatting`: Bestehende `_format_weight()`-Logik wird um `mg`-Schwelle erweitert.

## Impact

**Backend (Django Ninja / Pydantic):**
- `backend/shopping/schemas.py` — `ShoppingListItemOut` um Packungsoptionen in `display_quantity` erweitern
- `backend/recipe/schemas/` — `RecipeItemOut` um `portion_display: str` ergänzen
- `backend/planner/schemas/` — `MealItemOut` um `portion_display: str` (pro NormPerson) ergänzen
- `backend/supply/models/ingredient.py` — `_format_weight()` Utility um mg-Schwelle ergänzen
- Keine Migrationen erforderlich (nur Schema-Änderungen, neue berechnete Felder)

**Frontend (React / Zod / TanStack Query):**
- `frontend-food/src/schemas/recipe.ts` — Zod-Schema `RecipeItemOut` um `portion_display` ergänzen
- `frontend-food/src/schemas/mealPlan.ts` — Zod-Schema `MealItemOut` um `portion_display` ergänzen
- `frontend-food/src/schemas/shoppingList.ts` — `ShoppingListItemOut` anpassen
- `frontend-food/src/utils/formatWeight.ts` — mg-Schwelle ergänzen, deutsche Formatierung sicherstellen
- `frontend-food/src/components/shopping/ShoppingListItemRow.tsx` — Packungsoptionen anzeigen
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` und `EditRecipePage.tsx` — `portion_display` nutzen
- `frontend-food/src/pages/planning/` — `portion_display` in Essensplan-Views, NormPerson-Hinweis
- `frontend-food/src/pages/planning/CookingSchedulePage.tsx` — `portion_display` nutzen
