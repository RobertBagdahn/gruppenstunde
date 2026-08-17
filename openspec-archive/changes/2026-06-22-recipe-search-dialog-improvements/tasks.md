## 1. Backend: Filterlogik reparieren

- [x] 1.1 `search_recipes()` in `planner/api/meal_plan.py`: `exclude_nutritional_tag_ids` als `.exclude(nutritional_tags__id__in=...)` ins Queryset verschieben (vor `[:limit]`)
- [x] 1.2 `search_recipes()`: `nutritional_tag_ids` als `.filter(nutritional_tags__id__in=...)` ins Queryset verschieben (vor `[:limit]`)
- [x] 1.3 Alte Python-Listen-Filterung für beide Tag-Parameter entfernen

## 2. Frontend: Schema-Korrekturen

- [x] 2.1 `RecipeSearchResultSchema` in `schemas/mealPlan.ts`: `servings` → `portions` umbenennen
- [x] 2.2 `RecipeRecentlyUsedSchema` in `schemas/mealPlan.ts`: `portions`-Feld ergänzen
- [x] 2.3 Alle Vorkommen von `recipe.servings` im Frontend auf `recipe.portions` prüfen und aktualisieren (Grep-Suche)

## 3. Frontend: CategoryPills & RecipeSearchCard

- [x] 3.1 `CategoryPills.tsx`: `ingredient`-Eintrag (`{ value: 'ingredient', label: 'Zutat' }`) zu `RECIPE_TYPES` hinzufügen
- [x] 3.2 `RecipeSearchCard.tsx`: lokale `RECIPE_TYPE_LABELS`-Definition entfernen, stattdessen aus `CategoryPills` importieren
- [x] 3.3 `RecipeSearchCard.tsx`: `RECIPE_TYPE_COLORS`-Map entfernen, Typ-Badge auf `bg-muted text-muted-foreground` umstellen

## 4. Frontend: RecipeSearchDialog — Bugs

- [x] 4.1 `MEAL_TYPE_DEFAULT_RECIPE_TYPES` in `RecipeSearchDialog.tsx`: `ingredient` aus snack-Eintrag entfernen → `snack: ['snack']`
- [x] 4.2 `useEffect` in `RecipeSearchDialog.tsx`: `// eslint-disable-line`-Kommentar entfernen, `defaultTypes` (abhängig von `mealType`) korrekt als Dependency aufnehmen
- [x] 4.3 Fallback-Banner-Text von "Keine Rezepte in dieser Kategorie gefunden — zeige alle Typen" auf "Nicht genug Rezepte für diesen Typ — zeige auch andere" ändern

## 5. Frontend: RecentlyUsedSection integrieren

- [x] 5.1 `RecentlyUsedSection.tsx`: `onSelect`-Prop ergänzen (`onSelect: (recipeId: number) => void`)
- [x] 5.2 `RecentlyUsedSection.tsx`: `onClick`-Handler auf den Buttons verdrahten — ruft `onSelect(r.id)` auf
- [x] 5.3 `RecipeSearchDialog.tsx`: `RecentlyUsedSection` importieren und oberhalb der Ergebnisliste einbinden, `onSelect`-Prop durchreichen

## 6. Frontend: useRandomRecipeSuggestion Guard

- [x] 6.1 In `MealSlot.tsx` (oder wherever `useRandomRecipeSuggestion` konsumiert wird): prüfen ob `data[0]` existiert bevor es verwendet wird
- [x] 6.2 Sicherstellen dass bei leerem Array keine Fehler geworfen werden und die UI graceful degradiert

## 7. Verifikation

- [ ] 7.1 Dialog mit Frühstück-Slot öffnen: RecentlyUsedSection sichtbar, Chips klickbar
- [ ] 7.2 Frühstück-Filter setzen: Fallback-Banner zeigt korrekten Text wenn nötig
- [ ] 7.3 Snack-Slot öffnen: kein `ingredient` im recipe_types-Param (DevTools prüfen)
- [ ] 7.4 Tag-Ausschluss-Filter testen: Ergebnismenge korrekt (bis zu limit, nicht weniger)
- [x] 7.5 TypeScript-Kompilierung ohne Fehler: `tsc --noEmit`
