## 1. Backend: Pydantic Schemas

- [x] 1.1 Create `backend/supply/schemas/norm_person.py` with `NormPersonResultOut` schema (bmr, tdee, norm_factor, weight_kg, height_cm, age, gender, pal)
- [x] 1.2 Create `NormPersonCurvePointOut` schema (age, male_tdee, female_tdee, male_norm_factor, female_norm_factor)
- [x] 1.3 Create `NormPersonReferenceOut` schema (age, gender, pal, tdee, norm_factor)
- [x] 1.4 Create `NormPersonCurvesOut` schema (pal, reference: NormPersonReferenceOut, data_points: list[NormPersonCurvePointOut])
- [x] 1.5 Re-export new schemas in `backend/supply/schemas/__init__.py`

## 2. Backend: API Endpoints

- [x] 2.1 Create `backend/supply/api/norm_person.py` with a new Django Ninja Router
- [x] 2.2 Implement `GET /calculate` endpoint — accepts `age`, `gender`, `pal` as query params, returns `NormPersonResultOut`, no auth required
- [x] 2.3 Implement `GET /curves` endpoint — accepts `pal` as query param, iterates ages 0–99 for both genders, returns `NormPersonCurvesOut`, no auth required
- [x] 2.4 Add input validation: age 0–99, gender male/female, pal 1.0–2.5
- [x] 2.5 Register the norm-person router in `backend/supply/api/__init__.py`
- [x] 2.6 Mount the router at `/api/norm-person/` in `backend/inspi/urls.py`

## 3. Backend: Tests

- [x] 3.1 Create `backend/supply/tests/test_norm_person_api.py` with pytest tests
- [x] 3.2 Test `GET /calculate` with valid parameters (male/female, various ages)
- [x] 3.3 Test `GET /calculate` returns norm_factor 1.0 for reference person (age 15, male, PAL 1.5)
- [x] 3.4 Test `GET /calculate` with invalid parameters (age out of range, invalid gender)
- [x] 3.5 Test `GET /curves` returns 100 data points
- [x] 3.6 Test `GET /curves` with custom PAL value
- [x] 3.7 Test both endpoints are accessible without authentication

## 4. Frontend: Dependencies & Schemas

- [x] 4.1 Install recharts: `npm install recharts` in frontend/
- [x] 4.2 Create Zod schemas in `frontend/src/schemas/normPerson.ts` matching backend Pydantic schemas (NormPersonResult, NormPersonCurvePoint, NormPersonReference, NormPersonCurves)

## 5. Frontend: API Hooks

- [x] 5.1 Create `frontend/src/api/normPerson.ts` with TanStack Query hooks
- [x] 5.2 Implement `useNormPersonCalculation(age, gender, pal)` hook — `GET /api/norm-person/calculate`
- [x] 5.3 Implement `useNormPersonCurves(pal)` hook — `GET /api/norm-person/curves`

## 6. Frontend: Simulator Page

- [x] 6.1 Create `frontend/src/pages/tools/NormPortionSimulatorPage.tsx`
- [x] 6.2 Implement PAL selector (radio group or select) with options: Ruhend (1.2), Moderat (1.5), Aktiv (1.75), Sehr aktiv (2.0)
- [x] 6.3 Implement URL-driven state for PAL value (`?pal=1.5`)
- [x] 6.4 Implement TDEE line chart (recharts LineChart) with male/female lines across ages 0–99, including reference marker
- [x] 6.5 Implement norm factor line chart with male/female lines across ages 0–99, including reference line at 1.0
- [x] 6.6 Implement reference norm person info card (15 Jahre, männlich, PAL 1.5)
- [x] 6.7 Implement single person calculator section: age input, gender select, PAL select → displays BMR, TDEE, norm factor, weight, height
- [x] 6.8 Ensure mobile-responsive layout (320px minimum, vertical stacking)
- [x] 6.9 Add chart tooltips showing exact values on hover

## 7. Frontend: Routing & Navigation

- [x] 7.1 Add route `/tools/norm-portion-simulator` → `NormPortionSimulatorPage` in `frontend/src/App.tsx`
- [x] 7.2 Add "Normportion-Simulator" entry to tools navigation/landing page
