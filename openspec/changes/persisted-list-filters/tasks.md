## 1. Backend

- [ ] 1.1 Keine Backend-Änderung nötig – bestätigen, dass alle Filter-Parameter der 7 Seiten bereits von den APIs akzeptiert werden (keine Pydantic-Anpassung)

## 2. Gemeinsame Grundlage (Frontend)

- [ ] 2.1 `src/schemas/listState.ts` anlegen: Listen-State-Schemas je `listKey` (Rezept-Schema per `.pick()` aus `RecipeFilterSchema`, feldweise `.catch(undefined)`, Enums für Sortierungen/Tabs)
- [ ] 2.2 `src/lib/listStateStorage.ts`: Schlüssel bauen (`inspi-food:list-state:v1:<userId|anon>:<listKey>`), `read`/`write`/`clear` mit `try/catch`, Default-Werte und `persistExclude` herausfiltern
- [ ] 2.3 `src/hooks/usePersistedListState.ts`: Zustand aus `useSearchParams` ableiten, `setState`/`patch`/`reset`, Wiederherstellung bei leerer URL nach Auflösung von `useCurrentUser`, `restored`-Flag, `activeCount`
- [ ] 2.4 Suchtext-Updates debounced mit `replace: true`, Filteränderungen mit History-Eintrag
- [ ] 2.5 Einmalige Übernahme des alten Keys `recipe-search-view` in den neuen Stand und Löschen des alten Keys
- [ ] 2.6 `src/components/shared/ActiveFiltersHint.tsx` („N Filter aktiv · Zurücksetzen“, Lucide-Icon, Design-Tokens, ≥ 32 px Klickfläche)

## 3. Seiten umstellen

- [ ] 3.1 `RecipeListPage.tsx`: `searchParamsToFilters`/`filtersToSearchParams`/`initialized`-Ref und `getStoredView`/`setStoredView` durch den Hook ersetzen; `useRecipes` erst nach `restored` aktivieren
- [ ] 3.2 `IngredientListPage.tsx`: 6 `useState` durch den Hook ersetzen
- [ ] 3.2a `components/ingredient/IngredientFilterSidebar.tsx`: `STATUS_OPTIONS` (`published`/`archived`) durch `INGREDIENT_STATUS_OPTIONS` aus `lib/ingredientStatus.ts` ersetzen (Datei aus `ingredient-status-visibility-unification` 7.2; anlegen, falls noch nicht vorhanden)
- [ ] 3.3 `MealEventListPage.tsx`: `origin`, `sort`, `searchQuery` über den Hook in die URL bringen
- [ ] 3.4 `ShoppingListPage.tsx`: `sort` und `myDataOnly` (URL-Key `mine`) über den Hook in die URL bringen
- [ ] 3.5 `statistics/components/TabFilters.tsx`: `retail_section`, `tag` über den Hook
- [ ] 3.6 `admin/DataQualityIngredientsPage.tsx`: aktiven Tab über den Hook
- [ ] 3.7 `planning/MealEventDetailPage.tsx`: `view` über den Hook (planübergreifender Key `meal-plan-detail`), `sub` bleibt reiner URL-State
- [ ] 3.8 `ActiveFiltersHint` in Rezeptliste, Zutatenliste, Essensplan-Liste und Einkaufslisten-Übersicht einbinden

## 4. Tests

- [ ] 4.1 Unit-Tests `listStateStorage`: Schlüssel pro Nutzer/anon, `localStorage` wirft, Default-Werte werden nicht gespeichert, `page` wird nie gespeichert
- [ ] 4.2 Hook-Tests (`usePersistedListState.test.tsx`, MemoryRouter): URL gewinnt gegen Speicher; leere URL stellt wieder her; Wiederherstellung wartet auf `useCurrentUser`; ungültiges Feld wird verworfen, andere bleiben; `reset` leert Speicher
- [ ] 4.3 Seiten-Test Rezeptliste: Filter setzen → zu `/recipes/x` navigieren → Breadcrumb-Link `/recipes` → Filter wiederhergestellt, Seite 1
- [ ] 4.4 Seiten-Test Zwei-Konten-Szenario (User A speichert, User B sieht Defaults)
- [ ] 4.5 E2E-Smoke (Playwright, falls vorhanden): „Meine Rezepte“ + „Neueste“ → Rezept öffnen → Bottom-Nav „Rezepte“ → Zustand erhalten
- [ ] 4.6 `npm run lint`, `npm run typecheck`, `npm test` im `frontend-food/` grün
