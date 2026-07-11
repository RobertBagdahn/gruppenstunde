## ADDED Requirements

### Requirement: Page numbering in footer

The print view SHALL display page numbers in the footer to help users track multi-page documents.

#### Scenario: Single page
- **WHEN** meal plan fits on single page
- **THEN** footer shows "Seite 1 von 1" or "Page 1 of 1"

#### Scenario: Multi-page document
- **WHEN** meal plan spans multiple pages (e.g., 4 pages)
- **THEN** footer shows page number on each page (e.g., "Seite 1 von 4", "Seite 2 von 4", etc.)

### Requirement: Document metadata in footer

Footer SHALL include document reference information for traceability.

#### Scenario: Footer content
- **WHEN** printing meal plan
- **THEN** footer displays:
  - Document name or plan name (on left or left side)
  - Page numbering (on right or right side)
  - URL or reference link (e.g., "inspi.gruppenstunde.de/meal-plans/8")

#### Scenario: Footer formatting
- **WHEN** viewing footer in print
- **THEN** footer is:
  - Consistently positioned on every page
  - Smaller font than body (e.g., 8–10pt)
  - Light grey text color (#666 or similar)

### Requirement: Footer visibility in print

Footer content SHALL be visible and clear when document is printed.

#### Scenario: Print footer visibility
- **WHEN** user prints meal plan via browser print (Ctrl+P / Cmd+P)
- **THEN** footer appears on printed pages
- **AND** footer is within printable area (respects margins)

#### Scenario: Footer styling
- **WHEN** footer renders
- **THEN** styling includes:
  - border-top (light grey separator, 0.5pt)
  - padding at top (0.5rem)
  - Sufficient spacing from main content

### Requirement: No footer on non-print views

Footer styling SHALL only apply to print context, not to screen view.

#### Scenario: Screen view
- **WHEN** user views page in browser (not printing)
- **THEN** footer may display different styling or be hidden
- **AND** no print-specific footer elements show in screen view

#### Scenario: Print-only footer
- **WHEN** user prints page
- **THEN** @page CSS rules or print media query applies footer styling
- **AND** footer is visible and properly formatted in printed output
