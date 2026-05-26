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
