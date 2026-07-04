## ADDED Requirements

### Requirement: iOS Safari Zoom Prevention

The viewport meta tag in both frontends SHALL include `maximum-scale=1` to prevent iOS Safari from auto-zooming on page load.

#### Scenario: Viewport meta includes maximum-scale
- **WHEN** any page in either frontend loads on iOS Safari
- **THEN** the viewport meta tag SHALL contain `maximum-scale=1`

#### Scenario: Pinch-to-zoom still available via system accessibility
- **WHEN** a user enables Zoom via iOS Settings → Accessibility → Zoom
- **THEN** the system-level zoom SHALL still function despite `maximum-scale=1`

### Requirement: Horizontal Overflow Prevention

The CSS for both frontends SHALL prevent horizontal overflow at the document level to eliminate Safari's auto-zoom trigger.

#### Scenario: Content wider than viewport
- **WHEN** any element renders wider than the viewport (320px minimum)
- **THEN** the overflow SHALL be hidden at the document level without creating a horizontal scrollbar

#### Scenario: Known overflow sources are fixed
- **WHEN** the page renders on a 320px viewport
- **THEN** the following known overflow sources SHALL be corrected:
  - `FilterBar.tsx` SHALL NOT render `min-w-[200px]` on mobile breakpoints
  - `EventDashboardPage` tab bar SHALL scroll horizontally instead of overflowing
  - `StepCockpit.tsx` SHALL use `grid-cols-2` on mobile instead of `grid-cols-4`
  - `TableView.tsx` (food) SHALL scroll horizontally without body overflow

### Requirement: No Backend Changes

This change SHALL NOT modify any backend code, database schemas, or API endpoints.

#### Scenario: Only frontend files are modified
- **WHEN** the change is implemented
- **THEN** no files in `backend/` directory SHALL be modified
- **THEN** no Pydantic or Zod schemas SHALL be modified
