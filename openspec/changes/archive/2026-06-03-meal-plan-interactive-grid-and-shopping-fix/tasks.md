## 1. Backend Implementation

- [x] 1.1 Support direct ingredient aggregation in `shopping_service.py`
- [x] 1.2 Implement portion override scaling factor in `shopping_service.py`
- [x] 1.3 Add backend validation and endpoints for meal creation on-demand if missing
- [x] 1.4 Write python test cases for shopping service ingredient scaling and direct ingredient calculation

## 2. Schema Sync

- [x] 2.1 Verify sync between Pydantic and Zod meal plan schemas if any changes are needed

## 3. Frontend Implementation

- [x] 3.1 Refactor `TableView.tsx` to display a fixed grid of 5 meal types per scheduled date
- [x] 3.2 Implement empty cell placeholder buttons ("+ Rezept", "+ Zutat", "+ Notiz")
- [x] 3.3 Set up immediate `Meal` slot creation request upon clicking empty slot buttons
- [x] 3.4 Implement inline multiplier ("×") factor edit inputs inside grid cells
- [x] 3.5 Implement inline delete/remove action buttons inside grid cells
- [x] 3.6 Run linter, typecheckers, and verification to ensure clean UI build
