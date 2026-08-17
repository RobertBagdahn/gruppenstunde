## ADDED Requirements

### Requirement: Admin can review pending recipes
The Food-Frontend admin area SHALL provide an "Freigaben" tab where staff users can review, approve, or reject pending recipes.

#### Scenario: Staff views pending recipes
- **WHEN** a staff user navigates to `/admin` and selects the "Freigaben" tab
- **THEN** the system displays a paginated list of recipes with status "pending_review"

#### Scenario: Staff approves a recipe
- **WHEN** a staff user clicks "Freigeben" on a pending recipe
- **THEN** the recipe status changes to "published" and it becomes visible to all users

#### Scenario: Staff rejects a recipe
- **WHEN** a staff user clicks "Ablehnen" on a pending recipe and provides a reason
- **THEN** the recipe status changes to "rejected" and the author is notified

#### Scenario: Non-staff cannot access approval queue
- **WHEN** a non-staff user navigates to the admin area
- **THEN** the system denies access (StaffGuard redirects to home)
