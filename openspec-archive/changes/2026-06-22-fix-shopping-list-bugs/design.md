## Context

Mehrere unabhängige Bugs im Shopping-Stack. Der kritischste ist `item.portion` in `shopping/api.py` — dieses Feld existiert nicht auf dem Modell, jede `get_shopping_list_view`-Anfrage crasht. Der DSGVO-Bug (`list_users`) ist ein Datenschutzproblem.

## Goals / Non-Goals

**Goals:**
- `get_shopping_list_view` funktioniert ohne `AttributeError`
- `list_users` gibt nur nach Suche und mit Paginierung User zurück
- Shopping-Service benötigt ≤5 DB-Queries statt O(n)
- WebSocket reconnect loop ist stabil

**Non-Goals:**
- Vollständige Umstrukturierung des Shopping-Service
- Real-time Collaboration Features

## Decisions

**D1 — `item.portion` → `item.ingredient`**
Das `ShoppingListItem`-Modell hat `ingredient` als direkten FK. Alle drei View-Branches (`get_shopping_list_view`) müssen `item.portion.ingredient.name` → `item.ingredient.name if item.ingredient else item.name` anpassen.

**D2 — `list_users` mit Suche + Pagination**
```python
@shopping_router.get("/users/", ...)
def list_users(request, q: str = "", page: int = 1, page_size: int = 20):
    _require_auth(request)
    qs = User.objects.filter(username__icontains=q).order_by("username")
    ...
```
Maximale `page_size=50` via Query-Validierung.

**D3 — Shopping-Service Prefetch**
Vor dem Loop: `meal_items = meal_plan.meals.prefetch_related("items__recipe__recipe_items__portion__ingredient__retail_section", "items__ingredient").filter(is_reference=False)` dann alle Items flat iterieren.

**D4 — WebSocket: handleMessage per Ref**
```ts
const handleMessageRef = useRef(handleMessage);
handleMessageRef.current = handleMessage;
// In connect: ws.onmessage = (e) => handleMessageRef.current(e);
```
So ändert sich `connect` nicht, wenn `handleMessage` sich ändert.

**D5 — ShoppingItemSourceSchema recipe_id nullable**
`recipe_id: z.number().nullable().optional()`

## Risks / Trade-offs

- `list_users`-Änderung bricht bestehende Aufrufer ohne `q`-Parameter — sie bekommen jetzt eine leere Liste wenn `q=""` — oder es wird `q` optional ohne Filterung gemacht und nur `page_size` begrenzt. Letzeres ist pragmatischer.
