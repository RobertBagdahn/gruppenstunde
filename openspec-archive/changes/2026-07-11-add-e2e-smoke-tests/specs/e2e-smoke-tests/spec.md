## ADDED Requirements

### Requirement: Smoke test orchestration via Makefile
The system SHALL provide a `make smoke-test` target that executes the full smoke test suite. The target SHALL delegate to a shell script at `e2e/smoke-test.sh` and exit with the script's exit code.

#### Scenario: Developer runs make smoke-test
- **WHEN** developer runs `make smoke-test` from the repo root
- **THEN** the smoke-test.sh script is executed
- **THEN** the Makefile target exits with code 0 on success or non-zero on failure

### Requirement: Automatic database setup
The smoke test SHALL ensure the database is running and contains seed data before tests execute. It SHALL NOT destroy existing data.

#### Scenario: Database is already running with seed users
- **WHEN** smoke test starts and podman DB container is running and seed users exist
- **THEN** no migration or seeding is performed

#### Scenario: Database is running but no seed users exist
- **WHEN** smoke test starts and podman DB container is running but no users exist
- **THEN** `add_users --if-empty` is executed
- **THEN** tests proceed with the newly created seed users

#### Scenario: Database container is not running
- **WHEN** smoke test starts and podman DB container is not running
- **THEN** `podman compose up -d db` is executed
- **THEN** migrations are applied via `uv run python manage.py migrate`
- **THEN** `add_users --if-empty` is executed

### Requirement: Server lifecycle management
The smoke test SHALL start backend and frontend dev servers before tests run and SHALL terminate them after tests complete, regardless of test outcome.

#### Scenario: Servers start successfully
- **WHEN** smoke test starts servers
- **THEN** backend starts on port 8000
- **THEN** main frontend starts on port 5173
- **THEN** food frontend starts on port 5174
- **THEN** each server's stdout and stderr is redirected to a log file in `e2e/output/`

#### Scenario: Server fails to start
- **WHEN** a server fails to start within the health check timeout (30s)
- **THEN** the smoke test fails with a clear error message indicating which server failed
- **THEN** all previously started servers are terminated

#### Scenario: Test failure does not leave servers running
- **WHEN** Playwright tests fail
- **THEN** all server processes are killed
- **THEN** log files are preserved for inspection

### Requirement: Public page smoke tests
The system SHALL verify that critical public pages load without errors using Playwright.

#### Scenario: Homepage loads
- **WHEN** Playwright navigates to `http://localhost:5173/`
- **THEN** the page loads with HTTP status 200
- **THEN** no console errors are present
- **THEN** a viewport screenshot (375px width) and a full-page screenshot are saved

#### Scenario: Recipe list loads
- **WHEN** Playwright navigates to `http://localhost:5174/recipes`
- **THEN** the page loads without console errors
- **THEN** at least one recipe card or the empty state is visible
- **THEN** viewport and full-page screenshots are saved

#### Scenario: Recipe detail loads
- **WHEN** Playwright navigates to a known recipe slug URL
- **THEN** the page loads without console errors
- **THEN** the recipe title is visible on the page
- **THEN** viewport and full-page screenshots are saved

#### Scenario: Search returns results
- **WHEN** Playwright navigates to `http://localhost:5173/search?q=test`
- **THEN** the page loads without console errors
- **THEN** viewport and full-page screenshots are saved

#### Scenario: Blog list loads
- **WHEN** Playwright navigates to `http://localhost:5173/blogs`
- **THEN** the page loads without console errors
- **THEN** viewport and full-page screenshots are saved

### Requirement: Authentication smoke tests
The system SHALL verify the login flow works correctly using Playwright.

#### Scenario: CSRF token is available
- **WHEN** Playwright makes a GET request to `/api/auth/csrf/`
- **THEN** the response contains a `csrfToken` field
- **THEN** a `csrftoken` cookie is set

#### Scenario: Login with seed user succeeds
- **WHEN** Playwright navigates to the login page
- **THEN** Playwright fills email and password with seed user credentials
- **THEN** Playwright submits the login form
- **THEN** the user is redirected to a page indicating successful login
- **THEN** the `sessionid` cookie is present
- **THEN** viewport and full-page screenshots are saved

#### Scenario: Authenticated user info is returned
- **WHEN** Playwright makes a GET request to `/api/auth/me/` with session cookie
- **THEN** the response contains the authenticated user's email and id

### Requirement: Authenticated page smoke tests
The system SHALL verify that pages requiring authentication load correctly.

#### Scenario: My dashboard loads
- **WHEN** Playwright is logged in and navigates to `http://localhost:5173/my-dashboard`
- **THEN** the page loads without console errors
- **THEN** viewport and full-page screenshots are saved

#### Scenario: My recipes loads
- **WHEN** Playwright is logged in and navigates to `http://localhost:5174/recipes/my-recipes`
- **THEN** the page loads without console errors
- **THEN** viewport and full-page screenshots are saved

#### Scenario: Meal plans app loads
- **WHEN** Playwright is logged in and navigates to `http://localhost:5174/meal-plans/app`
- **THEN** the page loads without console errors
- **THEN** viewport and full-page screenshots are saved

### Requirement: Screenshot output
The system SHALL save screenshots to `e2e/output/screenshots/` with descriptive filenames.

#### Scenario: Screenshot files are created
- **WHEN** a test page is visited
- **THEN** two screenshots are saved per page: one with `-viewport` suffix (375px width) and one with `-fullpage` suffix
- **THEN** filenames use the pattern `<spec-name>-<page-name>-<viewport|fullpage>.png`
- **THEN** the `e2e/output/screenshots/` directory is created if it does not exist

### Requirement: Server log monitoring
The system SHALL capture server logs and SHALL fail the smoke test if critical errors are found.

#### Scenario: No errors in logs
- **WHEN** smoke test completes without errors in server logs
- **THEN** the test passes and log files are available in `e2e/output/`

#### Scenario: Backend 500 error in logs
- **WHEN** the backend log file contains a line matching `ERROR`, `500`, `Traceback`, or `ECONNREFUSED`
- **THEN** the smoke test fails
- **THEN** the matching log lines are printed to stdout

#### Scenario: Frontend proxy error in logs
- **WHEN** a frontend log file contains a line indicating a failed proxy request
- **THEN** the smoke test fails
- **THEN** the matching log lines are printed to stdout

### Requirement: Output directory gitignore
The system SHALL ensure that test output is not committed to version control.

#### Scenario: Output directory is gitignored
- **WHEN** `e2e/output/` directory exists
- **THEN** it is listed in `e2e/.gitignore`
- **THEN** screenshots and log files are not tracked by git
