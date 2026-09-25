## Context

Jede Listenseite im Food-Frontend synchronisiert ihren Zustand heute selbst – und jede anders:

| Seite | Heute |
|---|---|
| `RecipeListPage.tsx` | eigene `searchParamsToFilters`/`filtersToSearchParams`, `initialized`-Ref, separater `localStorage`-Key `recipe-search-view` für die Ansicht |
| `IngredientListPage.tsx` | 6 einzelne `useState`, initialisiert aus `searchParams` |
| `MealEventListPage.tsx` | `origin`, `sort`, `searchQuery` nur als `useState` – **nicht** in der URL (verstößt gegen die Projektregel URL-State) |
| `ShoppingListPage.tsx` | `q`, `page` in der URL, `sort` und `myDataOnly` nur `useState` |
| `statistics/components/TabFilters.tsx` | `retail_section`, `tag` direkt aus `searchParams` |
| `admin/DataQualityIngredientsPage.tsx` | `tab` aus `searchParams` |
| `planning/MealEventDetailPage.tsx` | `view` (cards/table), `sub` aus `searchParams` |

Ursache des Tester-Problems: Breadcrumb (`RecipeDetailPage.tsx:417`) und Bottom-Nav (`components/layout/FoodLayout.tsx:22`) verlinken `/recipes` ohne Parameter.

Nutzer-ID liefert `useCurrentUser()` (`src/api/auth.ts:13`, `['auth','me']`, liefert `null` für anonym).

## Goals / Non-Goals

**Goals:**
- Ein Hook für alle Listen; keine seiteneigene URL-Synchronisation mehr.
- Filter überleben Breadcrumb-/Nav-Navigation, Neuladen und Browser-Neustart.
- Konten auf einem Browser sind getrennt.
- Kein Backend-Eingriff.

**Non-Goals:**
- Serverseitige Speicherung als Profil-Präferenz (geräteübergreifend).
- Änderung der Filterlogik oder der API-Parameter selbst.
- Umbenennung bestehender URL-Parameter auf kebab-case (eigene Aufgabe, würde Links brechen).

## Decisions

### D1: Hook-Signatur mit Zod-Schema und Standardwerten
```ts
const { state, setState, patch, reset, activeCount } = usePersistedListState({
  key: 'recipes',                 // listKey im Speicherschlüssel
  schema: RecipeListStateSchema,  // Zod, alle Felder optional + .catch()
  defaults: RECIPE_LIST_DEFAULTS,
  persistExclude: ['page'],       // nie speichern
  serialize, deserialize,         // optional: Custom-Mapping für Arrays/Zahlen
});
```
- Standard-(De)Serialisierung: Strings direkt, Arrays als wiederholte Keys (`origin=mine&origin=verified`), Zahlen/Booleans über das Zod-Schema (`z.coerce`).
- Werte gleich Default werden **nicht** in die URL geschrieben (saubere URLs, wie heute `sort=use_count`).
- *Alternative*: Zustand-Store mit `persist`-Middleware. Verworfen, weil dann zwei Quellen (Store und URL) synchron gehalten werden müssten; der Hook leitet den Zustand direkt aus `useSearchParams` ab.

### D2: URL ist die einzige Laufzeit-Quelle
Der Zustand wird bei jedem Render aus `searchParams` abgeleitet (`useMemo` + `schema.parse`), nicht in `useState` gespiegelt. `setState` schreibt die URL (`setSearchParams(..., { replace })`) und im selben Schritt den Speicher. Damit entfallen `initialized`-Refs und doppelte Effekte.
- Filteränderungen: `replace: false` (Browser-Zurück springt zum vorherigen Filter) – außer Suchtext-Tippen, das debounced mit `replace: true` schreibt.
- Wiederherstellung aus dem Speicher: `replace: true` (kein zusätzlicher History-Eintrag).

### D3: Wiederherstellung nur bei „leerer“ URL
„Leer“ heißt: keiner der Keys aus dem Schema ist in der URL (fremde Parameter wie `utm_*` zählen nicht). Die Wiederherstellung läuft einmal pro Mount, sobald `useCurrentUser` nicht mehr `isLoading` ist. Bis dahin rendert die Liste mit Standardwerten, lädt aber noch keine Daten ab (`enabled: restored` im Query-Hook), um einen Doppel-Request zu vermeiden.

### D4: Speicherschlüssel und Format
`inspi-food:list-state:v1:<userId|anon>:<listKey>` → JSON des Zustands ohne `persistExclude`-Felder und ohne Default-Werte. `v1` erlaubt einen harten Schnitt bei inkompatiblen Änderungen. Der alte Key `recipe-search-view` wird einmalig gelesen, in den neuen Stand übernommen und gelöscht.
- *Alternative*: Leeren beim Logout. Vom Nutzer verworfen zugunsten nutzergetrennter Schlüssel.

### D5: Validierung feldweise
Jedes Schema-Feld bekommt `.catch(undefined)`, damit ein ungültiges Feld nur dieses Feld verwirft (Szenario „Veralteter Filterwert“). Enum-Felder (Sortierung, Tabs) als `z.enum`, damit entfernte Optionen erkannt werden.

### D6: `ActiveFiltersHint`-Komponente
`src/components/shared/ActiveFiltersHint.tsx` bekommt `activeCount` und `onReset`. `activeCount` zählt Felder ≠ Default (Arrays zählen pro Element, Suchtext zählt 1, Seitenzahl und Ansicht zählen nicht). Anzeige nur bei `activeCount > 0`. Die bestehenden Filter-Chips der Rezeptliste (`recipe-filter-uniform`) bleiben; der Hinweis ersetzt keinen Reset-Button, sondern macht wiederhergestellte Filter sichtbar, besonders auf Mobile, wo die Sidebar ein Drawer ist.

### D7: Welche Felder pro Seite
| listKey | Felder (gespeichert) | nur URL |
|---|---|---|
| `recipes` | q, recipe_type[], preparation_method[], difficulty[], execution_time[], origin[], costs_min, costs_max, tag_slugs[], sort, view | page |
| `ingredients` | name, retail_section, status (`z.enum(['draft','verified'])`, Optionen aus `lib/ingredientStatus.ts`), origin, sort | page |
| `meal-plans` | q, origin, sort | – |
| `shopping-lists` | q, sort, mine | page |
| `ingredient-stats` | retail_section, tag | – |
| `data-quality-ingredients` | tab | – |
| `meal-plan-detail` | view | sub |

`meal-plan-detail` ist bewusst **planübergreifend** (die Ansicht ist eine Nutzerpräferenz, kein Planzustand).

## Risks / Trade-offs

- [Nutzer wundert sich über gefilterte Liste nach Klick auf „Rezepte“] → `ActiveFiltersHint` plus Filter-Chips.
- [Doppelter Request beim Öffnen (Default, dann wiederhergestellt)] → Query erst nach Wiederherstellung aktivieren (D3).
- [`useCurrentUser` antwortet anonym mit 403 → Konsolenfehler, siehe Audit] → unabhängig; der Hook behandelt `null` als `anon`.
- [Suchtext wird dauerhaft gespeichert, evtl. unerwünscht] → vom Nutzer so entschieden; „Zurücksetzen“ entfernt ihn.
- [Schema-Drift zwischen Filter-Zod (`RecipeFilterSchema` in `schemas/recipe.ts`) und Listen-State-Schema] → Listen-State-Schema wird aus `RecipeFilterSchema` per `.pick()` abgeleitet, nicht neu geschrieben.

## Migration Plan

Reines Frontend-Deployment. Kein Rollback-Risiko für Daten; beim Zurückrollen bleiben ungenutzte `localStorage`-Einträge liegen (harmlos).

## Open Questions

- Soll der Suchtext bei der Rezeptliste nach sehr langer Zeit (z. B. 30 Tage) verfallen? Vorerst nein.
