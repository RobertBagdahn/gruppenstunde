## 0. Voraussetzung

- [ ] 0.1 `ingredient-status-visibility-unification` ist umgesetzt (insb. `food_access.can_edit` für Portionen); Branch auf diesen Stand bringen

## 1. Backend: Modell und Migration

- [ ] 1.1 `Portion.superseded_by` (FK self, `RESTRICT`, `related_name="superseded_versions"`) und `superseded_at` in `supply/models/ingredient.py` ergänzen
- [ ] 1.2 `PortionQuerySet.active()` anlegen und als Manager setzen
- [ ] 1.3 Constraints `unique_portion_name_per_ingredient` und `unique_rank1_portion_per_ingredient` auf `deleted_at IS NULL AND superseded_by IS NULL` umstellen
- [ ] 1.4 Migration erzeugen (`uv run python manage.py makemigrations supply`), reversibel inkl. Umbenennung „ (alt)“ im Rückwärtsschritt; `uv run python manage.py migrate` lokal

## 2. Backend: Service und API

- [ ] 2.1 `supersede_portion` in `supply/services/portion_integrity.py` (atomar, `select_for_update`, alte zuerst ablösen, Name/Rang übernehmen, Pfadkompression, Audit-Log)
- [ ] 2.2 `create_replacement_portion` um `supersede: bool` erweitern bzw. Aufrufer prüfen: `supply/api/ingredients.py:1045` → `supersede_portion`; `supply/services/portion_repair.py:366` → ohne Ablösung (bewusst parallele Portionen), Entscheidung im Code kommentieren
- [ ] 2.3 `update_portion`: bei Ablösung `replaced_portion_id` und `referencing_recipe_count` zurückgeben; Response-Schema `PortionUpdateOut` in `supply/schemas/ingredients.py`
- [ ] 2.4 `PortionOut` um `superseded_by_id` erweitern
- [ ] 2.5 Alle Portions-Filter `deleted_at__isnull=True` auf `.active()` umstellen (Liste per `grep -rn "deleted_at__isnull=True"` in `supply/`, `recipe/`, `planner/`, `content/`, `core/management/`); Ausnahmen gemäß design.md D2 unverändert lassen
- [ ] 2.6 `delete_portion`: Items abgelöster Vorgänger mit umhängen (design.md D8)
- [ ] 2.7 `RecipeItemOut.current_portion` (Schema `CurrentPortionOut {id, name, weight_g}`) mit Resolver; `select_related("portion__superseded_by")` in Rezept-Detail-/Item-Querysets
- [ ] 2.8 Endpunkt `POST /api/recipes/{recipe_id}/recipe-items/adopt-current-portions/` in `recipe/api/items.py` mit `AdoptCurrentPortionsIn`/`AdoptCurrentPortionsOut`, Rezept-Bearbeitungsrecht
- [ ] 2.9 Management-Command `supply/management/commands/merge_neu_portion_duplicates.py` mit `--dry-run`
- [ ] 2.10 Datenqualitäts-Kennzahl „Rezepte mit veralteten Portionen“ in `content/api/data_quality.py`

## 3. Schema-Sync (Pydantic ↔ Zod)

- [ ] 3.1 `frontend-food/src/schemas/supply.ts`: `PortionSchema.superseded_by_id`, `PortionUpdateResponseSchema` (`replaced_portion_id`, `referencing_recipe_count`)
- [ ] 3.2 `frontend-food/src/schemas/recipe.ts`: `RecipeItemSchema.current_portion` (nullable Objekt), `AdoptCurrentPortionsOutSchema`
- [ ] 3.3 `frontend-food/src/schemas/mealPlan.ts`: `IngredientPortionSchema` prüfen (Feld optional ergänzen)

## 4. Frontend

- [ ] 4.1 Portion-Update-Mutation: bei `replaced_portion_id` Zutat-, Portions- und Rezept-Queries invalidieren; Toast mit `referencing_recipe_count`
- [ ] 4.2 Hook `useAdoptCurrentPortions(recipeId)` (TanStack Query, invalidiert Rezept-Detail)
- [ ] 4.3 `components/recipe/InlineIngredientEditor.tsx`: Hinweiszeile pro Item mit `current_portion`, Button „Aktualisieren“, Sammelaktion „Alle aktualisieren (N)“; nur im Bearbeitungsmodus mit Bearbeitungsrecht
- [ ] 4.4 Portion-Picker: gewählte abgelöste Portion als aktuellen Wert anzeigen, nicht als Option anbieten

## 5. Tests

- [ ] 5.1 Model/Constraint: gleicher Name nach Ablösung erlaubt; zweite aktive Rang-1-Portion verboten
- [ ] 5.2 `supersede_portion`: Name/Rang übernommen, kein „(neu)“, Pfadkompression A→C, Audit-Eintrag
- [ ] 5.3 API `update_portion`: referenziert + Gewicht → Ablösung; unreferenziert → in place; nur Name → in place; 403 anonym; 404/403 ohne Recht; Owner einer verifizierten Zutat → 403; Staff an verifizierter Zutat → Ablösung, Status bleibt `verified`
- [ ] 5.4 Listing/Detail/Katalog/Picker liefern keine abgelösten Portionen
- [ ] 5.5 Nährwerte und Kosten eines Rezepts mit abgelöster Portion bleiben unverändert; `rebind_dead_portion_references` fasst sie nicht an
- [ ] 5.6 `adopt-current-portions`: einzeln, alle, Anzahl bleibt, Gramm ändern sich; 403 anonym und ohne Recht
- [ ] 5.7 `delete_portion` auf Nachfolger hängt Items der Vorgänger um
- [ ] 5.8 Grep-Test: kein neues `portions.filter(deleted_at__isnull=True)` außerhalb der Ausnahmen
- [ ] 5.9 `merge_neu_portion_duplicates` Dry-Run und Ausführung
- [ ] 5.10 Frontend-Tests Hinweiszeile und „Alle aktualisieren“ (Vitest)
- [ ] 5.11 `uv run pytest supply recipe planner`, `npm run lint`, `npm run typecheck`, `npm test` grün
