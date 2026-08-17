## Context

Aktuell zeigt die Inline-Suche in `MealEventDetailPage.tsx` erst Ergebnisse nach Texteingabe (300ms Debounce, min. Zeichen). Der bestehende `useRecipeSearch` Hook ruft `/api/planner/recipes/search/` auf. Die Daten für Häufigkeit existieren bereits im `MealItem`-Modell (`recipe` FK → kann per `COUNT` aggregiert werden).

## Goals / Non-Goals

**Goals:**
- Sofortige Rezept-Vorschläge beim Öffnen des Suchfelds (ohne Eingabe)
- Kontextsensitive Vorschläge basierend auf `meal_type`
- Suche ab 1 Buchstabe mit 200ms Debounce
- Sortierung aller Ergebnisse nach globaler Verwendungshäufigkeit

**Non-Goals:**
- Personalisierte Vorschläge pro User (bleibt global)
- Caching der Häufigkeits-Daten (bei Bedarf später)
- Änderung der erweiterten Suche (RecipeSearchDialog)

## Decisions

### 1. Ein kombinierter Endpunkt für Vorschläge und Suche

**Entscheidung**: Neuer Endpunkt `GET /api/planner/recipes/suggestions/` der sowohl initiale Vorschläge (ohne `q`) als auch gefilterte Suche (mit `q`) liefert.

**Warum**: Vermeidet zwei separate Endpunkte mit identischer Sortierlogik. Frontend braucht nur einen Hook.

**Alternative verworfen**: Bestehenden `/api/planner/recipes/search/` erweitern — würde dessen Semantik ändern und andere Konsumenten brechen.

### 2. Zweistufige Sortierung: meal_type-spezifisch + global Fallback

**Entscheidung**: Primär Rezepte sortieren nach Häufigkeit innerhalb des gleichen `meal_type`. Falls weniger als `limit` Ergebnisse, auffüllen mit global häufigsten (die noch nicht in der Liste sind).

**Warum**: Frühstücksrezepte für Frühstück, aber keine leere Liste wenn ein Typ wenig Daten hat.

### 3. Aggregation via Django ORM (kein denormalisiertes Feld)

**Entscheidung**: `MealItem.objects.values('recipe').annotate(count=Count('id'))` statt eines gespeicherten Counters.

**Warum**: Einfacher, immer aktuell, keine Migration. Performance bei ~1000 MealItems unkritisch (<50ms).

## API-Endpunkt

```
GET /api/planner/recipes/suggestions/
```

**Query-Parameter:**
| Parameter | Typ | Required | Default | Beschreibung |
|-----------|-----|----------|---------|--------------|
| meal_type | string | nein | - | breakfast/lunch/dinner/snack/dessert |
| q | string | nein | - | Suchtext (ab 1 Zeichen) |
| limit | int | nein | 10 | Max. Ergebnisse |

**Response-Schema (Pydantic):**
```python
class RecipeSuggestionOut(Schema):
    id: int
    title: str
    usage_count: int
    image_thumbnail: str | None
```

**Response:** `list[RecipeSuggestionOut]` (kein Pagination-Wrapper, da max. 10 Items)

**Zod-Schema (Frontend):**
```typescript
const recipeSuggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  usageCount: z.number(),
  imageThumbnail: z.string().nullable(),
})
```

## Betroffene Dateien

- `backend/planner/api/meal_plan.py` — neuer Endpunkt
- `backend/planner/schemas/meal_plan.py` — `RecipeSuggestionOut`
- `frontend-food/src/api/mealPlans.ts` — neuer Hook `useRecipeSuggestions`
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — UI-Änderung

## Risks / Trade-offs

- **[Performance bei Wachstum]** → Bei >10.000 MealItems könnte die Aggregation langsam werden. Mitigation: Index auf `meal_item.recipe_id` existiert bereits (FK). Bei Bedarf später materialized view.
- **[Kalte Datenbank]** → Neue Instanz hat keine Häufigkeitsdaten. Mitigation: Akzeptabel, Vorschläge wachsen organisch.
- **[Keine Pagination]** → Fest auf max 10 limitiert. Mitigation: Für Autocomplete-Dropdown ausreichend, erweiterte Suche bleibt für mehr.
