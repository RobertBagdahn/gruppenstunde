## Why

The platform needs a reliable email sending system to support user registration, verification, login, password resets, and other notification features. Setting up a dedicated Gmail SMTP configuration with `inspirator.testmail@gmail.com` using Google App Passwords ensures secure and reliable email delivery from our backend services.

## What Changes

- Add Google SMTP email configurations to Django backend settings (`base.py`) utilizing environment variables.
- Update `.env.example` to document the newly required email configuration variables (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`).
- Integrate the Gmail App Password as a secret in Google Secret Manager to be injected into Cloud Run environments during deployment.

## Capabilities

### New Capabilities
- `email-delivery`: Reliable email dispatch capability using the SMTP backend connected to a dedicated Gmail account.

### Modified Capabilities
*No functional requirements for existing capabilities are changing, only the underlying transport mechanism is being configured.*

## Impact

- **Backend settings**: `backend/inspi/settings/base.py` will include Django standard email configurations.
- **Deployment & Secrets**: The `deploy` skill and production configurations will reference Google Secret Manager for the Gmail App Password.
- **Local Environment**: Local development settings (`.env`) will support SMTP email dispatch or console-logging fallback.
