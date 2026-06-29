## 1. Backend — Tag.group-Feld

- [x] 1.1 Add `group` CharField to `content.Tag` model (max_length=50, default="general", blank=True)
- [x] 1.2 Create migration for Tag.group
- [x] 1.3 Add `group` filter to Tag API endpoint (`GET /api/content/tags/?group=breakfast_day`)
- [x] 1.4 Update TagOut Pydantic schema to include `group` field
- [x] 1.5 Update Tag admin to show/edit `group` field
- [x] 1.6 Run `uv run python manage.py makemigrations && uv run python manage.py migrate`

## 2. Backend — BreakfastDay CRUD-API

- [x] 2.1 Create `GET /api/breakfast-days/` endpoint (lists Tags with group="breakfast_day")
- [x] 2.2 Create `POST /api/breakfast-days/` endpoint (creates Tag with group="breakfast_day")
- [x] 2.3 Create `PUT /api/breakfast-days/{id}/` endpoint (renames Tag)
- [x] 2.4 Create `DELETE /api/breakfast-days/{id}/` endpoint (deletes Tag, checks references)
- [x] 2.5 Create Pydantic schemas for BreakfastDay CRUD (BreakfastDayNameIn)
- [x] 2.6 Add backend tests for BreakfastDay CRUD endpoints

## 3. Backend — BreakfastCatalog optionaler Tag-Filter

- [x] 3.1 Add optional `tag_ids` query parameter to `GET /api/supply/breakfast-catalog/`
- [x] 3.2 Filter `drink_recipes` by tag_ids (AND logic: recipe has ALL specified tags)
- [x] 3.3 Add backend tests for filtered catalog endpoint

## 4. Backend — Seed-Daten für Frühstückstage

- [x] 4.1 Add seed logic for 5 default breakfast day Tags (group="breakfast_day", names "Tag 1"–"Tag 5")
- [x] 4.2 Run seed and verify Tags exist with correct group

## 5. Frontend — Zod-Schema-Sync

- [x] 5.1 Update `breakfast.ts` Zod schemas: new `DrinkState` (selected: Array<{recipeId, title, sharePercent}>)
- [x] 5.2 Update `defaultWizardState()` to return empty drinks.selected array
- [ ] 5.3 Update Zod schema for DrinkRecipe to include tag_ids — not needed, tags are separate
- [x] 5.4 Add Zod schema for BreakfastDay (id, name, slug)
- [ ] 5.5 Sync TagOut schema in frontend to include `group` field — not needed, frontend uses TagOut from content API

## 6. Frontend — BreakfastDay API-Hooks

- [x] 6.1 Create `useBreakfastDays()` hook (fetches Tags with group="breakfast_day")
- [x] 6.2 Create `useCreateBreakfastDay()` mutation hook
- [x] 6.3 Create `useUpdateBreakfastDay()` mutation hook
- [x] 6.4 Create `useDeleteBreakfastDay()` mutation hook

## 7. Frontend — BreakfastDayManager-Komponente

- [x] 7.1 Create `BreakfastDayManager` component (list + CRUD modal)
- [x] 7.2 Implement "Neuen Tag anlegen" form
- [x] 7.3 Implement "Tag umbenennen" action
- [x] 7.4 Implement "Tag löschen" with confirmation (show recipe count if used)
- [ ] 7.5 Add route/page for BreakfastDayManager — needs dedicated route setup

## 8. Frontend — RecipeSearchDialog mit Frühstückstag-Filter

- [x] 8.1 Add `breakfastDayTags` prop to RecipeSearchDialog
- [x] 8.2 Add `selectedBreakfastDayTagIds` state
- [x] 8.3 Render Frühstückstag filter pill row (conditional — only when breakfastDayTags provided)
- [x] 8.4 Implement pill toggle logic (select/deselect tag, "Alle" = no filter)
- [x] 8.5 Pass selected tag_ids to recipe search API call

## 9. Frontend — Recipe-Edit mit Frühstückstag-Auswahl

- [x] 9.1 Add Frühstückstag multi-select section to recipe edit form
- [x] 9.2 Filter available tags to group="breakfast_day" only
- [x] 9.3 Save selected tags with recipe on form submit (uses existing tag_ids mechanism)

## 10. Frontend — WizardState neue Drink-Struktur

- [x] 10.1 Update `WizardState.drinks` type and default in `breakfast.ts`
- [x] 10.2 Update `useWizardState.ts` for new drinks format (addDrink, removeDrink, setDrinkShare)
- [x] 10.3 Update `breakfastCalc.ts` — remove milk calculations, adapt for dynamic drinks
- [x] 10.4 Update `buildItems()` in BreakfastWizardPage to serialize new drinks format
- [x] 10.5 Update `refMealToWizardState.ts` to reconstruct new drinks format (skip old format)

## 11. Frontend — StepGetraenke-Rewrite

- [x] 11.1 Rewrite StepGetraenke: dynamic drink list with per-drink percent sliders
- [x] 11.2 Implement rebalance logic for dynamic array (proportional redistribution on change)
- [x] 11.3 Implement "✕ remove drink" with redistribution to remaining drinks
- [x] 11.4 Implement "[+ Getränk]" button → opens RecipeSearchDialog
- [x] 11.5 Configure RecipeSearchDialog with pre-filtered recipe_type=["drink"] + breakfastDayTags
- [x] 11.6 Remove all milk UI (mlPerPerson, sliders, milk sections)

## 12. Frontend — StepCockpit-Anpassung

- [x] 12.1 Remove getränke from cockpit table
- [x] 12.2 Remove getränke from energy calculation (Soll/Ist)
- [x] 12.3 Update normalize function to skip getränke scaling

## 13. Testing

- [x] 13.1 Backend tests for Tag.group migration and filter (covered in breakfast_days tests)
- [x] 13.2 Backend tests for BreakfastDay CRUD (13 tests)
- [x] 13.3 Backend tests for catalog tag_ids filter (3 tests)
- [ ] 13.4 Frontend tests for new StepGetraenke behavior
- [ ] 13.5 Frontend tests for RecipeSearchDialog breakfast day filter
- [ ] 13.6 Manual test: complete wizard run with dynamic drinks
