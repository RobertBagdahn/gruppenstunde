## ADDED Requirements

### Requirement: User role field
The `UserProfile` model SHALL include a `role` field (CharField, max_length=20) with choices `user`, `staff`, `admin`. The default SHALL be `user`. The API SHALL expose `role` in the user profile response.

#### Scenario: Profile response includes role
- **WHEN** an authenticated user requests `GET /api/profile/me/`
- **THEN** the response SHALL include `role: "user"` (or the actual role)

#### Scenario: Admin user profile
- **WHEN** an admin user requests their profile
- **THEN** the response SHALL include `role: "admin"`

### Requirement: Admin role management endpoint
The system SHALL provide an admin-only endpoint for managing user roles at `PATCH /api/admin/users/{id}/role/`. Only users with `role="admin"` SHALL be authorized. The endpoint SHALL accept `{ "role": "staff" | "user" }`. Setting role to `"admin"` SHALL require an additional confirmation or be restricted to Django Admin.

#### Scenario: Admin promotes user to staff
- **WHEN** an admin sends `PATCH /api/admin/users/{id}/role/` with `{ "role": "staff" }`
- **THEN** the user's profile `role` SHALL be updated

#### Scenario: Staff user attempts to change role
- **WHEN** a staff user sends `PATCH /api/admin/users/{id}/role/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Non-admin attempts to change role
- **WHEN** a regular user sends `PATCH /api/admin/users/{id}/role/`
- **THEN** the system SHALL return HTTP 403

## MODIFIED Requirements

### Requirement: Benutzerprofil — MODIFIED
Das System MUST ein UserProfile für jeden registrierten Benutzer pflegen. Das Profil SHALL das `role`-Feld enthalten.

#### Scenario: Eigenes Profil anzeigen — MODIFIED
- **WHEN** der Benutzer `GET /api/profile/me/` aufruft
- **THEN** werden die Profildaten zurückgegeben inklusive `role`: `{ id, slug, role, scout_name, first_name, last_name, gender, birthday, about_me, nutritional_tags, profile_picture_url, is_public, created_at, updated_at }`

### Requirement: Eigene Inhalte auflisten — MODIFIED
Das System SHALL Benutzern das Anzeigen ihrer eigenen erstellten Inhalte ermöglichen. Der Filter SHALL `created_by` anstelle des entfernten `owner`-Feldes verwenden.

#### Scenario: Eigene Inhalte auflisten
- **WHEN** der Benutzer `GET /api/profile/me/content/` aufruft
- **THEN** werden alle vom Benutzer erstellten Inhalte zurückgegeben (inklusive Drafts und verified)
- **THEN** die Antwort enthält `{ id, title, slug, content_type, summary, status, image_url, created_at, updated_at, can_edit, can_delete }` pro Item
