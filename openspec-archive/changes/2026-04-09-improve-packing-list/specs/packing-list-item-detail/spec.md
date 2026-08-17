## ADDED Requirements

### Requirement: Clickable items with detail view
Each PackingItem in the list SHALL be clickable, opening a detail view (Sheet/slide-over panel) with extended information about the item.

#### Scenario: Opening item detail
- **WHEN** a user clicks on a PackingItem row (anywhere except checkbox or delete button)
- **THEN** a Sheet panel SHALL slide in from the right side
- **THEN** the Sheet SHALL display the item's full details

#### Scenario: Item detail content
- **WHEN** the item detail Sheet is open
- **THEN** the Sheet SHALL display the item name as header
- **THEN** the Sheet SHALL display the quantity (if set)
- **THEN** the Sheet SHALL display the description rendered as Markdown (if set)
- **THEN** the Sheet SHALL display a "Nicht mitbringen" badge if `is_do_not_bring=True`
- **THEN** the Sheet SHALL display a link to the Supply detail page if a Supply is linked

#### Scenario: Editing from item detail (authenticated owner)
- **WHEN** a user with edit permission opens the item detail Sheet
- **THEN** all displayed fields SHALL be editable inline
- **THEN** changes SHALL be persisted via the existing PATCH endpoint
- **THEN** the "Nicht mitbringen" toggle SHALL be available as a switch

#### Scenario: Read-only item detail (non-owner)
- **WHEN** a user without edit permission opens the item detail Sheet
- **THEN** all fields SHALL be displayed as read-only text
- **THEN** no edit controls SHALL be shown

#### Scenario: Item detail on mobile
- **WHEN** a user opens the item detail on a viewport below 640px
- **THEN** the Sheet SHALL take the full width of the screen
- **THEN** a close button SHALL be prominently visible at the top

#### Scenario: Closing item detail
- **WHEN** a user clicks outside the Sheet, presses Escape, or clicks the close button
- **THEN** the Sheet SHALL close
- **THEN** the packing list SHALL remain in its current scroll position
