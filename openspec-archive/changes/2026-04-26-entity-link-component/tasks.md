## 1. URL resolution helper

- [x] 1.1 Verify each entity type's actual route in `frontend/src/App.tsx`; document the canonical URL pattern per type in a comment block at the top of `entityUrls.ts`
- [x] 1.2 Create `frontend/src/lib/entityUrls.ts` exporting `getEntityUrl(type, { id?, slug? })` as a pure function; throws in dev if required identifier is missing, falls back to `#` in prod
- [x] 1.3 Add unit tests covering every supported entity type with valid and invalid inputs

## 2. EntityLink component + context

- [x] 2.1 Create `frontend/src/components/shared/EntityLinkContext.tsx` exporting React context with values `"list" | "detail"` and a provider
- [x] 2.2 Create `frontend/src/components/shared/EntityLink.tsx` implementing the props-shape from the design doc; uses `getEntityUrl`, reads context for `newTab` default, adds `rel="noopener noreferrer"` when `newTab=true`
- [x] 2.3 Implement three visual variants (`default`, `muted`, `chip`) with Tailwind classes consistent with existing shadcn/ui styling
- [x] 2.4 Add component tests: rendering per type, newTab honored, context fallback, override via prop, accessibility attributes

## 3. Documentation

- [x] 3.1 Add section "Entity-Links & NewTab-Policy" in `frontend/AGENTS.md` with: the component API, the URL resolution table, the context wrapper usage pattern, and the "list → new tab / detail → same tab" rule
- [x] 3.2 Add a short code comment in `EntityLink.tsx` pointing to the AGENTS.md section

## 4. Migrate high-impact call sites

- [x] 4.1 Recipe detail page (`RecipeDetailPage.tsx`): replace ingredient links to use EntityLink with `type="ingredient"` and `slug` (fixes the existing `id`-vs-`slug` bug); migrate author references
- [x] 4.2 Recipe list / cards: migrate author names to EntityLink `type="user"` (N/A: RecipeCard does not display author names)
- [x] 4.3 Event detail page and `EventCard`: migrate location link (`type="location"`) and organizer names (`type="user"`) (N/A: locations and organizers are displayed as plain text, not links; author section already migrated via ContentAuthorSection)
- [x] 4.4 Session detail and session cards: migrate author names (already handled via ContentAuthorSection migration; cards don't display authors)
- [x] 4.5 Game and blog detail pages and cards: migrate author names (already handled via ContentAuthorSection migration; cards don't display authors)
- [x] 4.6 Tag chips: migrate across all content detail pages to use EntityLink `type="tag"` `variant="chip"`
- [x] 4.7 Search results page: wrap results in `<EntityLinkContext value="list">` and use EntityLink for each result's primary link
- [x] 4.8 Wrap every list page (RecipeListPage, SessionListPage, BlogListPage, GameListPage, EventsPage list view, etc.) in `<EntityLinkContext value="list">`; wrap every detail page in `<EntityLinkContext value="detail">`

## 5. Verification

- [ ] 5.1 Click-through: open a recipe list, click a recipe → new tab; from the detail, click a tag chip → same tab (filtered view); from detail, click an ingredient → same tab
- [ ] 5.2 Check the previously broken ingredient link now resolves by slug and reaches the correct ingredient detail page
- [ ] 5.3 Accessibility: all EntityLink-rendered anchors are keyboard-focusable and have visible focus ring
- [x] 5.4 No remaining hardcoded `<Link to="/recipes/...">` or `<Link to="/ingredients/...">` in migrated files (grep confirmation)
