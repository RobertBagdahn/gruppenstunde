## Context

Bug #26: Der Recipe-Merge ist nie implementiert worden. Task 6.8 im Data-Quality-Offensive Change wurde fälschlich als erledigt markiert. Die Frontend-Komponente `DuplicateDetectionList` ruft bei `type="recipe"` die Ingredient-Endpunkte auf, die nicht für Recipes ausgelegt sind.

Der Ingredient-Merge existiert als Referenz-Implementierung (rebind + alias + hard-delete), aber der Recipe-Merge folgt einem anderen Muster (soft-delete + ContentLink).

Aktueller Zustand:
- `GET /api/admin/data-quality/recipes/duplicates/` ✅ existiert (aber ohne Dismissal-Filter)
- `GET /api/admin/data-quality/recipes/merge/preview/` ❌ fehlt
- `POST /api/admin/data-quality/recipes/merge/` ❌ fehlt
- Dismiss-Endpunkte für Recipes ❌ fehlen
- Frontend ruft immer Ingredient-Endpunkte auf ❌

## Goals / Non-Goals

**Goals:**
- Recipe Merge Preview Endpunkt (zeigt Source→Target + Referenzanzahl)
- Recipe Merge Execute Endpunkt (soft-delete + ContentLink)
- Recipe Dismiss Endpunkte (analog zu Ingredients)
- Dismissal-Filter im recipe_duplicates-Endpunkt
- Recipe-spezifische Frontend-Hooks
- Korrektes Routing im DuplicateDetectionList
- API-Tests für alle neuen Endpunkte

**Non-Goals:**
- Kein Rebind von Referenzen (kein Umschreiben von MealPlans, Favoriten etc.)
- Keine Änderung am Ingredient-Merge-Pattern
- Kein Hard-Delete oder Cascade-Löschung
- Kein UI-Redesign des Merge-Dialogs

## Decisions

### 1. Merge-Strategie: Soft-Delete + ContentLink (Spec-Pattern)
- **Entscheidung**: Spec-Pattern (soft-delete + ContentLink) statt Ingredient-Pattern (rebind + hard-delete)
- **Begründung**: Recipes haben viele indirekte Referenzen (MealPlans, ShoppingLists, Favorites). Ein komplettes Rebind wäre komplex und fehleranfällig. Soft-Delete + ContentLink ist revisable und entspricht der bestehenden Spec.
- **Alternative**: Ingredient-Pattern mit Rebind — verworfen wegen zu hoher Komplexität und Risiko von Datenverlust.

### 2. Preview-Endpunkt: Reference Count via Meal + MealPlan
- **Entscheidung**: Der Preview-Endpunkt zählt Meals, die das Source-Recipe referenzieren
- **Begründung**: Die wichtigsten Referenzen für Recipes sind MealPlan-Meals. RecipeItems referenzieren nur Ingredients, nicht Recipes.
- **Query**: `Meal.objects.filter(recipe=source).count()` + zusätzlich indirekt über MealPlan

### 3. Recipe-spezifische Dismiss-Endpunkte (eigene statt generalisiert)
- **Entscheidung**: Eigene `POST/DELETE /api/admin/data-quality/recipes/duplicates/dismiss/` Endpunkte
- **Begründung**: Klarer, getrennter Code. Die Ingredient-Dismiss-Endpunkte sind auf Ingredient-ContentType gehärtet. Generalisierung würde bestehende Logik riskieren.
- **Alternative**: Generalisierung mit ContentType-Parameter — verworfen wegen Änderungsrisiko an stabiler Ingredient-Logik.

### 4. Frontend: Neue Hooks statt Conditional-Routing
- **Entscheidung**: Neue explizite Hooks (`useRecipeMerge`, etc.) statt bedingter URL-Wahl in bestehenden Hooks
- **Begründung**: Klarere Trennung, einfachere Testbarkeit, kein vermischtes Error-Handling.
- **Alternative**: Einen gemischten Hook mit `type`-Parameter — verworfen zugunsten von Explitheit.

### 5. MergePreviewSchema: Recipe-spezifisches Subset
- **Entscheidung**: `MergePreviewOut` wird um `source_name`, `target_name`, `affected_references` reduziert (keine Aliase, kein Nutrition-Comparison)
- **Begründung**: Recipes haben keine Aliase oder Nährwert-Vergleiche im Merge-Kontext. Ein schlankeres Schema ist klarer.
- **Alternative**: Ingredient-Schema wiederverwenden mit Null-Feldern — verworfen (führt zu Frontend-Verwirrung).

## Risks / Trade-offs

- **Konsistenz**: Nach dem Merge existieren zwei Recipes (einer soft-deleted). Frontends, die `alive()`-Manager nutzen, sehen nur das Target. Aber direkte DB-Queries oder `all_objects` könnten den Soft-Deleted sehen. → Geringes Risiko, da der Soft-Delete-Mechanismus etabliert ist.
- **ContentLink-Dopplung**: Wenn derselbe Merge rückgängig gemacht und wiederholt wird, könnten doppelte ContentLinks entstehen. → `get_or_create` mit Unique-Constraint überlegen (source_ct, source_id, target_ct, target_id, link_type).
- **MealPlan-Referenzen**: Nach dem Merge zeigen MealPlans noch auf das soft-gelöschte Recipe. Das kann zu "Recipe not found"-Fehlern führen. → Akzeptiert, da Non-Goal. Ein späterer Follow-Up könnte Rebind implementieren.
- **Kein Revert**: Der Merge ist nicht umkehrbar (Source wird soft-deleted, aber ContentLink wird erstellt). → Ein Restore ist über `restore()` + Löschen des ContentLinks möglich, aber nicht als API verfügbar.
