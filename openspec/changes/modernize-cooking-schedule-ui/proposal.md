## Why

The Cooking Schedule view has visual redundancy and inconsistency that creates clutter and confusion:
- **Redundant color dots**: Meal category indicators appear twice (in header + timeline), cluttering the visual hierarchy
- **Outdated icons**: Material Design icon strings scattered throughout instead of modern, consistent Lucide icons
- **Color inconsistency**: Different color palettes used across components (CookingScheduleTab vs mealPlan.ts), breaking visual unity
- **Lack of polish**: No hover effects, inconsistent styling across Inspi Food tabs

These issues make the interface feel unfinished and harder to scan quickly when planning meals.

## What Changes

- **Remove redundant timeline dots**: Eliminate color dots from individual timeline items; keep only the meal category header indicator
- **Remove timeline vertical lines**: Simplify timeline visualization
- **Modernize icons to Lucide**: Replace all Material Design icon strings with consistent Lucide React icons
  - `bakery_dining` → `UtensilsCrossed` + breakfast styling
  - `restaurant` → `UtensilsCrossed` + lunch styling
  - `dinner_dining` → `Moon` + dinner styling
  - `cookie` → `Cookie` + snack styling
- **Unify color palette**: Standardize meal category colors across all components
- **Add subtle interactions**: Hover effects (light color fade, 5% scale) on meal categories and buttons
- **Update tab buttons**: Show only icons (remove text labels) for Share/Settings buttons for compactness
- **Ensure responsive design**: Icons and layouts work consistently on mobile & desktop
- **Add ARIA labels**: Ensure all icons have proper accessibility attributes

## Capabilities

### New Capabilities
- `meal-category-visual-clarity`: Clear, non-redundant visual hierarchy for meal categories across Inspi Food. Single authoritative indicator per category with modern Lucide icons and unified colors.

### Modified Capabilities
- `meal-plan-cooking-schedule`: Enhanced visual design with modern icons, cleaner timeline, and improved scannability
- `meal-plan-ui-polish`: Contributes to consistent, polished design language across meal planning views

## Impact

**Affected Django Apps**: planner (meal_plan schemas/constants)

**Affected React Pages**: 
- `frontend-food/src/pages/planning/CookingScheduleTab.tsx` (main changes)
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (tab icons)
- `frontend-food/src/pages/planning/*` (other views for consistency)

**Affected Schemas**:
- Pydantic: `backend/planner/schemas/meal_plan.py` (MEAL_TYPE_* constants)
- Zod: `frontend-food/src/schemas/mealPlan.ts` (MEAL_TYPE_* constants)

**Icon Library**: Uses `lucide-react` (already installed, v0.447.0)

**Dependencies**: No new dependencies required

**Breaking Changes**: None — purely visual refinements
