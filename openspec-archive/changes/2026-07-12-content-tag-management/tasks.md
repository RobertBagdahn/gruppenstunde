## 1. Frühstückstage löschen

- [x] 1.1 Backend: `supply/api/breakfast_days.py` löschen
- [x] 1.2 Backend: `supply/api/__init__.py` — breakfast_days_router-Export entfernen
- [x] 1.3 Backend: `inspi/urls.py` — breakfast_days_router-Registrierung entfernen
- [x] 1.4 Backend: `planner/api/meal_plan.py` — breakfast_day-Filterlogik entfernen (~Zeile 1994)
- [x] 1.5 Backend: `supply/management/commands/seed_breakfast_catalog.py` — breakfast_day-Seed-Einträge entfernen
- [x] 1.6 Backend: `supply/tests/test_breakfast_days.py` löschen
- [x] 1.7 Frontend: `components/breakfast/BreakfastDayManager.tsx` löschen
- [x] 1.8 Frontend: `pages/admin/AdminPage.tsx` — breakfast-days Tab, Import, Rendering entfernen
- [x] 1.9 Frontend: `api/breakfast.ts` — useBreakfastDays/useCreateBreakfastDay/useUpdateBreakfastDay/useDeleteBreakfastDay löschen (Zeilen ~208-299), Import BreakfastDay/BreakfastDaySchema in Zeile 19 entfernen
- [x] 1.10 Frontend: `schemas/breakfast.ts` — BreakfastDay-Schema löschen (Zeilen ~239-247). Vorher prüfen: keine anderen Dateien außer api/breakfast.ts importieren BreakfastDay/BreakfastDaySchema.
- [x] 1.11 Frontend: `pages/recipes/EditRecipePage.tsx` — Frühstückstage-Sektion entfernen
- [x] 1.12 Frontend: `pages/planning/RecipeSearchDialog.tsx` — Frühstückstag-Filter-Pills entfernen

## 2. content.Tag Modell-Upgrade (UUID, description, embedding)

- [x] 2.1 Backend: `content/models/tags.py` — `id` auf UUIDField(PK) ändern, `description` TextField hinzufügen, `embedding` entfernen
- [x] 2.2 Backend: Migration 1 — uuid-Feld hinzufügen und für alle existierenden Tags befüllen
- [x] 2.3 Backend: Migration 2 — PK von Integer auf UUID wechseln, parent-FK auf UUID mappen
- [x] 2.4 Backend: Migration 3 — Alle M2M-Through-Tabellen (recipe_recipe_tags, supply_ingredient_tags, session_groupsession_tags, blog_blog_tags, game_game_tags, event_event_tags) tag_id auf UUID umstellen
- [x] 2.5 Backend: Migration 4 — content_tagsuggestion.parent_id auf UUID umstellen
- [x] 2.6 Backend: Migration 5 — embedding-Feld aus content_tag entfernen
- [x] 2.7 Backend: `content/schemas/base.py` — TagOut.id/parent_id int→str, +description, -embedding; TagTreeOut.id/parent_id int→str; TagSuggestIn.parent_id int→str; tag_ids in ContentCreateIn/ContentUpdateIn list[int]→list[str]; resolve_tags()-Methoden anpassen (id, parent_id); scout_level_ids bleibt list[int]
- [x] 2.8 Backend: `content/api/tags.py` — Response-Schema anpassen (UUID als String)
- [x] 2.9 Frontend: `frontend-food/src/schemas/content.ts` — TagSchema.id/parent_id z.number()→z.string(); AiSuggestTagsSchema.tag_ids z.array(z.number())→z.array(z.string()); AiRefurbishSchema.suggested_tag_ids z.array(z.number())→z.array(z.string()); suggested_tags[].id/parent_id z.number()→z.string()
- [x] 2.10 Frontend: `frontend-food/src/api/breakfast.ts` — CreateIngredientPayload.tag_ids number[]→string[] (Zeile 350), CreateRecipePayload.tag_ids number[]→string[] (Zeile 396)
- [x] 2.11 Frontend: `frontend-food/src/api/recipeImport.ts` — tag_ids z.array(z.number())→z.array(z.string()) (Zeile 43)
- [x] 2.12 Frontend: `frontend-food/src/api/recipes.ts` — tag_ids number[]→string[] (Zeilen 240, 290)
- [x] 2.13 Frontend: `frontend-food/src/api/mealPlans.ts` — tag_ids number[]→string[] (Zeile 466)

## 3. Equipment Model

- [x] 3.1 Backend: `supply/models/equipment.py` — Equipment-Modell (name, slug, Meta)
- [x] 3.2 Backend: `supply/models/__init__.py` — Equipment exportieren
- [x] 3.3 Backend: Migration für Equipment-Tabelle + Seed-Daten (Topf, Pfanne, Ofen, Grill, Dutch Oven, Thermomix, Wasserkocher, Kühlschrank)
- [x] 3.4 Backend: `supply/schemas/reference.py` — EquipmentOut-Pydantic-Schema
- [x] 3.5 Backend: `supply/api/equipment.py` — Equipment-CRUD-API (GET list + POST + PATCH + DELETE, staff-only)
- [x] 3.6 Backend: `supply/api/__init__.py` — equipment_router exportieren
- [x] 3.7 Backend: `inspi/urls.py` — equipment_router registrieren unter `/api/supply/equipment/`
- [x] 3.8 Frontend: `api/admin.ts` — TanStack Query Hooks (useAdminEquipment, useCreateEquipment, useUpdateEquipment, useDeleteEquipment)
- [x] 3.9 Frontend: `schemas/supply.ts` — Equipment-Zod-Schema (EquipmentOut, EquipmentIn)
- [x] 3.10 Frontend: `pages/admin/EquipmentTab.tsx` — Equipment-CRUD-Tabelle (Pattern: NutritionalTagTab), Inline-Dialog für Create/Edit
- [x] 3.11 Frontend: `pages/admin/AdminPage.tsx` — Equipment-Tab hinzufügen (Navigation, Tab-Button, Komponenten-Rendering)

## 4. Recipe Enum-Felder

- [x] 4.1 Backend: `recipe/models/recipe.py` — `preparation_method` CharField mit Choices hinzufügen, `equipment` M2M zu Equipment
- [x] 4.2 Backend: Migration für preparation_method + equipment M2M auf Recipe
- [x] 4.3 Backend: `recipe/schemas/recipe.py` — Pydantic-Schema um preparation_method + equipment erweitern
- [x] 4.4 Backend: `recipe/api/recipe.py` — CRUD-Endpunkte für preparation_method + equipment aktualisieren, Filter-Parameter hinzufügen
- [x] 4.5 Backend: `recipe/api/recipe.py` — `get_recipes` Query-Parameter `preparation_method` und `equipment` hinzufügen
- [x] 4.6 Frontend: `schemas/` — Recipe-Zod-Schema um preparation_method + equipment erweitern
- [x] 4.7 Frontend: `pages/recipes/EditRecipePage.tsx` — preparation_method-Dropdown + equipment-Multi-Select hinzufügen

## 5. Tag Admin Backend

- [x] 5.1 Backend: `content/api/admin_tags.py` — Admin-Tag-CRUD-API (GET list paginated, POST, PATCH, DELETE, staff-only)
- [x] 5.2 Backend: `content/api/admin_tags.py` — Tag-Detail-Endpoint GET {id}/detail/ mit recipes + ingredients
- [x] 5.3 Backend: `content/schemas/base.py` — Admin-spezifische Pydantic-Schemas (TagAdminIn, TagAdminOut, TagDetailOut)
- [x] 5.4 Backend: `content/api/__init__.py` — admin_tags_router exportieren
- [x] 5.5 Backend: `inspi/urls.py` — admin_tags_router registrieren unter `/api/admin/tags/`
- [x] 5.6 Backend: Tests für Admin-Tag-CRUD + Detail-Endpoint (`content/tests/test_admin_tags.py`)

## 6. Tag Admin Frontend

- [x] 6.1 Frontend: `api/admin.ts` — TanStack Query Hooks (useAdminTags, useCreateTag, useUpdateTag, useDeleteTag, useTagDetail)
- [x] 6.2 Frontend: `schemas/` — Admin-Tag-Zod-Schemas (TagAdminIn, TagAdminOut)
- [x] 6.3 Frontend: `pages/admin/TagTab.tsx` — Tag-CRUD-Tabelle (Pattern: NutritionalTagTab), Inline-Dialog für Create/Edit, DeleteConfirmDialog, Slug read-only (auto-generiert aus Name)
- [x] 6.4 Frontend: `pages/admin/AdminPage.tsx` — Tags-Tab hinzufügen (Navigation, Tab-Button, Komponenten-Rendering)
- [x] 6.5 Frontend: `pages/admin/TagDetailPage.tsx` — Tag-Detailseite mit Rezept- und Zutaten-Listen (paginierte Tabellen)
- [x] 6.6 Frontend: `App.tsx` — Route `/admin/tag/:id` hinzufügen (Singular, VOR `/admin/:section` um Routing-Konflikt zu vermeiden)

## 7. Tests & Cleanup

- [x] 7.1 Backend: `uv run python manage.py makemigrations --check` — sicherstellen dass alle Migrationen erstellt sind
- [x] 7.2 Backend: `uv run python manage.py test content.tests.test_admin_tags` — Tag-Admin-Tests
- [x] 7.3 Frontend: TypeScript-Check mit `npm run typecheck` (in frontend-food/)
- [x] 7.4 Frontend: Lint-Check mit `npm run lint` (in frontend-food/)
- [x] 7.5 OpenSpec: `breakfast-days`-Spec aus `openspec/specs/` löschen (oder als deprecated markieren)
- [x] 7.6 OpenSpec: `food-admin`-Spec mit Tags-Tab aktualisieren
- [x] 7.7 OpenSpec: `recipe`-Spec mit neuen Feldern aktualisieren
