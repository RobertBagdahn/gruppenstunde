## ADDED Requirements

### Requirement: "Nicht mitbringen" flag on PackingItem
The system SHALL support marking individual packing items as "do not bring" items. A `PackingItem` with `is_do_not_bring=True` represents something participants SHALL NOT bring to the event.

#### Scenario: Creating a "do not bring" item
- **WHEN** a user creates a new PackingItem with `is_do_not_bring=True`
- **THEN** the item SHALL be persisted with the `is_do_not_bring` flag set to `True`
- **THEN** the item SHALL appear in the same category as regular items

#### Scenario: Displaying "do not bring" items
- **WHEN** a PackingItem has `is_do_not_bring=True`
- **THEN** the item name SHALL be displayed with a strikethrough style
- **THEN** a prohibition icon (ban/slash icon) SHALL be displayed next to the item
- **THEN** the item SHALL be visually distinguished from regular items (red/warning color scheme)

#### Scenario: Checkbox behavior for "do not bring" items
- **WHEN** a PackingItem has `is_do_not_bring=True`
- **THEN** the checkbox SHALL NOT be displayed
- **THEN** the `is_checked` field SHALL be ignored for this item
- **THEN** the item SHALL NOT count toward the progress bar percentage

#### Scenario: Toggling "do not bring" status
- **WHEN** a user with edit permission toggles the `is_do_not_bring` flag on an existing item
- **THEN** the item SHALL immediately update its visual representation
- **THEN** the progress bar SHALL recalculate excluding/including this item

#### Scenario: "Do not bring" items in text export
- **WHEN** a packing list is exported as text and contains `is_do_not_bring` items
- **THEN** the export SHALL include a separate "Nicht mitbringen" section
- **THEN** items in this section SHALL be prefixed with "❌" instead of a checkbox

#### Scenario: "Do not bring" items in clone
- **WHEN** a packing list containing `is_do_not_bring` items is cloned
- **THEN** the cloned list SHALL preserve the `is_do_not_bring` flag on all items
