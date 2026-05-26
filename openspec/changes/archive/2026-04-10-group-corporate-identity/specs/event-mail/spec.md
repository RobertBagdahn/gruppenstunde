## MODIFIED Requirements

### Requirement: Send manual email to participants
The system SHALL send manual emails from event organizers as HTML emails using the CI-branded email template instead of plain text. The `MailService.send_mail()` method SHALL resolve the event's group CI, render the `event_mail.html` template with CI data and placeholder-resolved content, and send both HTML and plain-text versions via `django.core.mail.send_mail(html_message=...)`.

#### Scenario: Send manual email with group CI
- **WHEN** an organizer sends a manual email for an event that has an invited group with CI
- **THEN** the email SHALL be sent as HTML with the group's logo, colors, and footer, plus a plain-text fallback

#### Scenario: Send manual email without group CI
- **WHEN** an organizer sends a manual email for an event without group CI
- **THEN** the email SHALL be sent as HTML with default Inspi styling and a plain-text fallback

#### Scenario: Placeholders resolved before template rendering
- **WHEN** the email body contains placeholders like `{vorname}`, `{event_name}`
- **THEN** the system SHALL resolve all placeholders first, then render the result into the HTML template

#### Scenario: Reply-to header preserved
- **WHEN** the event has responsible persons configured
- **THEN** the email SHALL include the first responsible person's email as reply-to (existing behavior preserved)

#### Scenario: Timeline logging preserved
- **WHEN** an email is sent successfully
- **THEN** the system SHALL log a `MAIL_SENT` timeline entry (existing behavior preserved)

### Requirement: Send registration confirmation
The system SHALL send registration confirmation emails as HTML emails using the CI-branded registration confirmation template. The `MailService.send_registration_confirmation()` method SHALL resolve the event's group CI and render the `registration_confirmation.html` template.

#### Scenario: Confirmation with CI and payment info
- **WHEN** a user registers for an event with a group CI that has `payment_info`
- **THEN** the confirmation email SHALL include a "Zahlungsinformationen" section with the payment details from the CI

#### Scenario: Confirmation without CI
- **WHEN** a user registers for an event without group CI
- **THEN** the confirmation email SHALL use default Inspi styling with "Viele Grüße, Das Team von {event_name}" as signature
