## Context

Der `RecipeSearchDialog` (`frontend-food/src/pages/planning/RecipeSearchDialog.tsx`) wird in verschiedenen Meal-Plan-Kontexten geöffnet (Abendessen, Mittagessen, Frühstück etc.). Aktuell:

- Kein Text-Suchfeld — User müssen über CategoryPills und BadgePills filtern
- Zutaten und Rezepte in zwei getrennten `<div>`-Sektionen
- Zutaten nur mit `id`, `name`, `slug`, `portions` (IngredientSearchResultSchema)
- Das Ingredient-Model hält dagegen: `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `nutri_class`, `price_per_kg`, `nutritional_tags` (M2M), `usage_count`, `description`, `status`
- Der `q`-Parameter wird vom `useRecipeSearch`-Hook und der Backend-API unterstützt, aber nie an ein UI-Element gebunden

Sortierung aktuell: Rezepte nach `usage_count`, Zutaten in Reihenfolge der DB-Query (beide getrennt). Gewünscht: eine gemischte Liste, sortiert nach `usage_count` (bzw. Relevanz bei Texteingabe).

## Goals / Non-Goals

**Goals:**
- Suchfeld mit 300ms-Debounce, Suche ab ≥2 Zeichen, ganz oben im Dialog
- Rezepte und Zutaten in einer einzigen nach `usage_count` (default) / Relevanz sortierten Liste
- Zutaten zeigen: Badge (status→verified/user_content/draft), nutritional_tags, price_per_kg (€/kg), usage_count
- "Kürzlich verwendet" verschwindet bei aktiver Suche (q ≥ 2)
- `RecipeSearchCard` → `SearchResultCard` (unified, rendert recipe ODER ingredient)
- Backend-Ingredient-Query liefert alle relevanten Felder
- Klick auf Zutat → IngredientQuantityDialog (unverändert)
- Klick auf Rezept → RecipePreviewDialog (unverändert)

**Non-Goals:**
- Keine neuen API-Endpoints, keine neuen DB-Modelle
- Keine Paginierung-Änderungen (bleibt bei limit=20)
- Kein neuer Ingredient-Preview-Dialog (bleibt beim Quantity-Dialog)
- Keine Änderung am Breakfast-Wizard oder anderen Dialogen
- Keine Änderung an der Ingredient-Suche im ingredient-only-mode (dort bleibt alles beim Alten)

## Decisions

### 1. Backend: Erweiterte Ingredient-Query statt separatem Endpoint

**Entscheidung**: Die bestehende `search_recipes`-Funktion (`planner/api/meal_plan.py:1894-1935`) wird erweitert, statt einen neuen `/ingredients/search/`-Endpoint zu bauen.

**Begründung**: Der Endpoint liefert bereits Recipes + Ingredients in einem Aufruf (`UnifiedSearchResponse`). Ein separater Endpoint würde Race Conditions (unterschiedliche Query-Parameter für zwei Requests) und doppelte Filterlogik erzeugen.

**Alternativen verworfen**:
- Neuer Endpoint `/api/supply/ingredients/search/` — doppelte Filterlogik, Sync-Probleme bei gleichzeitiger Recipe+Ingredient-Suche
- GraphQL-ähnlicher Batch-Endpoint — Overkill für dieses Szenario

### 2. Frontend: Unified SearchResultCard

**Entscheidung**: `RecipeSearchCard` wird zu `SearchResultCard` umgebaut, die eine Union (`RecipeSearchResult | IngredientSearchResult`) akzeptiert und per discriminated union rendert.

**Begründung**: Beide Typen teilen sich nach der Erweiterung 80% der Felder (tags, price, usage, badge). Ein einziger Component = eine Source of Truth. Ein discriminated union pattern ist typsicher und einfach.

**Unterschiede im Rendering:**
| Feature | Recipe | Ingredient |
|---------|--------|------------|
| Icon | BookOpen | Apple |
| Badge | recipe_badge | Ingredient.status → Badge-Typ |
| Typ-Label | RECIPE_TYPE_LABELS[recipe_type] | "Zutat" |
| Preis | price_per_serving (€/P.) | price_per_kg (€/kg) |

**Alternativen verworfen**:
- Separater `IngredientSearchCard` — 90% Code-Duplizierung
- Generische `ResultCard` mit Render-Props — unnötige Abstraktion

### 3. Badge-Mapping für Ingredient

| Ingredient.status | Badge-Visual | Icon |
|-------------------|--------------|------|
| verified | grün (ShieldCheck) | Gleich wie recipe_badge=verified |
| user_content | amber (Users) | Gleich wie recipe_badge=community |
| draft | blau/grau (Edit) | Gleich wie recipe_badge=draft |

### 4. Sortierung der gemischten Liste

Bei leerer Suche (q < 2): absteigend nach `usage_count` (recipes + ingredients gemischt).
Bei aktiver Suche (q ≥ 2): Rezepte via PostgreSQL FTS (SearchRank), Ingredients via `icontains`. Die beiden Listen werden im Frontend concat (recipes first, dann ingredients) — die API liefert sie bereits sortiert.

**Begründung**: Die Backend-Query ist bereits optimiert (FTS für Recipes, icontains für Ingredients). Die Ergebnisse abwechselnd im Frontend zu interleaven wäre aufwändig und brächte keinen Mehrwert — Recipes sind in der Regel relevanter bei einer Rezeptsuche.

**Edge Case**: Wenn ein Recipe denselben usage_count wie ein Ingredient hat, kommt das Recipe zuerst (weil es in der API-Response vor den Ingredients kommt).

### 5. State: useDebouncedState

Ein einfacher `useState` + `useEffect` mit `setTimeout`/`clearTimeout` für den Debounce. Keine externe Library. Der `q`-Wert wird an `useRecipeSearch` übergeben, das die Query automatisch triggert.

### 6. Recently Used conditional

```typescript
const showRecentlyUsed = q.length < 2 && resultsRecentlyUsed?.recipes?.length > 0
```

`showRecentlyUsed` steuert die Sichtbarkeit. Die `useRecentlyUsedRecipes`-Query läuft immer (kein conditional fetch) — sie cached unabhängig und hat keine nennenswerten Kosten.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Backward compat**: Andere Aufrufer von `RecipeSearchCard` könnten durch den Umbruch brechen | `RecipeSearchCard` umbenennen, alten Namen als re-export mit Deprecation-Hinweis behalten |
| **API-Performance**: Ingredient-Query wird teurer (mehr Felder + JOIN über nutritional_tags) | Nur `prefetch_related` für Tags, keine Subquerys. `limit` capped bei 50. |
| **Mixed Sort versteckt gute Zutaten**: Zutaten mit niedrigem usage_count erscheinen nie | Die CategoryPills bleiben — User können auf "Zutat" klicken für Ingredient-only-Modus |
| **Usability**: User erwarten getrennte Sektionen | Mixed Results sind konsistent mit modernen Such-UI-Patterns (Spotlight, Alfred, Raycast) |
