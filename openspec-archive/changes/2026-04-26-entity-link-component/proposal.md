## Why

Heute werden Entity-Namen (Rezepte, Zutaten, Materialien, Events, Locations, Heimabende, Spiele, Blog, User) an vielen Stellen als reiner Text oder ad-hoc mit `<Link>` gerendert — uneinheitlich, manchmal gar nicht klickbar, und mit inkonsistentem `target="_blank"`-Verhalten. Konkrete Symptome:

- Zutat in `RecipeDetailPage` linkt auf `/ingredients/:id` statt `/ingredients/:slug` (Sub-Task hat einen Bug identifiziert)
- Tags sind als Chips gerendert, aber nicht klickbar zur gefilterten Suche
- User-Autoren werden als Text, nicht als Link angezeigt
- Kein einheitliches Pattern, wann ein Link in einem neuen Tab öffnet

Gewünscht ist ein **wiederverwendbares `<EntityLink>`-System** mit einer klaren Policy: **Aus Listen → neuer Tab, aus Detail-Seiten → selber Tab.** Das erlaubt User-flüssige Navigation ohne Kontextverlust.

## What Changes

- **Neue Komponente** `frontend/src/components/shared/EntityLink.tsx` mit Props `{ type, id?, slug?, name, newTab?, variant? }`
- **Unterstützte Entity-Typen**: `recipe`, `ingredient`, `material`, `event`, `location`, `session` (GroupSession), `game`, `blog`, `user`, `group`, `tag`
- **URL-Resolution-Tabelle** in `frontend/AGENTS.md` dokumentieren, welche Route pro Typ verwendet wird, und welche Identifier (ID vs. slug)
- **NewTab-Policy**:
  - `newTab` Default = kontextabhängig über einen optionalen Context-Provider `<EntityLinkContext value="list" | "detail">` oder explizit via Prop
  - Aus Listen-Komponenten (Grids, Cards, Tabellen) → `newTab=true`
  - Aus Detail-Seiten → `newTab=false`
  - Breadcrumbs und Header-User immer selber Tab
- **Migration bestehender Links**: Bekannte Stellen (User-Names, Tags, Ingredients in Rezepten, Locations in Events, Authors) werden auf `<EntityLink>` umgestellt
- **Bugfix**: Ingredient-Link in `RecipeDetailPage` nutzt korrekten `slug` statt `id`

## Capabilities

### New Capabilities
- `entity-link`: Einheitliches Link-System für die Navigation zwischen Content-Entities mit dokumentierter NewTab-Policy und URL-Resolution-Tabelle

### Modified Capabilities
- `shared-ui-components`: Ergänzt um Referenz auf die neue EntityLink-Komponente und die NewTab-Policy

## Impact

- **Frontend (neu)**: `frontend/src/components/shared/EntityLink.tsx`, zugehöriger Test, optional `EntityLinkContext.tsx`
- **Frontend (Migration)**: Betroffene Stellen (nicht erschöpfend):
  - `RecipeDetailPage.tsx` — Ingredient-Links, Author-Links
  - `RecipeCard` / Recipe-Listen — Author-Anzeige
  - `EventDetailPage` / `EventCard` — Location-Link, Organisator-Links
  - `SessionDetailPage` / Session-Cards — Author-Links, verlinkte Games
  - `GameDetailPage` / Game-Cards — Author-Links
  - `BlogDetailPage` / Blog-Cards — Author-Links
  - Tag-Rendering überall — klickbare Chips, die zum Search mit `tag_slugs=<slug>` führen
  - `MaterialList`, `IngredientList` — Namen als Links
  - User-Profil-Links in Comments, Emotionen, Registration-Listen
- **Dokumentation**: `frontend/AGENTS.md` — Sektion "Entity-Links & NewTab-Policy"
- **Keine Backend-Änderungen**
- **Keine Schema-Änderungen**
- **Keine Migrations**
