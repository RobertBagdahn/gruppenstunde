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
