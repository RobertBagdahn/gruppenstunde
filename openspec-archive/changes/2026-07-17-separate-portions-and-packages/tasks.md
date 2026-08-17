## 1. Datenmodell & Migration

- [x] 1.1 `Package`-Model in `supply/models/ingredient.py` anlegen (`name`, `weight_g`, `rank`, `ingredient` FK, timestamps, created_by/updated_by, `deleted_at`)
- [x] 1.2 `Portion.is_system`-Feld aus dem Model entfernen, `system_portion_names()` classmethod entfernen
- [x] 1.3 `RecipeItem.portion` nullable machen (`null=True, blank=True`)
- [x] 1.4 Django-Migration mit `RunPython`: existierende "Packung"-System-Portionen → Package, "g" → löschen + RecipeItems rebinden, "Stück" → is_system=False
- [x] 1.5 `__init__.py` in `supply/models/` updaten (Package re-exportieren)
- [x] 1.6 `supply/admin.py`: `PortionInline`/`PortionAdmin` von `is_system` befreien, `PackageInline` + `PackageAdmin` hinzufügen

## 2. Pydantic Schemas

- [x] 2.1 `PortionOut.is_system` entfernen, `PortionApplySuggestionIn.portion_type` entfernen (da kein system_gramm mehr)
- [x] 2.2 Neue Schemas: `PackageOut`, `PackageCreateIn`, `PackageUpdateIn`, `PackageReorderIn`, `PackageReorderItem`
- [x] 2.3 `IngredientDetailOut` um `packages: list[PackageOut]` erweitern
- [x] 2.4 `AiApplyIn`: neues kombiniertes Schema mit `portions` + `packages` (bisher `PortionApplyIn` mit `selected`)
- [x] 2.5 `IngredientPortionSuggestOut` → `IngredientAiSuggestOut`: ohne `system_gramm`, `packungen` → `packages`
- [x] 2.6 `portion_knowledge.py`: `PortionType.SYSTEM_GRAMM` entfernen, `PortionSuggestion` und `IngredientPortionSuggestSchema` ohne `system_gramm`

## 3. Backend Signals

- [x] 3.1 `_create_system_portions()` in `supply/signals.py` entfernen
- [x] 3.2 `create_base_portion_for_ingredient()` Signal-Handler entfernen
- [x] 3.3 `post_save` Ingredient Signal: nur noch Embedding + Quality-Score (keine System-Portion-Creation)
- [x] 3.4 `calculate_portion_weight_g` pre_save Signal bleibt (brauchen wir weiterhin)

## 4. Backend API

- [x] 4.1 Package-Endpoints in `supply/api/ingredients.py`: `GET packages/`, `POST packages/`, `PATCH packages/{id}/`, `DELETE packages/{id}/`, `POST packages/reorder/`
- [x] 4.2 `ai_apply_portions` → `ai_apply` umbenennen, Route von `portions/ai-apply/` → `ai-apply/`, verarbeitet `portions` + `packages`
- [x] 4.3 `reorder_portions`: Lock auf `g` bei rank=9999 entfernen
- [x] 4.4 `delete_portion`: `is_system`-Guard entfernen
- [x] 4.5 `create_portion`/`update_portion`: Referenzen auf `is_system` entfernen
- [x] 4.6 `list_portions`: `is_system`-Filter entfernen
- [x] 4.7 `IngredientDetailOut`-Response in `get_ingredient` um `packages` erweitern
- [x] 4.8 URL Routing prüfen: Literal-Routen (`packages/reorder/`, `ai-apply/`) vor parametrisierten Routen

## 5. Backend Services

- [x] 5.1 `portion_knowledge.py`: `build_portion_prompt_section()` ohne system_gramm, `packungen` als packages-Prompt
- [x] 5.2 `ingredient_ai_suggest_service.py`: `ai_create_ingredient()` erstellt Packages statt "Packung"-Portionen, kein `_create_system_portions()`-Call mehr
- [x] 5.3 `quality_score.py`: System-Portion-Check (5%) entfernen, Gewichte auf 100% neu verteilen
- [x] 5.4 `utils.py`: `get_shopping_portion()` nutzt `.packages` (rank=1) statt `is_system=False` Filter
- [x] 5.5 `utils.py`: `build_package_display()` nutzt `Package`-Model statt String-Matching auf "Packung"-Portionen
- [x] 5.6 `shopping_service.py`: Package-Filter von `is_system`+String-Matching auf `.packages` RelatedManager umstellen
- [x] 5.7 `breakfast_catalog.py`: Package-Filter für Leftover-Berechnung umstellen
- [ ] 5.8 Alle `portion.weight_g`-Zugriffe auf nullable prüfen (RecipeItem.portion kann NULL sein)

## 6. Management Commands

- [x] 6.1 `backfill_system_portions.py` löschen
- [x] 6.2 `check_portion_duplicates.py` von System-Portion-Referenzen befreien

## 7. Import/Export

- [ ] 7.1 `export_prod_data.py`: Package-Tabelle zum Export-Handling hinzufügen
- [ ] 7.2 `import_prod_data.py`: Package in FK-Dependency-Order und Food-Group aufnehmen, Signal-Silencing prüfen

## 8. Frontend Zod Schemas

- [ ] 8.1 `frontend-food/src/schemas/supply.ts`: `PortionSchema.is_system` entfernen
- [ ] 8.2 Neue `PackageSchema`, `PackageCreateSchema`, etc. in `frontend-food/src/schemas/supply.ts`
- [ ] 8.3 `IngredientDetailSchema` um `packages: z.array(PackageSchema)` erweitern
- [ ] 8.4 `IngredientPortionSuggestSchema` → ohne `system_gramm`, `packungen` → `packages`
- [ ] 8.5 `PortionSuggestionSchema`: `portion_type` ohne `system_gramm`

## 9. Frontend API Hooks

- [ ] 9.1 `frontend-food/src/api/supplies.ts`: `useIngredientPackages`, `useCreatePackage`, `useUpdatePackage`, `useDeletePackage`, `useReorderPackages`
- [ ] 9.2 `useApplyAiPortionSuggestions` → `useApplyAiSuggestions` umbenennen, neuen Endpoint `ai-apply/` nutzen, `portions` + `packages` senden
- [ ] 9.3 `useReorderPortions`/`useDeletePortion`: `is_system`-Logik entfernen

## 10. Frontend UI

- [ ] 10.1 `IngredientDetailPage.tsx`: `PortionsSection` in zwei Sektionen splitten — „Portionen" und „Packungen"
- [ ] 10.2 Neue `PackagesSection`-Komponente mit eigener Add-/Edit-/Delete-/Drag-Logik (analog zu `PortionsSection`)
- [ ] 10.3 `PortionCard`: `is_system`-Badge und Lock-Icon entfernen
- [ ] 10.4 `SortablePortionItem`: "g"-Disabled-Logik entfernen
- [ ] 10.5 `PortionCard`: "Packung"-Gewichtswarnung entfernen (in Package-Sektion integriert)
- [ ] 10.6 AI-Suggestions-Apply-Dialog: `portions` + `packages` als getrennte Gruppen anzeigen und gemeinsam anwenden

## 11. Frontend Libs

- [ ] 11.1 `portionDefaults.ts`: `selectDefaultPortion()` ohne `g`-Fallback (kein `weight_g <= 1` Check mehr)
- [ ] 11.2 `portionValidation.ts`: `isSuspiciousPlaceholderWeight()` prüfen — ggf. anpassen
- [ ] 11.3 `portionQuantityHint.ts` und `portionDisplay.ts`: Package-Referenzen prüfen, ggf. auf `.packages` umstellen

## 12. Tests

- [ ] 12.1 Backend: Test für Package-Model (CRUD, Unique-Constraints, Soft-Delete, Rank-1-Uniqueness)
- [ ] 12.2 Backend: Test für Package-API-Endpoints (create, list, update, delete, reorder, auth-guards)
- [ ] 12.3 Backend: Test für kombinierten AI-Apply-Endpoint (portions + packages, replace_all, Fehlerfälle)
- [ ] 12.4 Backend: Migration-Test (RunPython: Packung → Package, g → löschen, Stück → normale Portion)
- [ ] 12.5 Backend: `RecipeItem.portion=NULL` Fallback in Rezept-Gewichtsberechnungen testen
- [ ] 12.6 Backend: `get_shopping_portion()` und `build_package_display()` mit Package-Model testen
- [ ] 12.7 Backend: Vorhandene Tests fixen (is_system-Referenzen entfernen, g-Portion-Erwartungen updaten)
- [ ] 12.8 Frontend: Package-CRUD-Flow testen
- [ ] 12.9 Frontend: IngredientDetailPage mit getrennten Sektionen testen

## 13. Cleanup & Verification

- [ ] 13.1 Alle `is_system`-Referenzen im gesamten Codebase auditieren und entfernen (grep)
- [ ] 13.2 Alle `system_portion_names`-Referenzen auditieren und entfernen
- [ ] 13.3 Alle `_create_system_portions`-Importe und Aufrufe entfernen
- [ ] 13.4 `uv run python manage.py makemigrations --check` — muss clean sein
- [ ] 13.5 `uv run python manage.py test` — alle Tests müssen grün sein
- [ ] 13.6 Frontend: `npm run typecheck` und `npm run lint` müssen clean sein
- [ ] 13.7 Frontend Food: `npm run typecheck` und `npm run lint` müssen clean sein
