## MODIFIED Requirements

### Requirement: PackingList visibility field
Each PackingList SHALL have a `visibility` field with values `private` or `link_only` (default: `link_only`). The visibility field SHALL control read access to the packing list. Additionally, PackingList SHALL store optional context fields from the wizard.

#### Scenario: API access respects visibility
- **WHEN** a `GET /api/packing-lists/{id}/` request is made for a `private` list
- **THEN** the system SHALL return 404 for unauthenticated users and non-authorized authenticated users
- **THEN** the system SHALL return the list for owner, group admins, and staff

#### Scenario: Template visibility override
- **WHEN** a packing list has `is_template=True`
- **THEN** the list SHALL be publicly accessible regardless of `visibility`

#### Scenario: Context fields stored on PackingList
- **WHEN** a PackingList is created via `POST /api/packing-lists/generate/`
- **THEN** the system SHALL store the context as four nullable fields: `activity_type`, `duration`, `season`, `age_group`
- **THEN** these fields SHALL be included in the `PackingListOut` response schema

#### Scenario: Context fields are optional
- **WHEN** a PackingList is created via `POST /api/packing-lists/` (without wizard)
- **THEN** the context fields SHALL be null
- **THEN** the PackingList SHALL function normally without context

#### Scenario: Context fields in API response
- **WHEN** a PackingList with context is fetched via `GET /api/packing-lists/{id}/`
- **THEN** the response SHALL include `activity_type`, `duration`, `season`, `age_group` fields (nullable strings)

### Requirement: PackingItem "do not bring" field
PackingItem SHALL support an `is_do_not_bring` boolean field (default: `False`). Items with this flag SHALL be treated as prohibition items that are not checkable.

#### Scenario: API output includes do_not_bring
- **WHEN** a PackingItem is serialized via `PackingItemOut`
- **THEN** the `is_do_not_bring` field SHALL be included in the response

#### Scenario: Creating item with do_not_bring flag
- **WHEN** a PackingItem is created via `POST` with `is_do_not_bring=True`
- **THEN** the item SHALL be persisted with `is_do_not_bring=True`

### Requirement: PackingItem optional Supply reference
PackingItem SHALL optionally reference a Material or standalone Ingredient via a ContentType-based FK. When linked, the item SHALL inherit name, description, and price from the referenced model.

#### Scenario: Packing item linked to Material
- **WHEN** a PackingItem references a Material
- **THEN** the item name SHALL default to the Material name
- **THEN** a link to the Material detail page SHALL be displayed
- **THEN** the Material's price and purchase links SHALL be accessible from the item

#### Scenario: Packing item linked to Ingredient
- **WHEN** a PackingItem references an Ingredient
- **THEN** the item name SHALL default to the Ingredient name
- **THEN** a link to the Ingredient detail page SHALL be displayed

#### Scenario: Packing item without Supply link
- **WHEN** a PackingItem has no Supply reference (content_type=null)
- **THEN** the item SHALL behave as a plain text item (current behavior preserved)

### Requirement: Supply search in packing list
When adding items to a packing list, the system SHALL provide a search that queries the Supply database (Materials and Ingredients).

#### Scenario: Searching for supply in packing list
- **WHEN** a user adds an item and types in the item name field
- **THEN** the system SHALL show autocomplete suggestions from the Supply database
- **THEN** selecting a suggestion SHALL link the PackingItem to the Supply entry
- **THEN** not selecting a suggestion SHALL create a plain text item

---

## Do-Not-Bring Items

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

---

## Item Detail View

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

---

## Autocomplete

### Requirement: Autocomplete dropdown in item input
The system SHALL display an autocomplete dropdown when the user types in the "Gegenstand hinzufügen" input field within a packing list category.

#### Scenario: Typing triggers autocomplete
- **WHEN** the user types at least 2 characters in the item input field
- **THEN** the system SHALL display a dropdown with matching items from the Unified Catalog
- **THEN** matching SHALL be case-insensitive against item name and tags
- **THEN** the dropdown SHALL show a maximum of 8 matches

#### Scenario: Match display format
- **WHEN** autocomplete matches are displayed
- **THEN** each match SHALL show: item name, quantity hint (if available)
- **THEN** items already in the current packing list SHALL be shown as disabled with "(bereits vorhanden)" label

#### Scenario: Selecting an autocomplete match
- **WHEN** the user clicks or selects a match from the dropdown
- **THEN** the item SHALL be created in the current category
- **THEN** the quantity SHALL be pre-filled from the catalog's quantity hint
- **THEN** the description SHALL be pre-filled from the catalog's description
- **THEN** the input field SHALL be cleared for the next entry

#### Scenario: Creating a custom item
- **WHEN** the user types a name that has no exact match and presses Enter
- **THEN** the item SHALL be created as a plain text item (current behavior preserved)
- **THEN** the dropdown SHALL show a "als neuen Gegenstand anlegen" option at the bottom

#### Scenario: Dismissing autocomplete
- **WHEN** the user presses Escape or clicks outside the dropdown
- **THEN** the dropdown SHALL close without adding an item

#### Scenario: Keyboard navigation
- **WHEN** the autocomplete dropdown is open
- **THEN** the user SHALL be able to navigate matches with Arrow Up/Down keys
- **THEN** pressing Enter SHALL select the highlighted match
- **THEN** pressing Enter with no match highlighted SHALL create a custom item

### Requirement: Client-side catalog loading for autocomplete
The full Unified Catalog SHALL be loaded client-side for instant autocomplete filtering.

#### Scenario: Catalog loaded on detail page mount
- **WHEN** the PackingListDetailPage mounts
- **THEN** the system SHALL fetch the full catalog via `GET /api/packing-lists/catalog/`
- **THEN** the catalog SHALL be cached with TanStack Query (staleTime: 1 hour)

#### Scenario: Catalog response format
- **WHEN** the catalog endpoint is called
- **THEN** the response SHALL contain all items as a flat array: `{ items: [{ name, quantity, description, category, tags }] }`
- **THEN** the response SHALL NOT include `is_do_not_bring` items (those are added intentionally, not via autocomplete)

### Requirement: Full catalog API endpoint
The system SHALL provide a `GET /api/packing-lists/catalog/` endpoint returning all items from the Unified Catalog.

#### Scenario: Fetching the full catalog
- **WHEN** a user sends `GET /api/packing-lists/catalog/`
- **THEN** the system SHALL return all catalog items grouped or as a flat list
- **THEN** this endpoint SHALL NOT require authentication (catalog data is not sensitive)

---

## Sharing

### Requirement: Packing list visibility control
Each PackingList SHALL have a `visibility` field controlling who can view the list. The system SHALL support `private` and `link_only` visibility modes.

#### Scenario: Creating a packing list with default visibility
- **WHEN** a user creates a new packing list without specifying visibility
- **THEN** the list SHALL be created with `visibility="link_only"`

#### Scenario: Private packing list access
- **WHEN** a packing list has `visibility="private"`
- **THEN** only the owner, group admins, and staff SHALL be able to view the list via `GET /api/packing-lists/{id}/`
- **THEN** unauthenticated users or non-authorized users SHALL receive a 404 response

#### Scenario: Link-only packing list access
- **WHEN** a packing list has `visibility="link_only"`
- **THEN** anyone with the URL SHALL be able to view the list (read-only)
- **THEN** this SHALL match the current behavior

#### Scenario: Template visibility override
- **WHEN** a packing list has `is_template=True`
- **THEN** the list SHALL always be publicly accessible regardless of `visibility` setting

#### Scenario: Changing visibility
- **WHEN** a user with edit permission updates the `visibility` field via PATCH
- **THEN** the visibility change SHALL take effect immediately
- **THEN** existing share links SHALL continue to work regardless of visibility setting

#### Scenario: Visibility in list view
- **WHEN** a user views their packing lists on the list page
- **THEN** each list card SHALL display the current visibility mode (icon or label)
- **THEN** a toggle or dropdown SHALL allow changing visibility inline

### Requirement: Share links with unique check state
The system SHALL support creating share links for packing lists. Each share link SHALL have a UUID token and its own independent check state per item.

#### Scenario: Creating a share link
- **WHEN** a user with edit permission creates a share link via `POST /api/packing-lists/{id}/shares/`
- **THEN** the system SHALL generate a unique UUID token
- **THEN** the share link URL SHALL be `/packing-lists/shared/{token}`
- **THEN** the user MAY provide a label (e.g., "Für Max") for the share link

#### Scenario: Listing share links
- **WHEN** a user with edit permission requests `GET /api/packing-lists/{id}/shares/`
- **THEN** the system SHALL return all active share links for this packing list
- **THEN** each share link SHALL include token, label, created_at, and is_active

#### Scenario: Deactivating a share link
- **WHEN** a user with edit permission sends `DELETE /api/packing-lists/{id}/shares/{share_id}/`
- **THEN** the share link SHALL be marked as `is_active=False`
- **THEN** the share link SHALL no longer be accessible to visitors

#### Scenario: Viewing a packing list via share link
- **WHEN** a visitor opens `/packing-lists/shared/{token}`
- **THEN** the system SHALL load the packing list via `GET /api/packing-lists/shared/{token}/`
- **THEN** the list SHALL be displayed in a simplified read-only view
- **THEN** "Nicht mitbringen" items SHALL be visible but not checkable
- **THEN** no login SHALL be required

#### Scenario: Checking items on a share link
- **WHEN** a visitor checks/unchecks an item on a share link page
- **THEN** the system SHALL persist the check state via `PATCH /api/packing-lists/shared/{token}/checks/`
- **THEN** the check state SHALL be stored in `PackingListShareCheck` (per share, per item)
- **THEN** the original `PackingItem.is_checked` SHALL NOT be modified

#### Scenario: Share link progress
- **WHEN** a visitor views a packing list via share link
- **THEN** the progress bar SHALL reflect the share-specific check state
- **THEN** "Nicht mitbringen" items SHALL NOT count toward progress

#### Scenario: Accessing inactive share link
- **WHEN** a visitor tries to access a share link with `is_active=False`
- **THEN** the system SHALL return a 404 response
- **THEN** the frontend SHALL display a "Dieser Link ist nicht mehr gültig" message

#### Scenario: Share link with newly added items
- **WHEN** the owner adds new items to a packing list after a share link was created
- **THEN** the new items SHALL appear in the share link view
- **THEN** the new items SHALL have `is_checked=False` in the share-specific state (no PackingListShareCheck row exists yet)

#### Scenario: Share link management UI
- **WHEN** a user with edit permission views a packing list detail page
- **THEN** a "Teilen" section SHALL display existing share links
- **THEN** each share link SHALL show its label, a copy-link button, and a deactivate button
- **THEN** a "Neuen Link erstellen" button SHALL allow creating additional share links
