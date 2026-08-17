## ADDED Requirements

### Requirement: Scroll to top on route change
The application SHALL reset the scroll position to the top of the page when the user navigates to a new route (pathname change). This MUST apply to all routes without exception.

#### Scenario: Navigate from list page to detail page
- **WHEN** a user scrolls down on a list page and clicks a link to a detail page
- **THEN** the detail page SHALL be displayed starting from the top (scroll position 0, 0)

#### Scenario: Navigate back to list page
- **WHEN** a user navigates from a detail page back to a list page via a link
- **THEN** the list page SHALL be displayed starting from the top

#### Scenario: Query parameter change does not reset scroll
- **WHEN** a user changes filter or pagination parameters (URL search params) without changing the pathname
- **THEN** the scroll position SHALL NOT be reset

#### Scenario: Hash fragment change does not reset scroll
- **WHEN** a user clicks an in-page anchor link (hash change only)
- **THEN** the scroll-to-top behavior SHALL NOT be triggered
