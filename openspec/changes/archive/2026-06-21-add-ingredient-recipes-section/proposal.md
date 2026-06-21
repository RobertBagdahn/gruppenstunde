## Why

Auf der Zutatendetailseite fehlt eine Übersicht, welche Rezepte diese Zutat verwenden. Nutzer müssen aktuell raten oder umständlich suchen. Das erschließt den praktischen Nutzen einer Zutat – besonders beim Kochen/Einkaufen fürs Lager.

## What Changes

- **Neuer API-Endpunkt**: `GET /api/ingredients/{slug}/recipes/` – paginierte Liste aller approved Rezepte, die diese Zutat verwenden
- **Neue Sektion auf IngredientDetailPage**: „Rezepte mit dieser Zutat" am Seitenende mit kompaktem Recipe-Grid
- **Empty State** mit CTA: Falls keine Rezepte existieren, wird eine Meldung und ein Button „Rezept mit {name} erstellen" angezeigt
- **Pre-Fill beim Rezept erstellen**: Der Button navigiert zu `/recipes/new?ingredient={slug}`; die Create-Seite lädt die Zutat und fügt sie standardmäßig mit Default-Portion in die Zutatenliste ein
- **Neuer API-Hook** im Frontend: `useRecipesByIngredient(slug)` – TanStack Query Hook für den neuen Endpunkt

## Capabilities

### New Capabilities
- `ingredient-recipes-section`: Anzeige und Navigation von Rezepten, die eine bestimmte Zutat verwenden, inklusive Pre-Fill beim Erstellen neuer Rezepte

### Modified Capabilities

(keine bestehenden Specs werden geändert – `ingredient-usage-count` bleibt als separater Counter bestehen)

## Impact

- **Backend**: Neuer Endpunkt in `supply/api/ingredients.py` mit Visibility-Filterung (gleiche Regeln wie Recipe-Liste), existierendes `RecipeSimilarOut` Schema + neuer paginierter Wrapper `PaginatedRecipeSimilarOut` in `supply/schemas/ingredients.py`
- **Frontend**: 
  - `IngredientDetailPage.tsx` – neue Sektion am Ende
  - `CreateRecipePage.tsx` – neuer Effekt zum Einlesen von `?ingredient=` aus URL-Param
  - Neue `useRecipesByIngredient(slug)` Query in `api/supplies.ts`
- **Keine DB-Migration** nötig (bestehende Relationen reichen)
