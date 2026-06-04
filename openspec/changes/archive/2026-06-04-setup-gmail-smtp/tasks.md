## 1. Backend Configuration Settings

- [x] 1.1 Add SMTP configuration to `backend/inspi/settings/base.py`
- [x] 1.2 Add local console backend fallback to `backend/inspi/settings/local.py`
- [x] 1.3 Add `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` documentation to `.env.example`

## 2. Verification and Testing

- [x] 2.1 Run tests to verify backend changes do not disrupt test environments
- [x] 2.2 Manually verify email sending behavior with Django console fallback in local dev

## 3. Secret Management & Deployment

- [x] 3.1 Create Google Secret Manager secret `gmail_app_password` with value `vmhtbolvvdyuvcca`
- [x] 3.2 Update Cloud Run deployment config / deploy skill instructions to map `EMAIL_HOST_PASSWORD` to `gmail_app_password`
- [x] 3.3 Deploy the application backend to verify successful end-to-end configuration
