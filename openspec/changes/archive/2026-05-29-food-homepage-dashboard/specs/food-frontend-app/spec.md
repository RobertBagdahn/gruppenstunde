## MODIFIED Requirements

### Requirement: Navigation menu links
The navigation SHALL link "Essensplan" directly to `/meal-plans/app` instead of `/meal-plans`. The mobile bottom navigation "Start" button SHALL navigate to `/` which displays the homepage (not redirect to `/recipes`).

#### Scenario: Desktop nav Essensplan click
- **WHEN** a user clicks "Essensplan" in the desktop navigation
- **THEN** the user is navigated to `/meal-plans/app`

#### Scenario: Mobile bottom nav Start click
- **WHEN** a user taps "Start" in the mobile bottom navigation
- **THEN** the user is navigated to `/` which shows the homepage

#### Scenario: Norm-Portion-Simulator accessible from meal plan area
- **WHEN** user is on the meal plans list page (`/meal-plans/app`)
- **THEN** there is a visible link to the Norm-Portion-Simulator (`/tools/norm-portion-simulator`)
