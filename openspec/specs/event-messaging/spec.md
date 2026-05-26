## ADDED Requirements

### Requirement: Send messages via channel selection
The system SHALL allow event organizers to choose between E-Mail and WhatsApp as the delivery channel when composing a message to event participants. The channel selection SHALL be explicit and clearly visible in the messaging UI.

#### Scenario: Select E-Mail channel
- **WHEN** an organizer selects "E-Mail" as the channel
- **THEN** the system SHALL display the subject field and send the message via the existing MailService with HTML templates and CI branding

#### Scenario: Select WhatsApp channel
- **WHEN** an organizer selects "WhatsApp" as the channel
- **THEN** the system SHALL hide the subject field (WhatsApp has no subject), display a plain-text message editor with a formatting hint for WhatsApp-supported formatting (`*fett*`, `_kursiv_`, `~durchgestrichen~`, ` ```Code``` `), and send via the WhatsApp connection of the current user

#### Scenario: WhatsApp not connected
- **WHEN** an organizer selects "WhatsApp" but has no active WhatsApp connection
- **THEN** the system SHALL display a notice "Bitte verbinde zuerst dein WhatsApp-Konto" with a link to the WhatsApp settings on the profile page

### Requirement: Preview message recipients before sending
The system SHALL display a preview of all recipients and the total message count before any message is sent, regardless of channel. The organizer MUST explicitly confirm the send action after reviewing the preview.

#### Scenario: Preview for E-Mail
- **WHEN** an organizer requests a preview for an E-Mail message
- **THEN** the system SHALL display a list of all recipients with their name and email address, the total count, and the resolved message content for the first recipient as a sample

#### Scenario: Preview for WhatsApp
- **WHEN** an organizer requests a preview for a WhatsApp message
- **THEN** the system SHALL display a list of all recipients with their name and phone number (partially masked), the total count, and the resolved plain-text message for the first recipient as a sample

#### Scenario: Recipients without contact info
- **WHEN** some recipients lack the required contact information (no email for E-Mail, no phone number for WhatsApp)
- **THEN** the preview SHALL clearly mark these recipients as "Nicht erreichbar" with the reason, and exclude them from the send count

#### Scenario: WhatsApp availability check
- **WHEN** the preview is generated for the WhatsApp channel
- **THEN** the system SHALL check via neonize `is_on_whatsapp()` whether each recipient's phone number is registered on WhatsApp, and display per recipient: "Auf WhatsApp" (reachable), "Nicht auf WhatsApp" (number exists but not registered), or "Keine Telefonnummer" (no number provided)

### Requirement: Confirm each message individually
The system SHALL require the organizer to explicitly confirm the send action after viewing the preview. There SHALL be no "send all without confirmation" option. The confirmation dialog SHALL state the exact number of messages that will be sent.

#### Scenario: Confirm and send
- **WHEN** an organizer reviews the preview and clicks "Nachrichten senden"
- **THEN** the system SHALL display a final confirmation: "{count} Nachrichten per {channel} senden?" with "Abbrechen" and "Senden" buttons

#### Scenario: Cancel send
- **WHEN** an organizer clicks "Abbrechen" on the confirmation dialog
- **THEN** no messages SHALL be sent and the organizer returns to the compose view

### Requirement: Support placeholders in WhatsApp messages
The system SHALL support the same placeholder system for WhatsApp messages as for E-Mail messages. Placeholders SHALL be resolved per recipient before sending.

#### Scenario: Placeholder resolution in WhatsApp
- **WHEN** a WhatsApp message contains `{vorname}`, `{nachname}`, `{pfadiname}`, `{event_name}`, `{buchungsoption}`, `{preis}`, `{bezahlt}`, or `{restbetrag}`
- **THEN** the system SHALL resolve each placeholder to the corresponding participant data before sending, identical to the E-Mail placeholder resolution

#### Scenario: Placeholder preview
- **WHEN** the message preview is displayed
- **THEN** the sample message SHALL show all placeholders resolved for the first recipient

### Requirement: Log all sent messages in event timeline
The system SHALL create a timeline entry for every successfully sent message, regardless of channel. The timeline entry SHALL include the channel used, the recipient name, and the message subject (E-Mail) or a truncated preview (WhatsApp, max 50 chars).

#### Scenario: E-Mail timeline entry
- **WHEN** an E-Mail is sent successfully to a participant
- **THEN** the system SHALL create a `MAIL_SENT` timeline entry with the subject and recipient name (existing behavior preserved)

#### Scenario: WhatsApp timeline entry
- **WHEN** a WhatsApp message is sent successfully to a participant
- **THEN** the system SHALL create a `WHATSAPP_SENT` timeline entry with a truncated message preview (max 50 characters) and the recipient name

#### Scenario: Failed message timeline entry
- **WHEN** a message fails to send on any channel
- **THEN** the system SHALL NOT create a timeline entry for the failed message, but SHALL include the failure in the send result returned to the frontend

### Requirement: Store phone numbers on Person and Participant
The system SHALL support an optional `phone_number` field on both `Person` and `Participant` models. When a `Participant` is created from a `Person`, the phone number SHALL be copied (denormalized) like other person fields.

#### Scenario: Phone number on Person
- **WHEN** a user manages their person records
- **THEN** the system SHALL allow entering an optional phone number in international format (e.g., `+491701234567`)

#### Scenario: Phone number copied to Participant
- **WHEN** a `Participant` is created from a `Person` during registration
- **THEN** the system SHALL copy the `phone_number` from the `Person` to the `Participant` (denormalized)

#### Scenario: Phone number validation
- **WHEN** a phone number is entered
- **THEN** the system SHALL validate that it starts with `+` followed by digits only (international format) and has between 8 and 15 digits

### Requirement: Display send results with per-recipient status
The system SHALL display the result of a send operation to the organizer, showing the number of successfully sent messages, the number of failures, and the specific recipients that failed with the reason.

#### Scenario: All messages sent successfully
- **WHEN** all messages are sent successfully
- **THEN** the system SHALL display a success message: "{count} Nachrichten erfolgreich gesendet"

#### Scenario: Partial failure
- **WHEN** some messages fail to send
- **THEN** the system SHALL display "{sent_count} gesendet, {failed_count} fehlgeschlagen" with an expandable list of failed recipients and their error reasons

### Requirement: Messaging tab replaces mail tab
The event dashboard SHALL display a "Nachrichten" tab instead of the current "E-Mail" tab. The tab SHALL contain both E-Mail and WhatsApp messaging functionality with a channel selector.

#### Scenario: Tab label and content
- **WHEN** an event organizer opens the event dashboard
- **THEN** the system SHALL display a tab labeled "Nachrichten" (instead of "E-Mail") containing the unified messaging interface

#### Scenario: Default channel selection
- **WHEN** an organizer opens the Nachrichten tab
- **THEN** the system SHALL default to "E-Mail" as the selected channel

### Requirement: Message templates
The system SHALL support predefined and user-defined message templates that pre-fill the message body (and optionally subject for E-Mail) with text and placeholders. Templates SHALL be channel-agnostic and usable for both E-Mail and WhatsApp.

#### Scenario: Select a predefined template
- **WHEN** an organizer clicks on a predefined template (e.g., "Zahlungserinnerung")
- **THEN** the system SHALL fill the body field with the template text including placeholders, and the subject field (if E-Mail channel is selected) with the template subject

#### Scenario: Create a custom template
- **WHEN** an organizer creates a custom message template with title, optional subject, and body text
- **THEN** the system SHALL save the template to the user's account for reuse across all events

#### Scenario: List available templates
- **WHEN** an organizer opens the template selector in the message composer
- **THEN** the system SHALL display predefined system templates first, followed by the user's custom templates, each with title and a body preview

#### Scenario: Delete a custom template
- **WHEN** an organizer deletes one of their custom templates
- **THEN** the system SHALL remove the template permanently. System templates SHALL NOT be deletable.

### Requirement: Phone number in guest registration
The system SHALL support an optional `phone_number` field in the guest registration form, allowing unauthenticated guests to provide a phone number for WhatsApp contact.

#### Scenario: Guest provides phone number
- **WHEN** a guest fills out the registration form on the public event page
- **THEN** the system SHALL display an optional phone number field with international format validation and a hint that it may be used for event communication via WhatsApp

#### Scenario: Guest phone number stored on participant
- **WHEN** a guest submits a registration with a phone number
- **THEN** the system SHALL store the phone number directly on the created `Participant` record

## Mail

### Requirement: Send manual email to participants
The system SHALL send manual emails from event organizers as HTML emails using the CI-branded email template instead of plain text. The `MailService.send_mail()` method SHALL resolve the event's group CI, render the `event_mail.html` template with CI data and placeholder-resolved content, and send both HTML and plain-text versions via `django.core.mail.send_mail(html_message=...)`. The placeholder resolution logic SHALL be extracted into a shared utility function used by both E-Mail and WhatsApp channels.

#### Scenario: Send manual email with group CI
- **WHEN** an organizer sends a manual email for an event that has an invited group with CI
- **THEN** the email SHALL be sent as HTML with the group's logo, colors, and footer, plus a plain-text fallback

#### Scenario: Send manual email without group CI
- **WHEN** an organizer sends a manual email for an event without group CI
- **THEN** the email SHALL be sent as HTML with default Inspi styling and a plain-text fallback

#### Scenario: Placeholders resolved before template rendering
- **WHEN** the email body contains placeholders like `{vorname}`, `{event_name}`
- **THEN** the system SHALL resolve all placeholders first using the shared placeholder utility, then render the result into the HTML template

#### Scenario: Reply-to header preserved
- **WHEN** the event has responsible persons configured
- **THEN** the email SHALL include the first responsible person's email as reply-to (existing behavior preserved)

#### Scenario: Timeline logging preserved
- **WHEN** an email is sent successfully
- **THEN** the system SHALL log a `MAIL_SENT` timeline entry (existing behavior preserved)

### Requirement: Send registration confirmation
The system SHALL send registration confirmation emails as HTML emails using the CI-branded registration confirmation template. The `MailService.send_registration_confirmation()` method SHALL resolve the event's group CI and render the `registration_confirmation.html` template. Registration confirmations SHALL continue to be sent via E-Mail only (not WhatsApp).

#### Scenario: Confirmation with CI and payment info
- **WHEN** a user registers for an event with a group CI that has `payment_info`
- **THEN** the confirmation email SHALL include a "Zahlungsinformationen" section with the payment details from the CI

#### Scenario: Confirmation without CI
- **WHEN** a user registers for an event without group CI
- **THEN** the confirmation email SHALL use default Inspi styling with "Viele Gruesse, Das Team von {event_name}" as signature

#### Scenario: Confirmation is email-only
- **WHEN** a user registers for an event
- **THEN** the system SHALL send the confirmation only via E-Mail, regardless of whether the organizer has a WhatsApp connection
