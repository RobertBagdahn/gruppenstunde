## Why

Tester-Feedback (Peter, 25.09.2026): Wer in der Rezeptliste „Meine Rezepte“ nach „Neueste“ sortiert, ein Rezept öffnet und über Breadcrumb oder Navigation zurückgeht, muss alles neu auswählen. Ursache: Breadcrumb (`RecipeDetailPage.tsx:417`) und Bottom-Navigation (`FoodLayout.tsx:22`) verlinken auf das nackte `/recipes`; der Filterzustand lebt nur in der URL. Andere Listen (Essenspläne, Einkaufslisten) halten Filter sogar nur im React-State und verlieren sie schon beim Neuladen.

## What Changes

- Neuer gemeinsamer Hook `usePersistedListState` im Food-Frontend: URL ist führend, Browser-Speicher (`localStorage`) stellt den letzten Stand wieder her, wenn die URL keine Parameter hat.
- Gespeichert werden Filter, Sortierung, Suchtext und Ansichtsmodus – **nicht** die Seitenzahl.
- Speicher-Schlüssel enthält die Nutzer-ID (`inspi-food:list-state:v1:<userId|anon>:<listKey>`), damit mehrere Konten auf einem Browser getrennte Stände haben.
- Gespeicherter Zustand wird beim Laden mit einem Zod-Schema validiert; ungültige Stände fallen auf Standardwerte zurück.
- Sichtbarer Hinweis „N Filter aktiv · Zurücksetzen“, wenn wiederhergestellte Filter von den Standardwerten abweichen. „Zurücksetzen“ leert auch den gespeicherten Stand.
- Umstellung aller 7 Listen-/Ansichtsseiten auf den Hook; handgeschriebene URL↔State-Synchronisation entfällt:
  - `pages/recipes/RecipeListPage.tsx` (inkl. bisherigem `recipe-search-view`-Key)
  - `pages/ingredients/IngredientListPage.tsx`
  - `pages/planning/MealEventListPage.tsx` (Filter bisher gar nicht in der URL)
  - `pages/shopping/ShoppingListPage.tsx` (`sort`, „Meine Daten“ bisher nicht in der URL)
  - `pages/ingredients/statistics/components/TabFilters.tsx`
  - `pages/admin/DataQualityIngredientsPage.tsx` (aktiver Tab)
  - `pages/planning/MealEventDetailPage.tsx` (Karten-/Tabellenansicht)
- Der Statusfilter der Zutatenliste (`components/ingredient/IngredientFilterSidebar.tsx`) bietet heute `published`/`draft`/`archived` an. `published` und `archived` sind keine Zutat-Status und liefern immer leere Ergebnisse. Er wird auf die Optionen aus `lib/ingredientStatus.ts` (`draft`, `verified`) umgestellt, die der Change `ingredient-status-visibility-unification` einführt. Gespeicherte Altwerte werden per Zod verworfen.

## Capabilities

### New Capabilities
- `persisted-list-filters`: Wiederherstellung von Listen-Filtern, Sortierung, Suche und Ansicht aus dem Browser-Speicher, nutzergetrennt, mit URL als führender Quelle.

### Modified Capabilities
<!-- keine: recipe-table-view verlangt bereits localStorage-Persistenz der Ansicht; das Verhalten bleibt gleich, nur die Implementierung wandert in den Hook. -->

## Impact

- **Frontend (`frontend-food/`)**: neuer Hook `src/hooks/usePersistedListState.ts`, neue Komponente `src/components/shared/ActiveFiltersHint.tsx`, 7 Seiten umgestellt. Pro Liste ein Zod-Schema für den gespeicherten Zustand (neu, in `src/schemas/listState.ts`).
- **Backend**: keine Änderungen, keine Pydantic-Schemas, keine Migrationen.
- **API**: unverändert.
- **Risiko**: Nutzer sehen beim Öffnen von `/recipes` gefilterte Ergebnisse; wird durch den Filter-Hinweis abgefangen.
- **Abhängigkeit**: Der Zutaten-Statusfilter nutzt `lib/ingredientStatus.ts` aus `ingredient-status-visibility-unification` (Task 7.2 dort). Wird dieser Change zuerst umgesetzt, legt er die Datei mit denselben Optionen an, und der andere Change übernimmt sie.
