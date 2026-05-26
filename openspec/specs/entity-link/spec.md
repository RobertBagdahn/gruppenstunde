# entity-link Specification

## Purpose

Spezifikation fuer die EntityLink-Komponente: ein einheitliches System fuer Entity-Navigation im Frontend mit kontextabhaengigem NewTab-Verhalten, zentraler URL-Aufloesung und konsistenter Link-Darstellung.

## Context

- **Frontend**: React 18, TypeScript (strict), React Router
- **Komponente**: `frontend/src/components/shared/EntityLink.tsx`
- **URL-Helfer**: `frontend/src/lib/entityUrls.ts`
- **Context-Provider**: `frontend/src/components/shared/EntityLinkContext.tsx`

## Requirements

### Requirement: EntityLink component for uniform entity navigation
The frontend SHALL provide a shared `<EntityLink>` component at `frontend/src/components/shared/EntityLink.tsx` that renders a React Router link to the appropriate detail page for any supported entity type.

Supported entity types: `recipe`, `ingredient`, `material`, `event`, `location`, `session`, `game`, `blog`, `user`, `group`, `tag`.

The component SHALL accept props:
- `type`: required, one of the supported types
- `id` OR `slug`: the identifier (which one is required depends on type — see URL resolution table)
- `name`: required, the display text
- `newTab`: optional boolean, overrides context default
- `variant`: optional, one of `"default" | "muted" | "chip"`
- `className`: optional, Tailwind escape hatch
- `children`: optional, overrides `name` for display

#### Scenario: EntityLink renders valid link
- **WHEN** rendering `<EntityLink type="recipe" slug="zaubertrank" name="Zaubertrank" />`
- **THEN** the DOM SHALL contain an anchor element with `href="/recipes/zaubertrank"`
- **AND** the visible text SHALL be "Zaubertrank"

#### Scenario: Missing required identifier
- **WHEN** a developer renders `<EntityLink type="recipe" name="X" />` without `slug` or `id`
- **THEN** TypeScript SHALL produce a compile-time error
- **AND** at runtime (if bypassed) the component SHALL render the name as plain text without a link

### Requirement: Central URL resolution for entities
A pure function `getEntityUrl(type, { id?, slug? }): string` SHALL exist in `frontend/src/lib/entityUrls.ts` and be used by the EntityLink component and any other code that constructs entity URLs.

The resolution SHALL follow this table:

| type | preferred identifier | URL pattern |
|------|---------------------|-------------|
| `recipe` | `slug` | `/recipes/:slug` |
| `ingredient` | `slug` | `/ingredients/:slug` |
| `material` | `slug` | `/materials/:slug` |
| `event` | `slug` | `/events/:slug` |
| `location` | `id` | the canonical location route as used in existing code |
| `session` | `slug` | `/sessions/:slug` |
| `game` | `slug` | `/games/:slug` |
| `blog` | `slug` | `/blogs/:slug` |
| `user` | `id` | `/profiles/:id` |
| `group` | `id` | `/groups/:id` |
| `tag` | `slug` | contextual: `/search?tag_slugs=:slug` |

The exact routes SHALL be verified against the existing React Router configuration during implementation; any divergence MUST be documented in `frontend/AGENTS.md`.

#### Scenario: Recipe URL resolved by slug
- **WHEN** `getEntityUrl('recipe', { slug: 'zaubertrank' })` is called
- **THEN** the function SHALL return `/recipes/zaubertrank`

#### Scenario: User URL resolved by id
- **WHEN** `getEntityUrl('user', { id: 42 })` is called
- **THEN** the function SHALL return `/profiles/42`

#### Scenario: Tag URL points to search
- **WHEN** `getEntityUrl('tag', { slug: 'outdoor' })` is called
- **THEN** the function SHALL return a URL that triggers a search filtered by that tag

### Requirement: New tab policy via context
EntityLink SHALL open its target in a new browser tab when rendered inside a list context, and in the same tab when rendered inside a detail context. Call sites MAY override this with an explicit `newTab` prop.

A React context `<EntityLinkContext>` SHALL be provided to declare the surrounding context as `"list"` or `"detail"`. Pages SHALL wrap their content with the appropriate context.

If no context is provided, the default SHALL be `newTab=false` (same tab).

When `newTab=true`, the rendered anchor SHALL include `target="_blank"` and `rel="noopener noreferrer"` for security.

#### Scenario: EntityLink in list context opens new tab
- **WHEN** EntityLink is rendered inside a component wrapped by `<EntityLinkContext value="list">`
- **AND** no explicit `newTab` prop is passed
- **THEN** the rendered anchor SHALL have `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: EntityLink in detail context stays in same tab
- **WHEN** EntityLink is rendered inside a component wrapped by `<EntityLinkContext value="detail">`
- **AND** no explicit `newTab` prop is passed
- **THEN** the rendered anchor SHALL NOT have `target="_blank"`

#### Scenario: Explicit newTab prop overrides context
- **WHEN** EntityLink is rendered with `newTab={false}` inside a list context
- **THEN** the rendered anchor SHALL NOT have `target="_blank"`

#### Scenario: Breadcrumb links default to same tab
- **WHEN** EntityLink is used inside a breadcrumb
- **THEN** it SHALL render with `newTab={false}` regardless of surrounding context
- **AND** breadcrumbs SHALL NOT be wrapped in `EntityLinkContext` OR SHALL set `newTab={false}` explicitly

### Requirement: Migration of high-impact link sites
The following call sites SHALL be migrated to use EntityLink as part of this change:

- Recipe detail page: ingredient references (currently uses `id`, MUST use `slug`)
- Recipe detail page and recipe cards: author names
- Event detail page and event cards: location link, organizer names
- Session detail page and session cards: author names
- Game detail page and game cards: author names
- Blog detail page and blog cards: author names
- Tag chips in all content detail pages: clickable, navigating to filtered search/list
- Search results page: each result's primary link

Additional call sites MAY be migrated incrementally in follow-up changes.

#### Scenario: Ingredient link uses slug after migration
- **WHEN** a user views a recipe detail page containing an ingredient
- **THEN** the ingredient name SHALL be rendered as an EntityLink
- **AND** the link target SHALL use the ingredient's `slug`, not its numeric `id`

#### Scenario: Tag chips are clickable
- **WHEN** a user views any content detail page with tag chips
- **THEN** each tag chip SHALL be rendered as an EntityLink with `type="tag"` and `variant="chip"`
- **AND** clicking the chip SHALL navigate to a filtered view for that tag

## Betroffene Dateien

| Datei | Relevanz |
|-------|----------|
| `frontend/src/components/shared/EntityLink.tsx` | Main EntityLink component |
| `frontend/src/components/shared/EntityLinkContext.tsx` | Context provider for newTab policy |
| `frontend/src/lib/entityUrls.ts` | Central URL resolution helper |
| `frontend/src/components/content/ContentAuthorSection.tsx` | Author links migrated to EntityLink |
| `frontend/src/pages/recipes/RecipeDetailPage.tsx` | Ingredient + tag migration |
| `frontend/src/pages/sessions/SessionDetailPage.tsx` | Tag migration + context wrapper |
| `frontend/src/pages/games/GameDetailPage.tsx` | Tag migration + context wrapper |
| `frontend/src/pages/blogs/BlogDetailPage.tsx` | Tag migration + context wrapper |
| `frontend/src/pages/SearchPage.tsx` | ResultCard migration + list context |
