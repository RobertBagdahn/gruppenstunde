## ADDED Requirements

### Requirement: Raw fetch replaced with TanStack Query hooks
Components that perform API calls SHALL use TanStack Query hooks instead of raw `fetch()`. New query hooks SHALL be created for search operations previously using raw fetch.

#### Scenario: ShareDialog user search uses TanStack Query
- **WHEN** `ShareDialog` searches for users
- **THEN** it SHALL use a `useSearchUsers(query)` TanStack Query hook with `enabled: false` for manual triggering

#### Scenario: ProgramEditor content search uses TanStack Query
- **WHEN** `ProgramEditor` searches for content items
- **THEN** it SHALL use a `useSearchContent(type, query)` TanStack Query hook with `enabled: false` for manual triggering

#### Scenario: Error handling via toast
- **WHEN** a search query fails
- **THEN** the error SHALL be displayed via `toast.error()` in the component's `onError` callback, NOT via silent `catch {}`
