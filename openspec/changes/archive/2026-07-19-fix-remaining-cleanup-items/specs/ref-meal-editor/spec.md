## MODIFIED Requirements

### Requirement: RefMealEditorPage uses shadcn Card components
The `RefMealEditorPage` SHALL use shadcn/ui `Card` and `CardContent` components instead of raw `<div>` elements with `border rounded-lg` classes.

#### Scenario: Content sections render as Cards
- **WHEN** the RefMealEditorPage renders ingredient groups or summary sections
- **THEN** each section SHALL be wrapped in `<Card><CardContent>...</CardContent></Card>`

#### Scenario: Page wrapper uses max-w-7xl
- **WHEN** the RefMealEditorPage renders its main container
- **THEN** the wrapper SHALL use `max-w-7xl mx-auto px-4 py-6` instead of `container mx-auto px-4 py-6`

### Requirement: RefMealEditorPage constants are module-level
The `CATEGORY_LABELS` map and `getItemCategory` function in `RefMealEditorPage` SHALL be defined at module level (outside the component) to avoid re-allocation on every render.

#### Scenario: Constants available at module scope
- **WHEN** the module is imported
- **THEN** `CATEGORY_LABELS` and `getItemCategory` SHALL already be defined and immutable
