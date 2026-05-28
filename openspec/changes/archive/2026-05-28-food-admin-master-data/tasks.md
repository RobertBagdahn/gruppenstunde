## 1. Backend — Pydantic Schemas

- [x] 1.1 Create `RetailSectionIn` und `RetailSectionOut` Schemas in `backend/supply/schemas/`
- [x] 1.2 Create `NutritionalTagIn` und `NutritionalTagOut` Schemas in `backend/supply/schemas/`
- [x] 1.3 Create `HealthRuleIn` und `HealthRuleOut` Schemas in `backend/recipe/schemas/`

## 2. Backend — CRUD API-Endpunkte

- [x] 2.1 Add Create/Update/Delete Endpunkte für RetailSection in `backend/supply/api/retail_sections.py` (staff-only)
- [x] 2.2 Add Create/Update/Delete Endpunkte für NutritionalTag in `backend/supply/api/materials.py` oder eigene Datei (staff-only)
- [x] 2.3 Add CRUD-Endpunkte für HealthRule in `backend/recipe/api/` (neue Datei `health_rules.py`, staff-only)
- [x] 2.4 Register neue Router in den jeweiligen App-Routern

## 3. Frontend-food — Zod Schemas & API Hooks

- [x] 3.1 Create Zod Schemas für RetailSection (In/Out) in `frontend-food/src/schemas/`
- [x] 3.2 Create Zod Schemas für NutritionalTag (In/Out) in `frontend-food/src/schemas/`
- [x] 3.3 Create Zod Schemas für HealthRule (In/Out) in `frontend-food/src/schemas/`
- [x] 3.4 Create TanStack Query Hooks für RetailSection CRUD
- [x] 3.5 Create TanStack Query Hooks für NutritionalTag CRUD
- [x] 3.6 Create TanStack Query Hooks für HealthRule CRUD
- [x] 3.7 Create TanStack Query Hooks für RecipeHint CRUD (oder bestehende aus main-frontend portieren)

## 4. Frontend-food — Admin-Seite & Layout

- [x] 4.1 Create `StaffGuard` Komponente (redirect wenn nicht Staff)
- [x] 4.2 Create `AdminPage` mit Tab-Navigation (retail-sections, nutritional-tags, recipe-hints, health-rules)
- [x] 4.3 Add `/admin` und `/admin/:section` Routen in `App.tsx`
- [x] 4.4 Add Admin-Link in FoodLayout Navigation (nur für Staff sichtbar)

## 5. Frontend-food — Individuelle Formulare & Tabellen

- [x] 5.1 Create RetailSection-Tab: Tabelle + Create/Edit Dialog
- [x] 5.2 Create NutritionalTag-Tab: Tabelle + Create/Edit Dialog
- [x] 5.3 Create RecipeHint-Tab: Tabelle + Create/Edit Dialog (portiert aus main-frontend)
- [x] 5.4 Create HealthRule-Tab: Tabelle + Create/Edit Dialog
- [x] 5.5 Create shared `DeleteConfirmDialog` Komponente

## 6. Cleanup — Haupt-Frontend

- [x] 6.1 Remove `RecipeHintAdminPage` aus `frontend/src/pages/admin/`
- [x] 6.2 Remove recipe-hints Tab aus AdminPage in `frontend/`
