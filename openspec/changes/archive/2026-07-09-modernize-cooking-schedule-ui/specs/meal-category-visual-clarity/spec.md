# Meal Category Visual Clarity

## ADDED Requirements

### Requirement: Unified meal category indicators
The system SHALL display meal categories with a single, non-redundant visual indicator per category that combines color and modern icon.

#### Scenario: Breakfast category display
- **WHEN** user views cooking schedule for a day with breakfast items
- **THEN** the breakfast category header displays a single colored dot (amber/orange) paired with a consistent breakfast icon (UtensilsCrossed)
- **AND** no duplicate indicators appear on individual timeline items

#### Scenario: Lunch category display
- **WHEN** user views cooking schedule for a day with lunch items
- **THEN** the lunch category header displays a single colored dot (emerald/green) paired with a lunch icon (UtensilsCrossed)
- **AND** no duplicate indicators appear on individual timeline items

#### Scenario: Dinner category display
- **WHEN** user views cooking schedule for a day with dinner items
- **THEN** the dinner category header displays a single colored dot (indigo/blue) paired with a moon icon (Moon)
- **AND** no duplicate indicators appear on individual timeline items

#### Scenario: Snack category display
- **WHEN** user views cooking schedule for a day with snack items
- **THEN** the snack category header displays a single colored dot (rose/red) paired with a snack icon (Cookie)
- **AND** no duplicate indicators appear on individual timeline items

### Requirement: Modern Lucide icon system
The system SHALL use Lucide React icons consistently across all meal planning views instead of Material Design strings.

#### Scenario: Tab navigation icons
- **WHEN** user views meal plan tabs (Tagesplan, Tabelle, Kochplan, Nährwerte, Kosten, Einkaufsliste, Vorschläge)
- **THEN** each tab displays a clear Lucide icon (Calendar, Grid3X3, ChefHat, Scale, DollarSign, ShoppingCart, Lightbulb)
- **AND** icons are consistent in style, size, and weight

#### Scenario: Icon configuration
- **WHEN** frontend initializes meal plan components
- **THEN** all MEAL_TYPE_ICONS are sourced from lucide-react library
- **AND** no Material Design icon strings (`'bakery_dining'`, `'restaurant'`, etc.) are used

### Requirement: Clean timeline visualization
The system SHALL remove visual clutter from cooking schedule timeline items.

#### Scenario: Timeline structure
- **WHEN** user views a timeline item (recipe in cooking schedule)
- **THEN** the item displays time, title, duration, category badge but NO colored dot
- **AND** the vertical connection line between items is removed
- **AND** category information is inferred from the meal category header above

#### Scenario: Timeline responsiveness
- **WHEN** user views timeline on mobile (≤640px) or desktop
- **THEN** timeline layout adapts responsively without redundant indicators

### Requirement: Subtle interaction design
The system SHALL provide refined hover and interaction feedback without distracting animations.

#### Scenario: Category header hover
- **WHEN** user hovers over a meal category header
- **THEN** the category background applies a subtle light tint (5-10% opacity increase)
- **AND** the icon scales slightly (105% scale over 150ms transition)

#### Scenario: Button icon-only display
- **WHEN** user views Share or Settings buttons in meal plan header
- **THEN** buttons display only the icon without text label
- **AND** icon size is consistent with tab navigation icons

### Requirement: Accessibility compliance
The system SHALL ensure all visual changes maintain WCAG 2.1 AA compliance.

#### Scenario: Icon ARIA labels
- **WHEN** user with screen reader opens cooking schedule
- **THEN** each icon has an `aria-label` attribute (e.g., "Calendar", "Kochplan", "Breakfast")
- **AND** fallback text is provided for non-icon users

#### Scenario: Color contrast
- **WHEN** meal category colors are displayed
- **THEN** contrast ratio between category color and text meets WCAG AA standards (≥4.5:1 for normal text)

#### Scenario: Responsive icons
- **WHEN** user resizes viewport between mobile and desktop
- **THEN** icons remain visible and interactive at all sizes
- **AND** touch targets maintain minimum 44×44px on mobile
