## Context

In `recipe/api/recipes.py` und `recipe/api/items.py` gibt es eine Hilfsfunktion `_get_visible_recipes_qs(user)`, die korrekt nach Visibility filtert. Diese wird jedoch nur von `list_recipes`, `get_recipe` und `get_recipe_by_slug` genutzt. Alle Subaccessoren (Items, Kommentare, Bilder, Emotionen, AI) rufen `get_object_or_404(Recipe, id=...)` direkt auf — ohne Filter.

In `RecipeDetailPage.tsx` gibt es einen `isDirty`-Zustand, der bei manuellen Portionsänderungen aktiv wird. Der `nutritionBreakdown`-Block wird teilweise manuell neu berechnet, aber `dge_coverage` und `dge_reference` werden als unveränderliche Kopien des Server-Zustands übernommen.

## Goals / Non-Goals

**Goals:**
- Jeder Recipe-API-Endpunkt, der `Recipe`-Objekte liest, verwendet `_get_visible_recipes_qs`
- Private Rezepte (anderer Nutzer) sind nie über Sub-Endpunkte erreichbar
- DGE-Coverage wird bei `isDirty` im Frontend korrekt proportional neu skaliert
- `suggest_ingredients` hat eine obere Schranke für `limit` und Auth

**Non-Goals:**
- Änderungen am Sichtbarkeitsmodell selbst
- Echte DGE-Backend-Neuberechnung beim Scrollen (zu aufwändig, proportionale Skalierung reicht)
- Änderungen an Kommentar- oder Emotions-Modellen

## Decisions

**D1 — Visibility-Hilfsfunktion wiederverwenden**
Die bestehende `_get_visible_recipes_qs(user)` in `recipes.py` wird in eine gemeinsam genutzte Hilfsfunktion extrahiert (oder per Import) auch in `items.py` verfügbar gemacht. Alle Subaccessoren nutzen `_get_visible_recipes_qs(request.user).get(pk=recipe_id)` mit `Http404` wenn nicht gefunden.

**D2 — DGE-Coverage proportional skalieren**
Da die DGE-Referenzwerte fix sind (Alter/Geschlecht) und die Nährstoffmengen sich bei `isDirty` proportional ändern, reicht eine einfache Skalierung:
```
new_coverage[nutrient] = original_coverage[nutrient] * (new_total / original_total)
```
Diese Berechnung ist im Frontend in der bestehenden `nb`-Recompute-Logik einzubauen.

**D3 — `suggest_ingredients` Limit-Cap**
Parameter `limit: int = 5` bekommt zusätzlich `Query(le=50)` — Django Ninja validiert dies automatisch. Auth-Check via `_require_auth`.

**D4 — `fork_recipe` portions normalisieren**
`fork_recipe` setzt explizit `portions=1` statt `original.portions` zu übernehmen.

## Risks / Trade-offs

- **Risiko**: Bestehende Clients, die unauthentifiziert auf `/api/recipes/{id}/recipe-items/` zugreifen, erhalten künftig 403 statt 200. Das ist gewollt — diese Endpunkte waren nie für anonymen Zugriff gedacht.
- **Trade-off DGE**: Proportionale Skalierung ist eine Näherung. Wenn der Nutzer eine Zutat mit spezifischen Mikronährstoffen hinzufügt, ist die Skalierung ungenau. Für das MVP ist das ausreichend.
