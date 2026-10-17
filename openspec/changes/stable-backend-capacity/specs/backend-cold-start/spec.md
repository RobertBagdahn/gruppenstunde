## ADDED Requirements

### Requirement: Fast backend cold start
The backend image SHALL contain precompiled Python bytecode for installed dependencies and application code. Gunicorn SHALL load the Django application before it accepts connections (`--preload`), so the Cloud Run startup probe passes only once the application is importable and the startup CPU boost covers application loading. Modules that are only needed by AI or Google Cloud integrations (`google.genai`, `google.cloud`, `grpc`) MUST NOT be imported while loading the WSGI application and URL configuration.

#### Scenario: First request after a cold start
- **GIVEN** no backend instance is running
- **WHEN** an unauthenticated or authenticated user calls any API endpoint
- **THEN** the new instance SHALL answer without first compiling or importing the Django application inside the request
- **THEN** the startup probe SHALL succeed only after the WSGI application has been loaded

#### Scenario: Heavy integrations stay lazy
- **GIVEN** the backend settings are loaded
- **WHEN** the WSGI application and the URL configuration are imported
- **THEN** `google.genai`, `google.cloud` and `grpc` SHALL NOT appear in `sys.modules`

### Requirement: Daily warm window
The backend service SHALL keep at least one instance running every day from 16:00 to 22:00 Europe/Berlin and SHALL scale to zero outside that window. The window SHALL be applied as a service-level minimum instance count by two Cloud Scheduler jobs authenticated with a dedicated service account that may only update the backend service. Deploys from the GitHub Actions pipeline and Terraform applies MUST NOT reset the service-level minimum instance count.

#### Scenario: Window opens
- **GIVEN** it is 16:00 Europe/Berlin
- **WHEN** the scheduler job for opening the window runs
- **THEN** the backend service SHALL have a minimum of one instance

#### Scenario: Window closes
- **GIVEN** it is 22:00 Europe/Berlin
- **WHEN** the scheduler job for closing the window runs
- **THEN** the backend service SHALL have a minimum of zero instances

#### Scenario: Deploy during the window
- **GIVEN** the warm window is open
- **WHEN** a new backend revision is deployed
- **THEN** the service-level minimum of one instance SHALL remain in effect
