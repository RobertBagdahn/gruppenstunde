## 1. Backend: Visibility-Filter auf alle Recipe-Subaccessoren anwenden

- [x] 1.1 `_get_visible_recipes_qs` aus `recipe/api/recipes.py` in eine gemeinsam genutzte Funktion extrahieren (oder in `items.py` importieren), sodass beide Dateien dieselbe Implementierung verwenden
- [x] 1.2 `list_recipe_items` (`api/items.py:40`): `get_object_or_404(Recipe, id=recipe_id)` ersetzen durch `_get_visible_recipes_qs(request.user).get(pk=recipe_id)` + `_require_auth`
- [x] 1.3 `create_recipe_item`, `update_recipe_item`, `delete_recipe_item` (`api/items.py`): gleiche Änderung + bestehender `_can_edit_recipe`-Check bleibt
- [x] 1.4 `list_recipe_comments`, `create_recipe_comment` (`api/recipes.py:488-506`): Visibility-Filter ergänzen
- [x] 1.5 `toggle_recipe_emotion` (`api/recipes.py:514`): Visibility-Filter ergänzen
- [x] 1.6 `get_similar_recipes` (`api/recipes.py:541`): Visibility-Filter ergänzen
- [x] 1.7 `upload_recipe_image`, `delete_recipe_image` (`api/recipes.py:550-579`): Visibility-Filter ergänzen
- [x] 1.8 `ai_suggest_all` (`api/recipes.py:709`): Visibility-Filter ergänzen
- [x] 1.9 `delete_recipe` (`api/recipes.py:469`): Visibility-Filter ergänzen; Response-Status auf `204` ändern

## 2. Backend: suggest_ingredients absichern

- [x] 2.1 `supply/api/ingredients.py:99`: `_require_auth(request)` am Anfang der Funktion hinzufügen
- [x] 2.2 `limit`-Parameter mit `Query(le=50, ge=1)` begrenzen (Django Ninja validiert automatisch)

## 3. Backend: fork_recipe portions normalisieren

- [x] 3.1 `api/recipes.py:640`: `portions=original.portions` ersetzen durch `portions=1`

## 4. Frontend: DGE-Coverage bei isDirty neu berechnen

- [x] 4.1 `RecipeDetailPage.tsx`: In der `nb`-Recompute-Logik (Zeilen ~212-259) `dge_coverage` proportional skalieren: für jeden Nährstoff in `dge_coverage` den Wert mit `(new_total_kcal / original_total_kcal)` multiplizieren — oder besser: Nährstoffmengen einzeln skalieren und durch DGE-Referenzwert teilen
- [x] 4.2 `RecipeDetailPage.tsx:249`: `|| null`-Fallback entfernen: `total_vitamin_c_mg: items.reduce(..., 0)` (keine `|| null` Konvertierung)

## 5. Tests

- [x] 5.1 Backend-Test: Unauthentifizierter Zugriff auf `/api/recipes/{id}/recipe-items/` mit privatem Rezept → 403
- [x] 5.2 Backend-Test: Authentifizierter Zugriff auf fremdes privates Rezept über alle Subaccessoren → 404
- [x] 5.3 Backend-Test: `suggest_ingredients` mit `limit=10000` → 422
- [x] 5.4 Backend-Test: `fork_recipe` — geklontes Rezept hat `portions=1`
