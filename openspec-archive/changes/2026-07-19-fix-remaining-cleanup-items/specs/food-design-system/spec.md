## MODIFIED Requirements

### Requirement: Hardcoded color classes replaced with design tokens
Food-frontend components SHALL use semantic design token classes (`text-primary`, `bg-destructive`, `hsl(var(--chart-N))`) instead of hardcoded Tailwind color classes (`text-green-600`, `bg-red-500`, hex values).

#### Scenario: Status indicator uses primary token
- **WHEN** a component displays a positive/success state
- **THEN** it SHALL use `text-primary` instead of `text-green-600`

#### Scenario: Error state uses destructive token
- **WHEN** a component displays an error/destructive state
- **THEN** it SHALL use `text-destructive` or `bg-destructive` instead of `text-red-500` / `bg-red-500`

#### Scenario: Chart colors use CSS variable tokens
- **WHEN** a chart component references a color
- **THEN** it SHALL use `hsl(var(--chart-1))` through `hsl(var(--chart-5))` instead of hex codes

### Requirement: Top-level page wrappers are standardized
All food-frontend top-level pages SHALL use the same wrapper classes: `max-w-7xl mx-auto px-4 py-6`.

#### Scenario: MyRecipesPage wrapper
- **WHEN** `MyRecipesPage` renders
- **THEN** its main container SHALL use `max-w-7xl mx-auto px-4 py-6`, not `container py-8` or `max-w-5xl`

#### Scenario: AdminPage wrapper
- **WHEN** `AdminPage` renders
- **THEN** its main container SHALL use `max-w-7xl mx-auto px-4 py-6`, not `container py-6`

#### Scenario: DataQualityPage wrapper
- **WHEN** `DataQualityPage` renders
- **THEN** its main container SHALL use `max-w-7xl mx-auto px-4 py-6`, not `container py-6`
