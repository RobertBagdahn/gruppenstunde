## 1. SearchPage Import-Fix

- [x] 1.1 In `frontend/src/pages/SearchPage.tsx`: Fehlende Imports ergänzen — `EntityLink` aus `@/components/shared/EntityLink`, `EntityLinkContext` aus `@/components/shared/EntityLinkContext`, `EntityType` aus `@/lib/entityUrls`
- [x] 1.2 In `SearchPage.tsx`: ResultCard-Komponente so anpassen, dass sie `<EntityLink>` anstelle von plain `<a>` verwendet, mit `EntityLinkContext.Provider value="list"` als Wrapper

## 2. EntityType um recipe erweitern

- [x] 2.1 In `frontend/src/lib/entityUrls.ts`: `EntityType` um `'recipe'` erweitern und `ENTITY_CONFIG` um Recipe-Eintrag ergänzen (Route: `/recipes/:slug`, Icon: `restaurant`, Label: `'Rezept'`)
- [x] 2.2 In `frontend/src/lib/entityUrls.test.ts`: Test für `getEntityUrl('recipe', { slug: '...' })` hinzufügen. Irreführende Testnamen korrigieren (`'resolves recipe to /sessions/:slug'` → korrekten Testnamen verwenden)

## 3. CommandPalette Routen korrigieren

- [x] 3.1 In `frontend/src/components/shared/CommandPalette.tsx`: Route `'/sessions/new'` → `'/create/session'` ändern
- [x] 3.2 In `CommandPalette.tsx`: Route `'/planner'` → `'/session-planner/app'` ändern

## 4. Schema-Konsistenz

- [x] 4.1 In `frontend/src/schemas/search.ts`: Prüfen, dass `RESULT_TYPE_OPTIONS` und `ResultTypeConfig` mit dem aktualisierten `EntityType` konsistent sind
- [x] 4.2 In `frontend/src/schemas/contentLink.ts`: `CONTENT_TYPE_LABELS` um `recipe`-Eintrag ergänzen
