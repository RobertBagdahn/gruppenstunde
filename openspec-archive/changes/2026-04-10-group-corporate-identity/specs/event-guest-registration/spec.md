## MODIFIED Requirements

### Requirement: Guest registration confirmation email
The system SHALL send the guest registration confirmation email as an HTML email using the CI-branded registration confirmation template, consistent with the regular registration flow. The `GuestRegistrationService` SHALL use `MailService.send_registration_confirmation()` which now renders HTML with CI.

#### Scenario: Guest registration with group CI
- **WHEN** a guest registers for an event that has an invited group with CI
- **THEN** the confirmation email SHALL be rendered as HTML with the group's logo, colors, footer, and payment info

#### Scenario: Guest registration without group CI
- **WHEN** a guest registers for an event without group CI
- **THEN** the confirmation email SHALL use default Inspi styling
