## ADDED Requirements

### Requirement: Friendly unauthenticated state on session-planner app route
The app route `/session-planner/app` SHALL display a friendly authentication prompt when accessed by an unauthenticated user, instead of a raw API error or empty screen.

#### Scenario: Anonymous user opens session-planner app
- **WHEN** an unauthenticated user navigates to `/session-planner/app`
- **THEN** the page SHALL display a shared `<UnauthGate>` component with a short explanation ("Melde dich an, um deine Gruppenstunden zu planen.")
- **AND** a primary "Anmelden" CTA linking to the login page
- **AND** a secondary "Kostenlos registrieren" CTA linking to the registration page
- **AND** no API call that would return 403 SHALL be executed
