## ADDED Requirements

### Requirement: SMTP-Based Email Dispatch
The backend system MUST support SMTP-based email dispatch for transaction-oriented system events (e.g., registration verification, password resets, and account updates).

#### Scenario: SMTP Mail Delivery in Production
- **GIVEN** a production environment
- **WHEN** an email is sent via Django's core mail module or Django Allauth
- **THEN** the system SHALL establish a connection to `smtp.gmail.com` on port `587` with TLS enabled
- **AND** the connection MUST authenticate using `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`
- **AND** the sent email MUST set the sender's envelope and headers to match the default from email address

#### Scenario: Local Fallback to Console
- **GIVEN** a local development environment where SMTP credentials are not configured in `.env`
- **WHEN** an email is sent by the application
- **THEN** the system SHALL capture the email and print its contents to the standard output console rather than throwing a transport exception
- **AND** no actual network connection to SMTP server SHALL be made
