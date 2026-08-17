## Context

Der Meal Planner (`MealEventDetailPage.tsx`) hat eine Inline-Rezeptsuche pro Meal. Aktuell: einfaches Input mit `title__icontains` Backend-Query. Recipe hat einen `search_vector` GIN-Index der nicht genutzt wird. Meals haben einen `meal_type` (breakfast/lunch/dinner/snack/dessert), Recipes einen `recipe_type` (breakfast/warm_meal/cold_meal/dessert/side_dish/snack/drink/simple_meal).

## Goals / Non-Goals

**Goals:**
- Quick Search: Schnelles Finden eines bekannten Rezepts (Debounce, Full-Text, Keyboard-Nav)
- Dialog Search: Gefiltertes Browsen wenn man nicht weiß was man will
- Kontext-Mapping: Dialog öffnet mit sinnvollem Vorfilter basierend auf meal_type

**Non-Goals:**
- Keine Mehrfachauswahl im Dialog (immer ein Rezept pro Aktion)
- Kein neues Datenmodell / keine Migration
- Keine Änderung der bestehenden Recipe-Datenstruktur

## Decisions

### 1. Meal-Type → Recipe-Type Mapping

```
meal_type       →  vorausgewählte recipe_types
────────────────────────────────────────────────
breakfast       →  breakfast, simple_meal
lunch           →  warm_meal, cold_meal, side_dish
dinner          →  warm_meal, cold_meal, side_dish
snack           →  snack, simple_meal
dessert         →  dessert
```

Der Filter ist ein Default — User kann ihn im Dialog ändern oder auf "Alle" setzen.

### 2. Backend: Ein erweiterter Endpunkt

`GET /api/meal-plans/recipes/search/` bekommt zusätzliche Query-Parameter:

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `q` | str | `""` | Freitext (Full-Text wenn vorhanden, Fallback icontains) |
| `recipe_type` | str? | null | Filter auf recipe_type |
| `nutritional_tag_ids` | list[int]? | null | Filter auf nutritional_tags M2M |
| `limit` | int | 8 | Max Ergebnisse (Quick: 8, Dialog: 20) |

Full-Text-Search: `search_vector` mit `SearchQuery` + `SearchRank` für Relevanz-Sortierung. Fallback auf `title__icontains` wenn `search_vector` leer.

### 3. Frontend-Architektur

```
MealCard
├── QuickRecipeSearch (bestehendes Input, verbessert)
│   ├── Debounced Input (300ms)
│   ├── Dropdown mit max 8 Ergebnissen
│   └── Keyboard-Navigation (↑↓ Enter Esc)
└── RecipeSearchDialog (neu)
    ├── Trigger: Icon-Button neben dem Suchfeld
    ├── shadcn/ui Dialog
    ├── Filter-Leiste: recipe_type Select + nutritional_tags Multi-Select
    ├── Freitext-Suche (debounced)
    ├── Ergebnisliste (scrollbar, max 20)
    └── Klick auf Ergebnis → onSelect → Dialog schließt
```

### 4. Shared API Hook

Ein `useRecipeSearch(params)` Hook der von Quick Search und Dialog Search genutzt wird, mit unterschiedlichen `limit`-Werten.

### 5. UI-Interaktion

- ⊕ Klick → Suchfeld + Dialog-Button erscheinen
- Tippen in Suchfeld → Quick Search Dropdown
- Klick auf Dialog-Button → Dialog öffnet (mit meal_type Vorfilter)
- Auswahl (Quick oder Dialog) → Rezept wird Meal zugewiesen, Suche schließt

## Risks / Trade-offs

- **Full-Text leer**: Manche Rezepte haben keinen `search_vector` (z.B. wenn `update_search_vector` nie lief). Fallback auf `icontains` nötig.
- **Performance**: Dialog lädt bis 20 Ergebnisse — bei vielen Rezepten kein Problem, der GIN-Index ist schnell.
- **UX-Komplexität**: Zwei Such-Modi könnten verwirren. Mitigation: Dialog-Button ist dezent (nur Icon), Quick Search ist der primäre Weg.
