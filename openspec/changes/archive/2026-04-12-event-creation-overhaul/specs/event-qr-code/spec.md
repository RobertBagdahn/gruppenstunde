## ADDED Requirements

### Requirement: Client-side QR code generation
QR codes for event registration links SHALL be generated client-side using the `qrcode.react` library.

#### Scenario: QR code renders registration URL
- **WHEN** a QR code component is rendered for an event with slug `summer-camp-2026`
- **THEN** the QR code SHALL encode the URL `https://gruppenstunde.de/events/summer-camp-2026/register`
- **THEN** the QR code SHALL be rendered as an SVG element by default

#### Scenario: QR code is scannable
- **WHEN** the generated QR code is scanned with a mobile device
- **THEN** the device SHALL open the event registration page at the encoded URL

### Requirement: Printable QR code page
A standalone printable page SHALL display the event QR code with event details, accessible from the event dashboard.

#### Scenario: Access printable QR page from dashboard
- **WHEN** a manager views the event dashboard
- **THEN** a "QR-Code anzeigen" button SHALL be available (in the "Einladung & Gäste" tab or overview)
- **THEN** clicking the button SHALL open a new route or print-optimized view

#### Scenario: Printable page layout
- **WHEN** the printable QR code page is displayed
- **THEN** the page SHALL contain:
  - The event name as a heading
  - The event date range (formatted as "DD.MM.YYYY – DD.MM.YYYY")
  - The event location name (if set)
  - The QR code (minimum 200x200px)
  - The registration URL as plain text below the QR code
- **THEN** the layout SHALL be centered and optimized for A4 print

#### Scenario: Print via browser
- **WHEN** a user triggers the browser print function (Ctrl+P / Cmd+P) on the printable QR page
- **THEN** the page SHALL render cleanly without navigation, headers, or footers
- **THEN** CSS `@media print` rules SHALL hide non-essential UI elements

### Requirement: Download QR code as PNG
Users SHALL be able to download the QR code as a PNG image file.

#### Scenario: Download button
- **WHEN** a manager views the printable QR code page
- **THEN** a "Als PNG herunterladen" button SHALL be displayed
- **THEN** the button SHALL NOT appear when printing (hidden via `@media print`)

#### Scenario: PNG download execution
- **WHEN** a user clicks "Als PNG herunterladen"
- **THEN** the QR code SHALL be rendered to a canvas element and exported as a PNG file
- **THEN** the downloaded file SHALL be named `{event_slug}-qr-code.png`
- **THEN** the PNG SHALL have a resolution of at least 1024x1024 pixels for high-quality printing

### Requirement: QR code in invitation PDF
The existing invitation PDF service (`backend/event/services/invitation_pdf.py`) SHALL support embedding the event QR code.

#### Scenario: QR code included in PDF
- **WHEN** an invitation PDF is generated for an event
- **THEN** the PDF SHALL include a QR code image encoding the registration URL `https://gruppenstunde.de/events/{slug}/register`
- **THEN** the QR code SHALL be placed at the bottom of the invitation, before any footer
- **THEN** the QR code SHALL be sized at 4cm x 4cm

#### Scenario: QR code generation in backend
- **WHEN** the invitation PDF service generates a QR code
- **THEN** it SHALL use the `qrcode` Python library (server-side) to generate the QR image
- **THEN** the image SHALL be generated as an in-memory PNG and embedded via ReportLab's `Image` flowable

#### Scenario: Registration URL text below QR
- **WHEN** the QR code is embedded in the PDF
- **THEN** the text "Anmeldung: https://gruppenstunde.de/events/{slug}/register" SHALL be printed below the QR code in a smaller font size

### Requirement: QR code for events without registration URL
The QR code feature SHALL handle edge cases gracefully.

#### Scenario: Event in draft phase
- **WHEN** a manager views the QR code page for an event in draft phase
- **THEN** the QR code SHALL still be generated with the registration URL
- **THEN** a notice SHALL be displayed: "Hinweis: Dieses Event ist noch nicht veröffentlicht. Der QR-Code funktioniert erst nach Veröffentlichung."

#### Scenario: Event without start date
- **WHEN** the printable QR page is displayed for an event without a start_date
- **THEN** the date field SHALL display "Datum noch nicht festgelegt"
- **THEN** the QR code SHALL still be rendered normally
