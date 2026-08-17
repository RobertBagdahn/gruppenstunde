## Context

The Inspi platform relies on email communication for account creation, identity verification, and recovery. Previously, email settings were unconfigured in production settings, and the default Django email backend was undefined.

We have a dedicated Gmail account (`inspirator.testmail@gmail.com`) and have generated a 16-character Google App Password (`vmhtbolvvdyuvcca`) to facilitate secure authenticated SMTP delivery.

This change configures SMTP settings globally, provides local environment support, and integrates Secret Manager for production password security.

## Goals / Non-Goals

**Goals:**
- Configure Django to send emails securely via Gmail SMTP on Google Cloud Run.
- Securely inject the SMTP App Password into the deployment environment using Google Secret Manager.
- Ensure email sending works seamlessly with Django Allauth workflows.
- Maintain consistent behavior between local and production environments, while allowing console logging fallback locally.

**Non-Goals:**
- Changing existing registration/login UI flows or authentication logic.
- Building custom mail template views or changing email copywriting.

## Decisions

### 1. SMTP Configuration in Base Settings
We will configure standard Django SMTP email variables in `backend/inspi/settings/base.py` to be loaded dynamically from `environ`:
- `EMAIL_BACKEND`: `"django.core.mail.backends.smtp.EmailBackend"`
- `EMAIL_HOST`: `"smtp.gmail.com"`
- `EMAIL_PORT`: `587`
- `EMAIL_USE_TLS`: `True`
- `EMAIL_HOST_USER`: `"inspirator.testmail@gmail.com"`
- `EMAIL_HOST_PASSWORD`: Read from environment variable `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`: `"Inspi <inspirator.testmail@gmail.com>"`

### 2. Secret Injection on Cloud Run
In production, `EMAIL_HOST_PASSWORD` must not be in plaintext. We will use Google Secret Manager to manage the App Password:
- Create a secret named `gmail_app_password`.
- Mount / inject the secret in Cloud Run as the environment variable `EMAIL_HOST_PASSWORD`.

### 3. Local Fallback Configuration
In `backend/inspi/settings/local.py`, if `EMAIL_HOST_PASSWORD` is not configured, we can fallback to the console email backend to ensure local development continues smoothly without requiring a real SMTP configuration:
```python
if not env("EMAIL_HOST_PASSWORD", default=None):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

## Risks / Trade-offs

- **Rate Limiting / Suspensions** → [Risk] Google may block or rate-limit the account if volume is extremely high. → [Mitigation] Since this is for Pfadfinder-Gruppenführer and not general public spam, volume is expected to be low. If volume increases, we can transition to a transactional email provider like Mailgun or SendGrid.
- **Leaked Secret** → [Risk] Compromising the SMTP credentials. → [Mitigation] Using Google Secret Manager and keeping it out of git repositories.
