## Why

Mehrere kritische Bugs im Shopping-Bereich:
1. `get_shopping_list_view` greift auf `item.portion` zu, das auf `ShoppingListItem` nicht existiert → `AttributeError` auf jede Anfrage
2. `list_users` gibt alle User der Plattform ohne Paginierung oder Filter zurück → DSGVO-Problem
3. `shopping_service.py` feuert 3× N+1-Queries (RecipeItems, Portions, Ingredients in Schleifen)
4. `ShoppingItemPortionOptionOut`-Schema fehlen `weight_g` und `count` — Felder gehen bei Serialisierung verloren
5. `ShoppingListOut.resolve_items_count` / `resolve_checked_count` / `resolve_collaborators_count` feuern je eine Extra-Query pro Liste
6. `.order_by()` auf prefetchtem Queryset umgeht den Prefetch-Cache
7. `useShoppingListWebSocket`: Stale Closure kann Infinite-Reconnect-Loop auslösen
8. `ShoppingItemSourceSchema` in `mealPlan.ts`: `recipe_id` nicht nullable → Zod-Parse-Error wenn Backend `null` sendet
9. Client-seitige Suche in `ShoppingListPage` operiert nur auf der aktuellen Seite

## What Changes

- `shopping/api.py`: `item.portion` → `item.ingredient`; `list_users` mit Suche + Pagination + Auth verschärfen
- `shopping_service.py`: Bulk-Prefetch für RecipeItems, Portions und Ingredients vor den Schleifen
- `shopping/schemas.py`: `ShoppingItemPortionOptionOut` um `weight_g: float` und `count: float` ergänzen; `resolve_items_count` etc. via Queryset-Annotation statt `.count()`
- `useShoppingListWebSocket.ts`: `handleMessage` per Ref statt als Dependency in `connect`
- `schemas/mealPlan.ts`: `ShoppingItemSourceSchema.recipe_id` → `z.number().nullable()`
- `ShoppingListPage.tsx`: Suche als URL-Parameter und Server-seitige Filterung

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Backend**: `backend/shopping/api.py`, `backend/shopping/schemas.py`, `backend/supply/services/shopping_service.py`
- **Frontend**: `frontend-food/src/hooks/useShoppingListWebSocket.ts`, `frontend-food/src/schemas/mealPlan.ts`, `frontend-food/src/pages/shopping/ShoppingListPage.tsx`
- **Keine Migrationen** erforderlich
