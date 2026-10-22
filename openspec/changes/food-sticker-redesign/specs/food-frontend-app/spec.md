# Spec Delta

## REMOVED Requirements

### Requirement: Food app has own navigation layout
**Reason**: Die Navigation wechselt von fünf Bereichen im Kopfband und vier Punkten unten (Start, Rezepte, Essensplan, Einkaufen) auf vier gleiche Hauptpunkte in beiden Leisten; „Start“ ist das Logo, Material wandert unter Zutaten.
**Migration**: Siehe die neue Requirement „Food app has four main navigation items“ und die Requirements der Capability `food-page-shell`.

## ADDED Requirements

### Requirement: Food app has four main navigation items
The Food-App SHALL have its own Layout component with navigation containing only food-relevant menu items: Rezepte, Pläne, Einkauf and Zutaten. "Pläne" SHALL link to `/meal-plans/app`, "Einkauf" to `/shopping-lists` and "Zutaten" to `/ingredients`. The logo SHALL navigate to `/`; there is no separate "Start" item. The items SHALL appear as a bar at the top from 768 px and as a bottom bar on smaller viewports.

#### Scenario: Navigation shows food items only
- **WHEN** user views the Food-App navigation
- **THEN** only Rezepte, Pläne, Einkauf, and Zutaten are shown as menu items

#### Scenario: No cross-domain navigation
- **WHEN** user views the Food-App navigation
- **THEN** no links to Sessions, Blog, Games, Events, or Planner are present

#### Scenario: Desktop nav Pläne click
- **WHEN** a user clicks "Pläne" in the desktop navigation
- **THEN** the user is navigated to `/meal-plans/app`

#### Scenario: Beschriftung je Breite
- **WHEN** the viewport is 768 px or wider
- **THEN** the items read "Rezepte", "Essenspläne", "Einkaufslisten" and "Zutaten"; below 768 px they read "Rezepte", "Pläne", "Einkauf" and "Zutaten"

#### Scenario: Logo goes to the homepage
- **WHEN** a user taps the logo on any viewport
- **THEN** the user is navigated to `/` which shows the homepage

#### Scenario: Mobile bottom bar
- **WHEN** the viewport is narrower than 768 px
- **THEN** the four items appear as a bottom bar with 44 px tap targets, labelled, and page content is not covered by it

#### Scenario: Norm-Portion-Simulator accessible from meal plan area
- **WHEN** user is on the meal plans list page (`/meal-plans/app`)
- **THEN** there is a visible link to the Norm-Portion-Simulator (`/tools/norm-portion-simulator`)

### Requirement: Material under Zutaten and profile menu
Material (`/material`) SHALL be reachable as a tab inside the "Zutaten" area and keeps its own route; the "Zutaten" item stays active there. Profil, Konto, Administration (staff only) and Abmelden SHALL be reachable through a profile menu in the header.

#### Scenario: Active item is marked
- **WHEN** the current route belongs to the "Zutaten" area (including `/material`)
- **THEN** the "Zutaten" item shows the active pill and carries `aria-current="page"`

#### Scenario: Material under Zutaten
- **WHEN** a user opens `/ingredients`
- **THEN** a tab "Material" leads to `/material`

#### Scenario: Profile menu
- **WHEN** a signed-in staff user opens the profile menu
- **THEN** it offers Profil, Konto, Administration and Abmelden; for a non-staff user Administration is absent
