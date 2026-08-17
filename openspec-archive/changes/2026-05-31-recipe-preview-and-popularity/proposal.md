## Why

Beim Hinzufügen eines Rezepts zu einem Menüplan fehlt eine Vorschau — man klickt blind auf einen Titel und hofft, dass es passt. Außerdem gibt es keine Vorschläge basierend auf Beliebtheit, sodass erfahrene Nutzer jedes Mal von Null suchen müssen. Ein Preview-Dialog und ein Popularity-Ranking beschleunigen die Planung erheblich.

## What Changes

- **Neues Feld `usage_count`** am Recipe-Model (denormalisiert, per Signal aktualisiert bei MealItem create/delete)
- **Neuer API-Endpunkt** `GET /api/meal-plans/recipes/popular` mit persönlichen und Community-Rankings, filterbar nach `meal_type`
- **Erweiterung der Recipe-Search-Response** um Preview-Felder (Bild, Nährwerte, Preis, Nutri-Score, Tags, Zutatenliste)
- **Neuer RecipePreviewDialog** (Frontend): Zeigt Rezept-Details + "Hinzufügen"-Button
- **Beliebteste-Rezepte-Sektion** im RecipeSearchDialog: 5-8 Vorschläge (persönlich + Community) vor der Suche
- **Toast-Bestätigung** nach erfolgreichem Hinzufügen, Rückkehr zur Meal-Ansicht

## Capabilities

### New Capabilities
- `recipe-popularity`: Denormalisiertes usage_count Feld, Popularity-API-Endpunkt (personal + community), Signal-basierte Aktualisierung
- `recipe-preview-dialog`: Preview-Dialog mit Bild, Nährwerten, Preis, Tags, Zutatenliste und Hinzufügen-Action

### Modified Capabilities
- `meal-planner-recipe-search`: Search-Response wird um Preview-Felder erweitert; Dialog zeigt Beliebteste-Sektion vor den Suchergebnissen

## Impact

- **Backend**: `recipe` App (neues Feld + Migration), `planner` App (neuer Endpunkt, Signals)
- **Frontend**: `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` (erweitert), neue Komponente `RecipePreviewDialog.tsx`
- **Schemas**: Pydantic `RecipeSearchResultOut` erweitern, neues `RecipePopularOut` Schema; Zod-Schemas synchron
- **Migration**: `recipe` App — `usage_count` IntegerField + Management Command für initialen Count
- **API**: Neuer Endpunkt + bestehender Search-Endpunkt erweitert
