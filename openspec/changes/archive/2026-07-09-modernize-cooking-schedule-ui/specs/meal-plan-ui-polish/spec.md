# Meal Plan UI Polish (Delta)

## MODIFIED Requirements

### Requirement: Consistent icon system across meal plan views
The system SHALL use a unified icon library across all meal plan tabs and components.

**Previous behavior**: Mixed icon sources (Material Design strings, inline emoji, inconsistent Lucide imports).

**Updated behavior**: All icons in meal plan views source exclusively from lucide-react library.

#### Scenario: Tab navigation consistency
- **WHEN** user views meal plan tabs (Tagesplan, Tabelle, Kochplan, Nährwerte, Kosten, Einkaufsliste, Vorschläge)
- **THEN** each tab displays a Lucide icon:
  - Tagesplan → Calendar
  - Tabelle → Grid3X3
  - Kochplan → ChefHat
  - Nährwerte → Scale
  - Kosten → DollarSign
  - Einkaufsliste → ShoppingCart
  - Vorschläge → Lightbulb
- **AND** all icons have consistent stroke weight and sizing

#### Scenario: Intra-view icon consistency
- **WHEN** user navigates within meal plan views (e.g., Kochplan → Nährwerte)
- **THEN** icons maintain consistent visual style, weight, and sizing across all views
- **AND** icon colors are applied consistently (primary/muted based on context)

### Requirement: Refined button styling
The system SHALL apply modern, compact button designs in meal plan headers.

**Previous behavior**: Icon + text buttons (Share, Settings) took up significant space.

**Updated behavior**: Icon-only buttons with visible icons and subtle hover effects.

#### Scenario: Action button display
- **WHEN** user views meal plan header with Share and Settings actions
- **THEN** buttons display only the icon (no text label)
- **AND** buttons maintain minimum 44×44px touch target
- **AND** on hover, background applies light tint with subtle scale animation

#### Scenario: Mobile responsiveness
- **WHEN** user views meal plan header on mobile (≤640px)
- **THEN** icon-only buttons remain usable and not cramped
- **AND** accessibility is maintained (ARIA labels present)

### Requirement: Unified color system
The system SHALL apply consistent meal category colors across meal plan views.

**Previous behavior**: Multiple color definitions (CookingScheduleTab.MEAL_TYPE_DOT_COLORS vs mealPlan.ts MEAL_TYPE_COLORS) leading to visual inconsistency.

**Updated behavior**: Single source of truth for meal category colors across frontend.

#### Scenario: Color palette application
- **WHEN** meal plan renders meal categories (Frühstück, Mittagessen, Abendessen, Snack)
- **THEN** categories use unified colors:
  - Breakfast: Amber/Orange (text-orange-600, bg-orange-50 or variants)
  - Lunch: Cyan/Teal (text-cyan-600, bg-cyan-50 or variants)
  - Dinner: Indigo/Blue (text-indigo-600, bg-indigo-50 or variants)
  - Snack: Amber/Rose (text-amber-600, bg-amber-50 or variants)
- **AND** colors are sourced from a single MEAL_TYPE_COLORS definition

#### Scenario: Cross-view consistency
- **WHEN** user switches between Tagesplan, Kochplan, Nährwerte views
- **THEN** meal category colors remain identical across all views
- **AND** no flickering or re-rendering occurs due to color changes
