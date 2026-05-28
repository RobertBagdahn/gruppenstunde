## Why

Die Zutatenliste auf der Rezept-Detailseite ist schlecht positioniert (zu weit unten), hat eine verwirrende Portionen-Anzeige ("für 18 Portionen" statt Norm-Portion), einen doppelten/defekten Portionen-Scaler, und eine zu kleine Schriftgröße. Das macht die wichtigste Information eines Rezepts schwer zugänglich.

## What Changes

- **Zutaten-Sektion nach oben verschieben**: Direkt unter den Hero-Bereich, vor Nutritional Tags und Zubereitung
- **Portionen-Anzeige normalisieren**: Default ist immer "pro Portion" (1 Portion). Wenn hochskaliert wird, zeigt der Header "für X Portionen"
- **Portionen-Scaler aus IngredientList entfernen**: Der Scaler lebt nur noch in der Desktop-Sidebar und im Mobile Bottom Sheet
- **Sidebar-Scaler reparieren**: Der Scaler arbeitet mit einem einfachen Multiplier (1, 2, 3...) statt der verwirrenden Division durch Basis-Portionen
- **Darstellung vergrößern**: Größere Schrift und mehr Platz für die Zutatenliste

## Capabilities

### New Capabilities

_Keine neuen Capabilities — rein UI-Refactoring bestehender Funktionalität._

### Modified Capabilities

- `recipe`: Portionen-Skalierung wird auf Norm-Portion (1 Portion) als Default umgestellt; Zutaten-Darstellung wird vergrößert und repositioniert

## Impact

- **Frontend-Dateien**:
  - `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — Reihenfolge der Sektionen, Header-Text-Logik
  - `frontend-food/src/components/supply/IngredientList.tsx` — PortionScaler entfernen, Schrift vergrößern
  - `frontend-food/src/components/recipe/RecipeSidebar.tsx` — Scaler-Logik fixen (Multiplier statt absolute Portionszahl)
  - `frontend/src/components/supply/IngredientList.tsx` — gleiche Änderungen (Monorepo-Duplikat)
  - `frontend/src/components/recipe/RecipeSidebar.tsx` — gleiche Änderungen
- **Schemas**: Keine Änderungen an Pydantic/Zod-Schemas nötig
- **Migrations**: Keine DB-Migrationen nötig
- **APIs**: Keine API-Änderungen nötig
