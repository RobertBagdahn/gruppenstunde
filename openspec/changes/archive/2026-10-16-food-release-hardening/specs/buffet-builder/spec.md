## ADDED Requirements

### Requirement: Buffet actions open a functioning builder
Every supported Buffet action in the Food planning UI SHALL open the same builder for the selected meal. The builder SHALL load the applicable template and catalog, expose loading, empty, and error states, and preserve the selected meal context. A failed template or catalog read SHALL be visible and retryable.

#### Scenario: Open buffet builder from a meal action
- **WHEN** an editor activates a Buffet action for a meal type other than `drinks`
- **THEN** the buffet builder SHALL open for that meal
- **THEN** its required template and catalog requests SHALL be made or satisfied from valid query cache data
- **THEN** the user SHALL be able to choose items and preview the selection

#### Scenario: Buffet catalog request fails
- **WHEN** loading templates or the catalog fails
- **THEN** the builder SHALL show a German error message and a retry control
- **THEN** it SHALL NOT appear as a silently empty or non-responsive dialog

### Requirement: Buffet save failures preserve recoverable user state
The buffet builder SHALL close only after a successful save. On a failed save it MUST preserve the template, selected items, and role amounts, show a German API error, and allow an explicit retry.

#### Scenario: Buffet save succeeds
- **WHEN** the user saves a valid buffet selection
- **THEN** the builder SHALL submit the selection once
- **THEN** the meal SHALL show the saved buffet items after authoritative state refresh

#### Scenario: Buffet save returns an error
- **WHEN** the buffet save endpoint returns an error, including HTTP 5xx
- **THEN** the builder SHALL remain open with all user selections intact
- **THEN** the user SHALL see the status-aware error feedback and SHALL be able to retry explicitly

### Requirement: Buffet preview failures are visible and retryable
A failed live preview SHALL NOT make the builder appear unresponsive or discard the current selection. The user SHALL see a safe German error with the HTTP status and a control to retry the current preview.

#### Scenario: Live preview returns HTTP 500
- **WHEN** the preview endpoint returns HTTP 500 for the current buffet selection
- **THEN** the selected template, items, and role amounts SHALL remain unchanged
- **THEN** the builder SHALL show the server error and SHALL retry the same preview only after the user requests it
