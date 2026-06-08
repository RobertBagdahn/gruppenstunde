## Context

Im Food Frontend gibt es zwei Wege, Rezepte zu einer Mahlzeit hinzuzufügen:

1. **Inline-Schnellsuche** (`frontend-food/src/pages/planning/MealSlot.tsx`): Klick auf + öffnet Eingabefeld mit `useRecipeSuggestions` — API `GET /api/meal-plans/recipes/suggestions/`
2. **Detailsuche-Dialog** (`frontend-food/src/pages/planning/RecipeSearchDialog.tsx`): Klick auf Sliders-Icon öffnet Dialog mit `useRecipeSearch` — API `GET /api/meal-plans/recipes/search/`

Beide teilen sich die `MEAL_TYPE_TO_RECIPE_TYPES`-Map, die aktuell in `frontend-food/src/pages/planning/RecipeSearchDialog.tsx:43` UND `backend/planner/api/meal_plan.py:998` dupliziert ist. `dessert` (Nachtisch) fehlt in dieser Map. Der Dialog-Trigger ist ein winziges 16×16px Sliders-Icon (`MealSlot.tsx:302`).

Das Backend filtert `status="approved"` (`meal_plan.py:1185`) — eigene Drafts erscheinen nie. Die `nutritional_tag_ids` des Plans werden nur als **Ausschluss-Filter** (Allergen-Checkbox) genutzt, nicht als **Einschluss-Filter**.

## Goals / Non-Goals

**Goals:**
- Nachtisch als suchbaren Rezepttyp in die Kategorie-Map aufnehmen
- Mehrstufiger Fallback: Kategorie → alle Typen bei 0 Treffern
- Rezept-Ampel (verified/community/draft) in jeder Ergebniszeile anzeigen
- Preis pro Portion immer anzeigen (Backend-berechnet)
- Ranking: usage_count DESC, dann Preis ASC NULLS LAST
- Harter Diät-Filter (AND) auf Plan-Tags, im Dialog abwählbar
- Prominenter CTA-Button im leeren MealSlot
- Empty State als Klickfläche + "Rezept vorschlagen" (PreviewDialog vor Einfügen)
- Kategorie-Pills statt Dropdown
- Rezept-Ergebnisse als reichhaltige Cards
- Kürzlich verwendete Rezepte im Dialog (plan-übergreifend)
- Rezept-Erstellen-Link im Empty State
- Inline-Suche profitiert von den gleichen Verbesserungen
- Eigene Drafts in Suche einschließen

**Non-Goals:**
- Drag & Drop
- Saison-Filter
- Recipe-Status-Editor
- Neues `season`-Feld am Recipe-Model
- Wetter-basierte Vorschläge

## Decisions

### D1: `MEAL_TYPE_TO_RECIPE_TYPES` nur im Backend

**Decision**: Die Mapping-Tabelle existiert nur noch im Backend (`backend/planner/api/meal_plan.py`). Das Frontend sendet `meal_type` als Query-Parameter und konsumiert `recipe_type` aus Responses. Die Frontend-Konstante (`RecipeSearchDialog.tsx:43`) wird entfernt.

Neue Map:
```python
MEAL_TYPE_TO_RECIPE_TYPES = {
    "breakfast": ["breakfast", "simple_meal", "dessert"],
    "lunch":     ["warm_meal", "cold_meal", "side_dish", "dessert"],
    "dinner":    ["warm_meal", "cold_meal", "side_dish", "dessert"],
    "snack":     ["simple_meal", "dessert"],
}
```

**Alternatives considered**: Map im Frontend behalten → Sync-Fehler bei Änderungen. Backend-only = Single Source of Truth.

### D2: Mehrstufiger Fallback in einer Query

**Decision**: Der Fallback wird im Backend als zwei interne Queries implementiert:
1. Erst Recipe-Typen aus `MEAL_TYPE_TO_RECIPE_TYPES[meal_type]`
2. Wenn count < limit: Rest mit ALLEN recipe_types auffüllen (ohne Duplikate)

Response enthält `fallback_applied: bool`. Frontend zeigt bei `true` einen Hinweis.

**Alternatives considered**: Zwei separate API-Calls vom Frontend → Race Conditions, doppelte Latenz.

### D3: Rezept-Ampel (Traffic Light)

**Decision**: `recipe_badge`-String im Backend berechnet via extrahierter `resolve_recipe_badge(recipe, user)` aus `backend/recipe/api/schemas.py`. Werte: `"verified"` (owner=null, approved), `"community"` (owner!=null, public, approved), `"draft"` (owner=user, any status).

Frontend: `RecipeBadge.tsx` — farbiger Punkt + Tooltip. Farben: Grün (verified), Gelb (community), Rot (draft).

### D4: Preis pro Portion

**Decision**: `price_per_serving = cached_price_total / servings` im Backend berechnet. Wenn `cached_price_total` null: `price_per_serving = null`. Frontend formatiert als `1,23 €/P.` oder `—`.

### D5: Zweistufiges Ranking

**Decision**: `ORDER BY usage_count DESC, cached_price_total ASC NULLS LAST`. Günstigere Rezepte bei gleicher Nutzungshäufigkeit zuerst, Rezepte ohne Preis ans Ende.

### D6: Harter Diät-Filter (AND) mit Override

**Decision**: Query-Parameter `require_nutritional_tags: bool` (default `true`). Bei `true`: AND-Verknüpfung via Django-M2M-Filterkette. Alte `exclude_nutritional_tag_ids`-Logik entfällt. Frontend: Checkbox "Nur [vegan, glutenfrei]" — abwählbar.

Backend-Query: `qs.filter(nutritional_tags__id=1).filter(nutritional_tags__id=3)` → Django INNER JOINs mit AND.

### D7: MealSlot CTA-Button

**Decision**: Wenn `items.length === 0 && !is_external && canEdit`: prominenter Button "🔍 Rezept oder Zutat wählen" öffnet RecipeSearchDialog. Bestehende + und Sliders-Buttons bleiben für nicht-leere Slots. "Noch kein Rezept zugeordnet"-Text wird anklickbar.

**Affected file**: `frontend-food/src/pages/planning/MealSlot.tsx`

### D8: "Rezept vorschlagen"

**Decision**: Query-Parameter `random=true` auf Suggestions-Endpoint. Backend wählt `random.choice()` aus Top-20. Frontend öffnet RecipePreviewDialog vor dem Einfügen.

### D9: Kategorie-Pills

**Decision**: Neue `CategoryPills.tsx` Komponente mit horizontalem `overflow-x-auto`, alle recipe_types als Pills, "Alle" letzte Option. Ersetzt `<Select>` in `RecipeSearchDialog.tsx:162`.

### D10: Rezept-Karten

**Decision**: Neue `RecipeSearchCard.tsx` Komponente: Ampel-Punkt links, Titel + Typ-Badge, Diät-Tag-Badges, Preis + Usage-Count-Zeile. Ersetzt die einfachen `<button>`-Elemente in `RecipeSearchDialog.tsx:256`.

### D11: "Kürzlich verwendet"

**Decision**: Neuer Endpoint `GET /api/meal-plans/recipes/recently-used/?limit=5` (plan-übergreifend). Neue `RecentlyUsedSection.tsx` Komponente im Dialog oberhalb der Suchergebnisse.

### D12: "Selbst erstellen"-Link

**Decision**: Wenn Suchergebnisse leer und Nutzer eingeloggt: Link `→ Neues Rezept erstellen` navigiert zu `/recipes/new`.

### D13: Eigene Drafts einschließen

**Decision**: Backend-Filter von `status="approved"` auf `Q(status="approved") | Q(owner=request.user)` ändern in `backend/planner/api/meal_plan.py:1185`.

### D14: Inline-Suggestions aufwerten

**Decision**: `RecipeSuggestionOut` (in `backend/planner/schemas/`) um `recipe_badge`, `price_per_serving`, `recipe_type` erweitern. Inline-Ergebnisliste in `MealSlot.tsx` zeigt farbigen Punkt + Preis.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AND-Filter zu restriktiv (vegan+glutenfrei+laktosefrei → kaum Treffer) | Filter im Dialog abwählbar; Empty State kommuniziert Grund |
| Draft-Sichtbarkeit: unfertige Daten | Rote Ampel warnt; nur eigener User sieht eigene Drafts |
| Performance: AND-Filter mit mehreren JOINs | Index auf nutritional_tags M2M-Tabelle existiert; bei >3 Tags Performance messen |
| Preis null bei vielen Rezepten | "—" anzeigen; NULLS LAST im Ranking |
| Fallback zeigt irrelevante Typen | Hinweis "Keine [Frühstück]-Rezepte — zeige alle Typen" |

## Resolved Questions

- **Q1**: "Rezept vorschlagen" öffnet RecipePreviewDialog — kein direktes Einfügen
- **Q2**: "Kürzlich verwendet" ist plan-übergreifend
- **Q3**: `price_per_serving` wird im Backend berechnet
