## 1. Unified Catalog (Backend)

- [x] 1.1 Create the `UNIFIED_CATALOG` dict in `suggestion_service.py` by merging the existing `SUGGESTION_CATALOG` and the `CATEGORIES` from `seed_packing_lists.py`. Extend tuple format to 5 elements: `(name, quantity, description, tags, is_do_not_bring)`. Add missing items from seed catalog (~10 items from Hausfahrt, Verpflegung, Länger als 3 Tage).
- [x] 1.2 Tag every item in the Unified Catalog with a priority tag (`basis`, `standard`, or `erweitert`) and relevant context tags (activity types, durations, seasons, age groups, exclusion tags). This is the most labor-intensive task — ~250 items need careful tagging.
- [x] 1.3 Remove the old `SUGGESTION_CATALOG` dict and update all references in `suggestion_service.py` (`get_catalog_suggestions`, `get_random_suggestions`, `get_ai_suggestions`) to use `UNIFIED_CATALOG`.
- [x] 1.4 Implement `build_dynamic_list(context: dict) -> dict[str, list]` function in `suggestion_service.py` with the three-step matching algorithm (exclusion check → priority check → context match). Include empty category removal.
- [x] 1.5 Implement `preview_dynamic_list(context: dict) -> dict` function that returns `{ categories: [{ name, item_count }], total_items }` without creating DB records.

## 2. PackingList Model Changes (Backend)

- [x] 2.1 Add four nullable CharField fields to `PackingList` model: `activity_type` (max_length=30), `duration` (max_length=20), `season` (max_length=20), `age_group` (max_length=20). All null=True, blank=True.
- [x] 2.2 Run `uv run python manage.py makemigrations packinglist` and `uv run python manage.py migrate`.

## 3. Pydantic Schemas (Backend)

- [x] 3.1 Add context fields (`activity_type`, `duration`, `season`, `age_group`) to `PackingListOut` schema as `str | None`.
- [x] 3.2 Create `GenerateContextIn` schema with fields: `activity` (str, required), `duration` (str, required), `season` (str, required), `age_group` (str | None).
- [x] 3.3 Create `GeneratePackingListIn` schema with fields: `title` (str), `context` (GenerateContextIn).
- [x] 3.4 Create `PreviewCategoryOut` schema with fields: `name` (str), `item_count` (int). Create `PreviewOut` schema with fields: `categories` (list[PreviewCategoryOut]), `total_items` (int).
- [x] 3.5 Create `PresetOut` schema with fields: `name` (str), `icon` (str), `description` (str), `context` (GenerateContextIn).
- [x] 3.6 Create `CatalogItemOut` schema with fields: `name` (str), `quantity` (str), `description` (str), `category` (str), `tags` (list[str]). Create `FullCatalogOut` schema with fields: `items` (list[CatalogItemOut]).

## 4. API Endpoints (Backend)

- [x] 4.1 Add `POST /api/packing-lists/generate/` endpoint: accepts `GeneratePackingListIn`, calls `build_dynamic_list()`, creates PackingList + categories + items in DB, stores context fields, returns `PackingListOut`. Requires authentication.
- [x] 4.2 Add `POST /api/packing-lists/preview/` endpoint: accepts `{ context: GenerateContextIn }`, calls `preview_dynamic_list()`, returns `PreviewOut`. Requires authentication.
- [x] 4.3 Add `GET /api/packing-lists/presets/` endpoint: returns list of `PresetOut` from a `PRESETS` constant. No authentication required.
- [x] 4.4 Add `GET /api/packing-lists/catalog/` endpoint: returns `FullCatalogOut` with all items from Unified Catalog (excluding is_do_not_bring items). No authentication required.
- [x] 4.5 Ensure route ordering — place all new static routes (`/generate/`, `/preview/`, `/presets/`, `/catalog/`) before the `/{packing_list_id}/` catch-all route.

## 5. Presets Definition (Backend)

- [x] 5.1 Define `PRESETS` list in `suggestion_service.py` (or new `presets.py`) with ~12-15 presets covering: Sommerlager, Winterlager, Pfingstlager, Zeltlager-Wochenende, Zeltlager langes WE, Winter-Hajk, Tageswanderung, Wochenend-Wanderung, Hausübernachtung, Kochfahrt, Singerunde, Gruppenstunde, Großfahrt, Radtour, Kanutour, Stadtfahrt, Hüttenwochenende. Each preset has name, icon (Material Symbol), description, context dict.

## 6. Seed Command Migration (Backend)

- [x] 6.1 Rewrite `seed_packing_lists.py` to use `PRESETS` + `build_dynamic_list()` instead of the old `CATEGORIES` + `TEMPLATES` approach. Remove the `CATEGORIES` dict entirely.
- [x] 6.2 Each preset becomes a seeded template PackingList with `is_template=True` and context fields stored. Preserve `--clear` idempotency behavior.
- [x] 6.3 Run `uv run python manage.py seed_packing_lists --clear` to verify the new seed works.

## 7. Zod Schemas (Frontend)

- [x] 7.1 Add context fields to `PackingListSchema`: `activity_type: z.string().nullable()`, `duration: z.string().nullable()`, `season: z.string().nullable()`, `age_group: z.string().nullable()`.
- [x] 7.2 Create `GenerateContextSchema` with fields: `activity` (string), `duration` (string), `season` (string), `age_group` (string optional).
- [x] 7.3 Create `GeneratePackingListSchema` with fields: `title` (string), `context` (GenerateContextSchema).
- [x] 7.4 Create `PreviewCategorySchema`, `PreviewSchema`, `PresetSchema`, `CatalogItemSchema`, `FullCatalogSchema` matching the backend Pydantic schemas.

## 8. API Hooks (Frontend)

- [x] 8.1 Create `useGeneratePackingList()` mutation hook: `POST /api/packing-lists/generate/`, returns `PackingList`, invalidates `packing-lists` query cache.
- [x] 8.2 Create `usePreviewPackingList()` mutation hook: `POST /api/packing-lists/preview/`, returns `Preview`.
- [x] 8.3 Create `usePresets()` query hook: `GET /api/packing-lists/presets/`, returns `Preset[]`, staleTime 1 hour.
- [x] 8.4 Create `useFullCatalog()` query hook: `GET /api/packing-lists/catalog/`, returns `FullCatalog`, staleTime 1 hour.

## 9. Wizard Page (Frontend)

- [x] 9.1 Add route `/packing-lists/new` → `PackingListWizardPage` in `App.tsx`. Protected route (requires auth).
- [x] 9.2 Create `PackingListWizardPage.tsx` with Phase 1: Activity type selection as a grid of tappable chips (Zeltlager, Hausfahrt, Tageswanderung, Radtour, Kanutour, Stadtfahrt, Hajk, Gruppenstunde). Include "Leere Liste erstellen" escape-hatch link.
- [x] 9.3 Add Phase 2: Detail selection (Duration, Season, Age Group chip groups) that animates in after activity type selection. Include title input with auto-generated placeholder.
- [x] 9.4 Add Preset quick-selection cards above/alongside the activity type grid. Fetch via `usePresets()`. Clicking a preset auto-fills all context fields.
- [x] 9.5 Add live preview panel that shows category names + item counts. Fetch via `usePreviewPackingList()` debounced (300ms) on every context change.
- [x] 9.6 Add "Packliste erstellen" submit button. On click: call `useGeneratePackingList()`, on success navigate to `/packing-lists/{id}` with success toast.
- [x] 9.7 Mobile-first responsive layout: chips wrap on small screens, Phase 2 scrolls vertically, minimum 320px width.

## 10. Autocomplete in Detail Page (Frontend)

- [x] 10.1 Create `AutocompleteInput` component: text input with dropdown overlay showing matching catalog items. Supports keyboard navigation (Arrow Up/Down, Enter, Escape). Shows max 8 matches + "als neuen Gegenstand anlegen" fallback.
- [x] 10.2 Integrate `useFullCatalog()` in `PackingListDetailPage`. Filter locally on input change: match against item name and tags (case-insensitive). Exclude items already in the packing list.
- [x] 10.3 Replace the plain text input in `QuickAddItem` with `AutocompleteInput`. When a catalog match is selected, pre-fill quantity and description from catalog data. When custom text is entered, preserve current plain-text behavior.

## 11. PackingListsPage Updates (Frontend)

- [x] 11.1 Change "Neue Packliste" button on `PackingListsPage.tsx` to navigate to `/packing-lists/new` instead of toggling the inline create form.
- [x] 11.2 Remove or hide the inline create form (title input + visibility toggle). The Wizard replaces it.
- [x] 11.3 Update the "Vorlagen" section: since templates are now generated from presets, update template cards to show context info (activity type, season, duration) if available.

## 12. Backend Tests

- [x] 12.1 Write tests for `build_dynamic_list()`: verify basis/standard/erweitert logic, exclusion tags, empty category removal, context matching.
- [x] 12.2 Write tests for `POST /api/packing-lists/generate/`: success case, missing fields (422), unauthenticated (401), verify context stored on model.
- [x] 12.3 Write tests for `POST /api/packing-lists/preview/`: verify returns correct counts without creating DB records.
- [x] 12.4 Write tests for `GET /api/packing-lists/presets/` and `GET /api/packing-lists/catalog/`.

## 13. Cleanup & Verification

- [x] 13.1 Verify Pydantic ↔ Zod schema sync for all new schemas (GenerateContext, Preview, Preset, CatalogItem, PackingList context fields).
- [x] 13.2 Run `npx tsc --noEmit` and fix any TypeScript errors introduced by this change.
- [x] 13.3 Run `uv run python manage.py test packinglist` and fix any failing tests.
- [x] 13.4 Remove the old `CATEGORIES` dict from `seed_packing_lists.py` and the old `SUGGESTION_CATALOG` from `suggestion_service.py` (replaced by UNIFIED_CATALOG).
- [x] 13.5 Verify existing suggestion features still work (random chips, KI-Vorschläge, catalog browser) with the unified catalog.
