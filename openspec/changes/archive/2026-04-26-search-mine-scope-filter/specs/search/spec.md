## MODIFIED Requirements

### Requirement: Unified Global Search
The system SHALL provide a unified search endpoint that searches across all content types (GroupSession, Blog, Game, Recipe, Event). The search SHALL use hybrid matching: PostgreSQL full-text search (pg_trgm) for text relevance and pgvector cosine similarity for semantic matching. The endpoint SHALL accept an optional `scope` query parameter with values `all` (default) or `mine` that restricts results to content related to the authenticated user. Event results SHALL always exclude items with `is_template=True`.

#### Scenario: Searching across all content types (default scope)
- **WHEN** GET `/api/content/search/?q=feuer`
- **THEN** the system SHALL search all content tables (session, blog, game, recipe, event)
- **THEN** results SHALL be merged and sorted by combined relevance score
- **THEN** only content with `status='approved'` and `deleted_at IS NULL` SHALL be included
- **THEN** Event results SHALL exclude items with `is_template=True`
- **THEN** response SHALL include `content_type` discriminator for each result

#### Scenario: Filtering by content type
- **WHEN** GET `/api/content/search/?q=feuer&type=session`
- **THEN** only GroupSession results SHALL be returned

#### Scenario: Empty search returns popular content
- **WHEN** GET `/api/content/search/` without a query
- **THEN** the system SHALL return popular/recent approved content across all types

## ADDED Requirements

### Requirement: Mine-scope filter for search
The search endpoint SHALL support a `scope=mine` parameter that restricts results to content related to the authenticated user. The semantics SHALL be content-type-specific and cover ownership, authorship, invitation, responsibility, and registration. When `scope=mine` is set, the status filter SHALL be relaxed so that DRAFT items owned by the user are included.

#### Scenario: Mine scope for session/blog/game
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=session` with an authenticated user
- **THEN** only GroupSession items SHALL be returned where the user is either `created_by` OR listed in `authors`
- **THEN** items with `status='draft'` SHALL be included if the user matches the ownership criteria
- **THEN** the same logic SHALL apply for `type=blog` (created_by OR authors) and `type=game` (created_by OR authors)

#### Scenario: Mine scope for recipe
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=recipe` with an authenticated user
- **THEN** only Recipe items SHALL be returned where the user is either `owner` OR listed in `authors`
- **THEN** draft recipes owned by the user SHALL be included

#### Scenario: Mine scope for event (comprehensive relation set)
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=event` with an authenticated user
- **THEN** Event items SHALL be returned where any of the following is true:
  - the user equals `created_by`
  - the user is in `responsible_persons` M2M
  - the user is in `invited_users` M2M
  - at least one group of `invited_groups` M2M is also in the user's groups
  - a `Registration` row exists linking the event to the user (any status)
- **THEN** the response SHALL deduplicate events that match multiple criteria (`.distinct()`)
- **THEN** events with `is_template=True` SHALL be excluded

#### Scenario: Mine scope across all types
- **WHEN** GET `/api/content/search/?q=&scope=mine` without a type filter
- **THEN** the per-type mine semantics SHALL be applied independently for each type
- **THEN** results SHALL be merged and sorted by relevance as with normal search

#### Scenario: Mine scope for anonymous user
- **WHEN** GET `/api/content/search/?q=&scope=mine` without an authenticated session
- **THEN** the endpoint SHALL return `401 Unauthorized` OR ignore the `scope` parameter and behave as `scope=all`
- **THEN** the frontend SHALL NOT surface the mine-toggle to anonymous users

#### Scenario: Draft leak protection
- **WHEN** user A requests `/api/content/search/?scope=mine`
- **THEN** the response SHALL NOT include draft items owned by user B
- **THEN** backend tests SHALL verify that draft visibility is strictly scoped to `request.user`

### Requirement: Frontend mine-toggle on SearchPage
The SearchPage SHALL display a toggle switch labelled "Nur meine Beiträge" that controls the `scope` URL parameter. The toggle SHALL only be visible for authenticated users and SHALL default to off.

#### Scenario: Authenticated user toggles mine
- **WHEN** an authenticated user visits `/search?q=feuer`
- **THEN** a `Switch` with label "Nur meine Beiträge" SHALL be rendered in the filter bar
- **WHEN** the user enables the switch
- **THEN** the URL SHALL update to `/search?q=feuer&scope=mine`
- **THEN** the result list SHALL refetch and show only mine-scoped results

#### Scenario: Switch state reflects URL
- **WHEN** the URL is `/search?q=feuer&scope=mine`
- **THEN** the switch SHALL be rendered in the ON state on initial load

#### Scenario: Anonymous user does not see the toggle
- **WHEN** an anonymous visitor loads `/search?q=feuer`
- **THEN** the mine-toggle SHALL NOT be rendered
- **THEN** any `scope=mine` in the URL SHALL be ignored by the frontend and not passed to the API

#### Scenario: Draft items visible with badge
- **WHEN** `scope=mine` is active and a returned item has `status='draft'`
- **THEN** the result card SHALL display an "Entwurf" badge
- **THEN** clicking the item SHALL navigate to the normal detail page (existing draft-view behaviour)
