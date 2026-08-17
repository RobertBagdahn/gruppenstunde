## 1. Backend: item.portion AttributeError fixen

- [x] 1.1 `shopping/api.py:201,224,239`: `item.portion.ingredient.name if item.portion and item.portion.ingredient else item.name` → `item.ingredient.name if item.ingredient else item.name`
- [x] 1.2 `shopping/api.py:190`: `prefetch_related("sources", "ingredient")` zu Items-Queryset hinzufügen (behebt auch die fehlende Sources-Prefetch in BUG 9)

## 2. Backend: list_users DSGVO-Fix

- [x] 2.1 `shopping/api.py:553`: `_require_auth(request)` sicherstellen
- [x] 2.2 Pagination hinzufügen: `page: int = 1, page_size: int = Query(default=20, le=50)`
- [x] 2.3 Optionale Suche: `q: str = ""` → `User.objects.filter(username__icontains=q)` wenn `q` nicht leer
- [x] 2.4 Response-Schema auf paginiertes Format umstellen

## 3. Backend: Shopping-Service N+1 eliminieren

- [x] 3.1 `shopping_service.py`: Vor dem Haupt-Loop `meal_items` mit `prefetch_related("recipe__recipe_items__portion__ingredient__retail_section")` vorladen
- [x] 3.2 `shopping_service.py:223-232`: Statt per-Item `Ingredient.objects.get(id=ing_id)` — alle benötigten Ingredient-IDs sammeln und mit einem `Ingredient.objects.filter(id__in=ids)` bulk-laden; Dict für Lookup bauen
- [x] 3.3 `shopping_service.py:161-165`: Portion-Lookup vor dem Loop batch-laden: alle `(ingredient_id, measuring_unit_id)`-Paare sammeln, dann `Portion.objects.filter(...).select_related("measuring_unit")`; In-Memory-Dict für Lookup

## 4. Backend: ShoppingListOut Count-Queries per Annotation

- [x] 4.1 `shopping/schemas.py`: `resolve_items_count`, `resolve_checked_count`, `resolve_collaborators_count` auf annotierte Queryset-Felder umstellen
- [x] 4.2 `list_shopping_lists`-Queryset annotieren: `annotate(items_count=Count("items"), checked_count=Count("items", filter=Q(items__is_checked=True)), collaborators_count=Count("collaborators"))`

## 5. Backend: ShoppingItemPortionOptionOut Schema-Mismatch

- [x] 5.1 `shopping/schemas.py:42-48`: `ShoppingItemPortionOptionOut` um `weight_g: float` und `count: float` ergänzen

## 6. Frontend: WebSocket Stale-Closure fixen

- [x] 6.1 `hooks/useShoppingListWebSocket.ts`: `handleMessage` per `useRef` statt als Dependency in `connect`'s `useCallback` verwalten
- [x] 6.2 `connect` aus der `handleMessage`-Dependency-Chain herauslösen

## 7. Frontend: Schema-Fix

- [x] 7.1 `schemas/mealPlan.ts`: `ShoppingItemSourceSchema.recipe_id` → `z.number().nullable().optional()`

## 8. Frontend: ShoppingListPage Server-seitige Suche

- [x] 8.1 `ShoppingListPage.tsx`: Suche als URL-Parameter `?q=...` übergeben statt client-seitig zu filtern
- [x] 8.2 Backend-Endpunkt `list_shopping_lists` um `q: str = ""`-Parameter erweitern und Server-seitig filtern

## 9. Tests

- [x] 9.1 Backend-Test: `get_shopping_list_view` gibt 200 zurück (kein `AttributeError` mehr)
- [x] 9.2 Backend-Test: `list_users` ohne Auth → 403
- [x] 9.3 Backend-Test: `list_users` mit `page_size=200` → 422
