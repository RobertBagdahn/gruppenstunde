## Context

Das Haupt-Frontend (`frontend/`) und das Food-Frontend (`frontend-food/`) teilen sich aktuell ~46 Dateien an Food-bezogenem Code. Das Food-Frontend ist die designierte Heimat für alle Food-Funktionalität und enthält alle Features vollständig. Der duplizierte Code im Haupt-Frontend ist historisch gewachsen und muss entfernt werden.

Aktueller Stand:
- `frontend/src/pages/recipes/` — 6 Pages
- `frontend/src/pages/tools/MealPlan*` — 4 Pages
- `frontend/src/pages/supplies/IngredientDetailPage.tsx` — 1 Page
- `frontend/src/components/recipe/` — 8 Components
- `frontend/src/components/shopping/` — 4 Components
- `frontend/src/components/supply/IngredientList.tsx` — 1 Component
- `frontend/src/api/` — 7 API-Hook-Dateien (recipes, ingredients, mealPlans, mealEvents, shoppingLists, normPerson, recipeHints)
- `frontend/src/schemas/` — 5 Schema-Dateien (recipe, ingredient, mealPlan, mealEvent, shoppingList)
- `frontend/src/store/useRecipeModificationStore.ts` + Test
- `frontend/src/utils/nutritionCalculator.ts` + Test
- `frontend/src/lib/parseRecipeSteps.ts` + Test
- `frontend/src/hooks/useShoppingListWebSocket.ts`
- Routen in `frontend/src/App.tsx`
- Referenzen in `ApprovalQueuePage.tsx` und `TitleImageEditor.tsx`

Keine Backend-Änderungen nötig. Keine DB-Migrationen. Keine API-Endpunkt-Änderungen.

## Goals / Non-Goals

**Goals:**
- Alle Food-bezogenen Dateien aus `frontend/` entfernen
- Recipe Approval Queue im Food-Frontend hinzufügen
- AGENTS.md mit klarer Trennungsregel aktualisieren
- Sicherstellen, dass `frontend/` nach dem Aufräumen fehlerfrei baut (keine toten Imports)

**Non-Goals:**
- Backend-Änderungen
- Neue Food-Features im Food-Frontend (außer Approval Queue)
- Migration von Nutzerdaten
- Änderung der URL-Struktur im Food-Frontend

## Decisions

### 1. Löschen statt Verschieben

**Entscheidung:** Dateien im Haupt-Frontend werden gelöscht, nicht verschoben.

**Begründung:** Das Food-Frontend hat bereits eigenständige, vollwertige Implementierungen aller Features. Es gibt nichts zu portieren.

### 2. Approval Queue als eigene Admin-Seite im Food-Frontend

**Entscheidung:** Neuer Tab `ApprovalTab` in `frontend-food/src/pages/admin/AdminPage.tsx`.

**Begründung:** Das Food-Frontend hat bereits eine Admin-Seite mit Tab-Navigation (RetailSections, NutritionalTags, Rules). Ein neuer „Freigaben"-Tab passt nahtlos rein.

**Alternativen verworfen:**
- Zentrale Approval im Haupt-Frontend belassen → widerspricht dem Trennungsprinzip
- Eigene Route `/admin/approvals` → unnötig, Tab reicht

### 3. TitleImageEditor bereinigen

**Entscheidung:** `'recipe'` aus der Content-Type-Liste im Haupt-Frontend entfernen. Das Food-Frontend hat seinen eigenen TitleImageEditor, der `'recipe'` bereits unterstützt.

### 4. AGENTS.md als Guardrail

**Entscheidung:** Explizite Regel in `frontend/AGENTS.md` und Root-`AGENTS.md`, die Food-Code im Haupt-Frontend verbietet.

## Risks / Trade-offs

- **[Tote Imports nach Löschung]** → Nach jeder Löschgruppe TypeScript-Build prüfen (`npm run build`), fehlende Imports aufräumen.
- **[Navigation/Links zu Food-Seiten]** → Im Haupt-Frontend könnten Links zu `/recipes` etc. existieren (Navigation, Footer, Landing Pages). Diese müssen auf das Food-Frontend umgeleitet oder entfernt werden. → Alle Referenzen zu Food-Routen in der Navigation suchen und anpassen.
- **[Approval Queue API]** → Das Backend stellt bereits einen generischen Approval-Endpunkt bereit. Das Food-Frontend muss nur die UI dafür bauen. → Bestehende API-Hooks im Food-Frontend prüfen/ergänzen.
