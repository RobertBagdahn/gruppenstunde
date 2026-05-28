## 1. Backend: Search-Endpunkt erweitern

- [x] 1.1 `planner/api/meal_plan.py`: `search_recipes` Endpunkt erweitern — Parameter `recipe_type: str = None`, `nutritional_tag_ids: str = None` (comma-separated), `limit: int = 8` hinzufügen
- [x] 1.2 Full-Text-Search implementieren: `SearchQuery` + `SearchRank` auf `search_vector` nutzen, Fallback auf `title__icontains` wenn `search_vector` leer oder `q` zu kurz
- [x] 1.3 Filter anwenden: `recipe_type` Filter, `nutritional_tags__id__in` Filter (AND-Semantik)
- [x] 1.4 Response erweitern: `recipe_type` Feld im Response-Dict mitliefern (neben id, title, slug)

## 2. Frontend: Shared API Hook

- [x] 2.1 `api/mealPlans.ts`: `useRecipeSearch(params: { q, recipe_type?, nutritional_tag_ids?, limit? })` Hook erstellen (TanStack Query, enabled wenn q.length >= 2 oder Filter gesetzt)
- [x] 2.2 Zod-Schema für Search-Response definieren (id, title, slug, recipe_type)

## 3. Frontend: Quick Search verbessern

- [x] 3.1 Debouncing (300ms) mit `useDeferredValue` oder custom Hook auf das Search-Input
- [x] 3.2 Keyboard-Navigation: ↑↓ zum Navigieren, Enter zum Auswählen, Esc zum Schließen — State für `highlightedIndex`
- [x] 3.3 Ergebnisse anzeigen mit recipe_type als dezenter Badge/Text
- [x] 3.4 `useRecipeSearch` Hook integrieren statt bisheriger Inline-Logik

## 4. Frontend: Dialog Search Komponente

- [x] 4.1 `RecipeSearchDialog.tsx` Komponente erstellen (shadcn/ui Dialog)
- [x] 4.2 Props: `mealType: string`, `onSelect: (recipeId: number) => void`, `open: boolean`, `onOpenChange`
- [x] 4.3 Kontext-Mapping implementieren: `mealType` → Default `recipe_type` Filter-Werte
- [x] 4.4 Filter-UI: recipe_type Select (mit "Alle" Option), nutritional_tags Multi-Select
- [x] 4.5 Ergebnisliste: Scrollbar, max 20 Ergebnisse, Klick → `onSelect` → Dialog schließt
- [x] 4.6 Freitext-Suche im Dialog (gleicher `useRecipeSearch` Hook, limit=20)

## 5. Frontend: Integration in MealCard

- [x] 5.1 Dialog-Button (Icon) neben dem Suchfeld rendern (nur sichtbar wenn `isSearching`)
- [x] 5.2 `RecipeSearchDialog` einbinden mit korrektem `mealType` und `onSelect` Callback
- [x] 5.3 Altes ungefiltetes Search-Verhalten entfernen, durch `useRecipeSearch` ersetzen
