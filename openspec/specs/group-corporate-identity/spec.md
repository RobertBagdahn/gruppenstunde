## ADDED Requirements

### Requirement: Group Corporate Identity data model
The system SHALL provide a `GroupCorporateIdentity` model as a OneToOneField on `UserGroup` that stores all CI-related data. The model SHALL include: `primary_color` (hex, default `#4a3a6b`), `secondary_color` (hex, default `#e8e4f0`), `logo` (ImageField, max 500KB), `slogan` (max 200 chars), `greeting_text` (TextField), `footer_text` (TextField), `payment_info` (TextField), `signature_text` (TextField).

#### Scenario: Group has no CI configured
- **WHEN** a group has no `GroupCorporateIdentity` record
- **THEN** the system SHALL use default Inspi styling (primary: `#4a3a6b`, secondary: `#e8e4f0`, no logo, empty text fields)

#### Scenario: Group has CI configured
- **WHEN** a group has a `GroupCorporateIdentity` record with custom values
- **THEN** the system SHALL use those values in all CI-aware features (emails, PDFs, registration pages)

#### Scenario: Color validation
- **WHEN** a user submits a color value that is not a valid 7-character hex color (e.g. `#abc` or `red`)
- **THEN** the system SHALL reject the input with a validation error

#### Scenario: Logo upload size validation
- **WHEN** a user uploads a logo exceeding 500KB
- **THEN** the system SHALL reject the upload with the message "Logo darf maximal 500KB groß sein"

### Requirement: CI CRUD API endpoints
The system SHALL expose API endpoints for managing a group's corporate identity. Only group admins SHALL be authorized to create, update, or delete CI data.

#### Scenario: Get CI for a group
- **WHEN** an authenticated user sends `GET /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return the CI data (or defaults if none configured) with status 200

#### Scenario: Create CI for a group as admin
- **WHEN** a group admin sends `PUT /api/groups/{slug}/corporate-identity/` with valid CI data
- **THEN** the system SHALL create or update the CI record and return status 200

#### Scenario: Update CI as non-admin
- **WHEN** a non-admin group member sends `PUT /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return status 403

#### Scenario: Upload logo
- **WHEN** a group admin sends `POST /api/groups/{slug}/corporate-identity/logo/` with an image file
- **THEN** the system SHALL store the logo via GCS and return the logo URL

#### Scenario: Delete logo
- **WHEN** a group admin sends `DELETE /api/groups/{slug}/corporate-identity/logo/`
- **THEN** the system SHALL remove the logo from the CI record

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user sends `GET /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return status 403

### Requirement: CI management frontend page
The system SHALL provide a frontend page at `/groups/{slug}/settings/corporate-identity` for managing the group's CI. The page SHALL be accessible only to group admins.

#### Scenario: Admin opens CI settings
- **WHEN** a group admin navigates to `/groups/{slug}/settings/corporate-identity`
- **THEN** the system SHALL display a form with color pickers (primary/secondary), logo upload, and text fields (slogan, greeting, footer, payment info, signature)

#### Scenario: Live preview
- **WHEN** the admin changes any CI field in the form
- **THEN** the system SHALL display a live preview showing how the CI will look in emails and PDFs

#### Scenario: Save CI settings
- **WHEN** the admin fills in the form and clicks "Speichern"
- **THEN** the system SHALL save the CI data via the API and show a success toast "Corporate Identity gespeichert"

#### Scenario: Non-admin access
- **WHEN** a non-admin member navigates to `/groups/{slug}/settings/corporate-identity`
- **THEN** the system SHALL redirect to the group detail page or show an unauthorized message

#### Scenario: Mobile responsiveness
- **WHEN** the admin opens the CI settings on a mobile device (320px minimum)
- **THEN** the system SHALL display the form in a single-column layout with the preview below the form

### Requirement: CI helper function for event context
The system SHALL provide a helper function `get_event_ci(event)` that resolves the corporate identity for an event. The function SHALL return the CI of the first invited group that has a CI configured, or default Inspi styling if no group has CI.

#### Scenario: Event with one invited group that has CI
- **WHEN** an event has one invited group with a configured CI
- **THEN** `get_event_ci(event)` SHALL return that group's CI data

#### Scenario: Event with no invited groups
- **WHEN** an event has no invited groups
- **THEN** `get_event_ci(event)` SHALL return default Inspi styling

#### Scenario: Event with multiple invited groups
- **WHEN** an event has multiple invited groups
- **THEN** `get_event_ci(event)` SHALL return the CI of the first group (by name, alphabetically) that has a CI configured


---

# CI Email Templates

## ADDED Requirements

### Requirement: HTML email base template with CI styling
The system SHALL provide an HTML email base template at `backend/event/templates/event/email/base.html` that renders CI-branded emails. The template SHALL use inline CSS and table-based layout for maximum email client compatibility. The template SHALL include a header with the group's logo and primary color, a content block, and a footer with the group's footer text.

#### Scenario: Email with group CI
- **WHEN** an email is rendered using the base template with a group's CI data
- **THEN** the email SHALL display the group's logo in the header, use `primary_color` as the header background, use `secondary_color` for accents, and show `footer_text` in the footer

#### Scenario: Email without group CI
- **WHEN** an email is rendered using the base template without CI data (defaults)
- **THEN** the email SHALL use the default Inspi colors and "gruppenstunde.de" as the footer text

#### Scenario: Plain-text fallback
- **WHEN** an email recipient's client does not support HTML
- **THEN** the email SHALL include a plain-text version with the same content (without styling)

### Requirement: Event mail template
The system SHALL provide an HTML template `backend/event/templates/event/email/event_mail.html` that extends the base template. This template SHALL be used for manual event emails sent by organizers via `MailService.send_mail()`.

#### Scenario: Manual mail with CI
- **WHEN** an organizer sends a manual email to event participants
- **THEN** the email SHALL be rendered as HTML with the event's group CI, including the organizer's subject and body text with placeholders resolved

#### Scenario: Placeholder resolution in HTML
- **WHEN** the email body contains placeholders like `{vorname}`, `{event_name}`
- **THEN** the system SHALL resolve all placeholders before rendering the HTML template

### Requirement: Registration confirmation template
The system SHALL provide an HTML template `backend/event/templates/event/email/registration_confirmation.html` that extends the base template. This template SHALL be used for automatic confirmation emails after event registration.

#### Scenario: Confirmation email with CI
- **WHEN** a user registers for an event that has a group with CI
- **THEN** the confirmation email SHALL be rendered as HTML with the group's CI, including participant list, event date/location, and payment info from CI

#### Scenario: Payment info in confirmation
- **WHEN** the group's CI has `payment_info` configured
- **THEN** the confirmation email SHALL include a "Zahlungsinformationen" section with the payment details

### Requirement: Invitation email template
The system SHALL provide an HTML template `backend/event/templates/event/email/invitation.html` that extends the base template. This template SHALL be used when sending event invitations via email.

#### Scenario: Invitation email rendering
- **WHEN** an organizer sends an invitation email for an event
- **THEN** the email SHALL include the event name, date, location, invitation text, and booking options, all styled with the group's CI

#### Scenario: Invitation with greeting text
- **WHEN** the group's CI has `greeting_text` configured
- **THEN** the invitation email SHALL start with the greeting text before the event details


---

# CI Invitation PDF

## ADDED Requirements

### Requirement: Invitation PDF generation
The system SHALL provide a service `InvitationPdfService` in `backend/event/services/invitation_pdf.py` that generates a branded A4 portrait PDF for event invitations using ReportLab. The PDF SHALL include the group's CI (logo, colors, text blocks).

#### Scenario: Generate invitation PDF with full CI
- **WHEN** an organizer requests an invitation PDF for an event with a group that has full CI
- **THEN** the PDF SHALL contain:
  - Header: group logo (left), group name + slogan (right), horizontal line in `primary_color`
  - Body: event name as title, date/time, location, invitation text (from `event.invitation_text`)
  - Optional: packing list items (if event has linked packing list)
  - Optional: booking options with prices
  - Footer: `footer_text`, `payment_info`, `signature_text`

#### Scenario: Generate invitation PDF without CI
- **WHEN** an organizer requests an invitation PDF for an event without group CI
- **THEN** the PDF SHALL use default Inspi styling with "gruppenstunde.de" branding

#### Scenario: Invitation text with markdown
- **WHEN** the event's `invitation_text` contains markdown formatting
- **THEN** the PDF SHALL render basic markdown (bold, italic, lists, headings) as formatted text

### Requirement: Invitation PDF download endpoint
The system SHALL expose `GET /api/events/{slug}/invitation-pdf/` that returns the generated PDF as a file download. Only event managers SHALL be authorized.

#### Scenario: Download invitation PDF as manager
- **WHEN** an event manager sends `GET /api/events/{slug}/invitation-pdf/`
- **THEN** the system SHALL return the PDF with content-type `application/pdf` and filename `einladung-{event_slug}.pdf`

#### Scenario: Download as non-manager
- **WHEN** a non-manager sends `GET /api/events/{slug}/invitation-pdf/`
- **THEN** the system SHALL return status 403

#### Scenario: Download for event without invitation text
- **WHEN** a manager requests the PDF for an event with no `invitation_text`
- **THEN** the system SHALL return status 400 with message "Kein Einladungstext vorhanden"

### Requirement: Send invitation PDF via email
The system SHALL expose `POST /api/events/{slug}/send-invitation/` that generates the invitation PDF and sends it as an email attachment to specified recipients. Only event managers SHALL be authorized.

#### Scenario: Send invitation to invited groups
- **WHEN** an event manager sends `POST /api/events/{slug}/send-invitation/` with `{"recipient_type": "groups"}`
- **THEN** the system SHALL generate the invitation PDF and send it as attachment to all members of all invited groups who have an email address

#### Scenario: Send invitation to specific users
- **WHEN** an event manager sends `POST /api/events/{slug}/send-invitation/` with `{"recipient_type": "selected", "user_ids": [1, 2, 3]}`
- **THEN** the system SHALL send the invitation PDF to the specified users

#### Scenario: Send invitation with custom subject
- **WHEN** the request includes a `subject` field
- **THEN** the system SHALL use that as the email subject instead of the default "Einladung: {event_name}"

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated user sends `POST /api/events/{slug}/send-invitation/`
- **THEN** the system SHALL return status 403
