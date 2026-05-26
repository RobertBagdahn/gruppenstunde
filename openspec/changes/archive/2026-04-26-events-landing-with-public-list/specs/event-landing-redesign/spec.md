## MODIFIED Requirements

### Requirement: Authenticated user dashboard layout
For authenticated users, the EventsPage SHALL display a dashboard-style layout with quick-action cards, event sections, recent activity, and statistics. The page SHALL NOT show the marketing landing page content.

For unauthenticated users, the EventsLandingPage SHALL primarily display a list of upcoming and recent **public** events (`Event.is_public=True`, not a template) as inspiration and social proof. If no public events exist, the page SHALL fall back to the marketing landing layout.

In all cases for unauthenticated users, a prominent CTA to register/login SHALL be visible.

#### Scenario: Authenticated user visits events page
- **WHEN** an authenticated user navigates to `/events`
- **THEN** the page SHALL display the dashboard layout with quick-action cards, "Meine Events", "Eingeladene Events", "Letzte Aktivitäten", and statistics sections

#### Scenario: Unauthenticated user visits events page with public events available
- **WHEN** an unauthenticated user navigates to `/events`
- **AND** at least one public, non-template event exists
- **THEN** the page SHALL display a hero section with short tool introduction
- **AND** a list of up to 12 public events (next upcoming first by `start_date`, fallback to most recent past if none upcoming)
- **AND** a prominent "Kostenlos registrieren" CTA
- **AND** each event card SHALL be clickable and navigate to the event detail page
- **AND** the page MAY still show abbreviated marketing sections (features, FAQ) below the list

#### Scenario: Unauthenticated user visits events page with no public events
- **WHEN** an unauthenticated user navigates to `/events`
- **AND** no public, non-template events exist
- **THEN** the page SHALL display the full marketing landing layout (hero, features, examples, FAQ, final CTA) as fallback

## ADDED Requirements

### Requirement: Public events landing endpoint
The backend SHALL provide a cacheable, unauthenticated endpoint `GET /api/events/public-landing/` that returns up to 12 public events optimized for the anonymous landing page.

#### Scenario: Anonymous request to public-landing endpoint
- **WHEN** any client (authenticated or not) calls `GET /api/events/public-landing/`
- **THEN** the response SHALL contain events where `is_public=True` AND `is_template=False`
- **AND** the response SHALL prefer upcoming events sorted by `start_date` ascending
- **AND** if fewer than 12 upcoming events exist, the response MAY include recent past events sorted by `start_date` descending to fill up to 12
- **AND** the response SHALL be a flat list (no pagination wrapper), max 12 items

#### Scenario: No public events
- **WHEN** the system has no public, non-template events at all
- **THEN** `GET /api/events/public-landing/` SHALL return an empty list with HTTP 200
