## MODIFIED Requirements

### Requirement: EntityLink resolves recipe type
The EntityLink component and `getEntityUrl()` function SHALL support `type="recipe"` with URL pattern `/recipes/:slug`. The `EntityType` union in `entityUrls.ts` SHALL include `'recipe'`.

#### Scenario: Recipe search result navigates correctly
- **WHEN** `getEntityUrl('recipe', { slug: 'pasta-carbonara' })` is called
- **THEN** the function SHALL return `/recipes/pasta-carbonara`

### Requirement: Command palette quick actions resolve to valid routes
The CommandPalette quick actions SHALL navigate to routes that exist in `App.tsx`: `/create/session` (not `/sessions/new`) and `/session-planner/app` (not `/planner`).

### Requirement: SearchPage renders EntityLink for results
The SearchPage SHALL import and use `EntityLink`, `EntityLinkContext`, and `EntityType` from their respective modules to render clickable result cards that link to the correct entity detail pages.
