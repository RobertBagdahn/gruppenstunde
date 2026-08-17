## ADDED Requirements

### Requirement: Consistent unauthenticated state on meal-plan app route
The app route `/meal-plans/app` SHALL use the same shared `<UnauthGate>` component as the session-planner app route for consistent UX across all planning tools.

#### Scenario: Anonymous user opens meal-plan app
- **WHEN** an unauthenticated user navigates to `/meal-plans/app`
- **THEN** the page SHALL display the shared `<UnauthGate>` component with a meal-plan-specific explanation ("Melde dich an, um deine Essenspläne zu verwalten.")
- **AND** a primary "Anmelden" CTA linking to the login page
- **AND** a secondary "Kostenlos registrieren" CTA linking to the registration page
