## Context

Die `idea` App war das ursprüngliche Kernmodul der Plattform mit einem einzigen `Idea`-Model und drei Typen (`idea`, `knowledge`, `recipe`). Im Content/Supply-Refactor wurde dieses Model in separate Content-Typen aufgeteilt: `GroupSession`, `Blog`, `Game`, `Recipe`. Die `idea/` App-Verzeichnisse und Models sind entfernt, aber Referenzen auf das alte Naming sind in 15+ Dateien verblieben.

**Betroffene Bereiche:**
1. **Admin-API** (Backend): Schemas und Feldnamen verwenden durchgängig "idea" (`TopIdeaOut`, `total_ideas`, `idea_type`)
2. **Profil-API** (Backend): Aliases `MyIdeaOut = MyContentOut` und Endpoint `/me/ideas/`
3. **Frontend-Schemas**: `idea_type` Felder in Zod-Schemas
4. **Frontend-Pages**: Variable-Namen, Komponentennamen, Hook-Aufrufe

## Goals / Non-Goals

**Goals:**
- Alle "idea"-Referenzen in funktionalem Code durch korrekte "content"-Terminologie ersetzen
- Backend-Pydantic-Schemas und Frontend-Zod-Schemas synchron halten
- Legacy-Redirects für alte URLs beibehalten

**Non-Goals:**
- Umbenennung der `IdeaOfTheWeekPage` (das ist ein Feature-Name, kein Legacy-Artefakt)
- Änderung an Migrations-Kommentaren oder Git-History
- Änderung an archivierten OpenSpec-Changes

## Decisions

### 1. Admin-API Feldnamen

**Entscheidung**: `idea_type` -> `content_type`, `total_ideas` -> `total_content`, `top_ideas` -> `top_content`. Dies ist ein **BREAKING** API-Change.

**Rationale**: Da keine Rückwärtskompatibilität nötig ist, kann direkt umbenannt werden. Frontend und Backend werden gleichzeitig angepasst.

### 2. Profil-API Endpoint

**Entscheidung**: `/api/profile/me/ideas/` -> `/api/profile/me/content/`. Legacy-Aliases (`MyIdeaOut`) werden entfernt, da `MyContentOut` bereits existiert.

### 3. IdeaOfTheWeek bleibt

**Entscheidung**: Die `IdeaOfTheWeekPage` und zugehörige API (`/api/admin/idea-of-the-week/`) behalten ihren Namen. "Idee der Woche" ist ein Feature-Name, kein Artefakt der alten Architektur.

## Risks / Trade-offs

- **[Risk]** Vergessene Referenzen → Mitigation: Globale Suche nach `[Ii]dea` (ausser IdeaOfTheWeek, Kommentare, Migration-Files)
- **[Risk]** Frontend/Backend Schema-Desync → Mitigation: Zod und Pydantic gleichzeitig ändern
