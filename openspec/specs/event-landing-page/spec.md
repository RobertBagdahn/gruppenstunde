## ADDED Requirements

### Requirement: Enhanced events landing page
The events landing page at `/events` SHALL showcase all event management features with visual sections, feature descriptions, and clear calls-to-action.

#### Scenario: Landing page structure
- **WHEN** a user visits `/events`
- **THEN** the page SHALL show a hero section with title, description, and CTA button
- **THEN** feature sections SHALL describe: Event-Erstellung, Teilnehmer-Verwaltung, Payment-Tracking, Statistiken, E-Mails, Exporte, Custom Fields, Labels, Timeline
- **THEN** each feature section SHALL have an icon, title, description, and optionally a screenshot/illustration

### Requirement: Walkthrough section
The landing page SHALL include a visual walkthrough showing how events work end-to-end.

#### Scenario: Step-by-step walkthrough
- **WHEN** the user scrolls to the walkthrough section
- **THEN** the page SHALL show numbered steps explaining the event workflow:
  1. Event erstellen (Name, Datum, Ort, Buchungsoptionen)
  2. Teilnehmer einladen (Gruppen oder einzelne Personen)
  3. Anmeldungen verwalten (Teilnehmerliste, Custom Fields)
  4. Zahlungen tracken (Bar, PayPal, Überweisung)
  5. Kommunizieren (Rundmails an Teilnehmer)
  6. Auswerten (Statistiken, Exporte, Timeline)

### Requirement: Interactive sandbox
The landing page SHALL include an interactive sandbox demonstrating the event management features without requiring login.

#### Scenario: Sandbox with demo event
- **WHEN** the user interacts with the sandbox section
- **THEN** a demo event with sample participants SHALL be shown
- **THEN** the user SHALL be able to explore tabs (Übersicht, Teilnehmer, Statistiken) with mock data

### Requirement: Feature links
Each feature section on the landing page SHALL link to the corresponding tab in the event dashboard.

#### Scenario: Feature to app navigation
- **WHEN** the user clicks on a feature section's CTA button
- **THEN** the user SHALL be directed to the login page or the app at `/events/app` (if logged in)

### Requirement: Responsive design
The landing page SHALL be fully responsive and optimized for mobile screens (320px minimum).

#### Scenario: Mobile layout
- **WHEN** the page is viewed on a mobile device
- **THEN** feature sections SHALL stack vertically
- **THEN** the walkthrough SHALL use a vertical timeline layout
- **THEN** all text SHALL be readable without horizontal scrolling
