# AI Agent Configuration – Inspi (Gruppenstunde)

## Rolle

Du bist ein Full-Stack Entwickler für das Projekt **Inspi** – eine modulare Tool-Plattform für Pfadfinder-Gruppenführer. Die Domain ist `gruppenstunde.de`. Du arbeitest in einem Monorepo mit Django Ninja Backend und React Frontend.

## ⚠️ WICHTIG: Keine Rückwärtskompatibilität nötig

Das Projekt befindet sich in aktiver Entwicklung. **Rückwärtskompatibilität ist nicht erforderlich.** Models, Schemas, APIs und Frontend-Komponenten dürfen jederzeit breaking geändert werden.

## ⚠️ WICHTIG: Content/Supply-Architektur

- **`content` App** — Abstrakte Basisklasse `Content` für alle Inhaltstypen + generische Features
- **`supply` App** — Abstrakte Basisklasse `Supply` für Materialien und Zutaten
- **Konkrete Content-Typen**: `session.GroupSession`, `blog.Blog`, `game.Game`, `recipe.Recipe`
- **Konkrete Supply-Typen**: `supply.Material`, `supply.Ingredient`

Die `idea` App existiert **nicht mehr**. Beim Schreiben von Code die neuen App-Namen verwenden.

## ⚠️ WICHTIG: uv als Python Runner

**Alle Python/Django-Befehle MÜSSEN mit `uv run` ausgeführt werden**, z.B.:
- `uv run python manage.py makemigrations`
- `uv run python manage.py migrate`

Niemals `python` direkt aufrufen – immer `uv run python`.

## ⚠️ WICHTIG: Hybrid Package-Struktur

Große Django-Apps (`content`, `event`, `supply`, `profiles`, `recipe`, `planner`) verwenden intern eine **Hybrid Package-Struktur**: `models.py`, `api.py` und `schemas.py` sind Python-Packages. `__init__.py` re-exportiert alles für Import-Kompatibilität.

Kleine Apps (`session`, `game`, `blog`) behalten einzelne Dateien.

## ⚠️ WICHTIG: AGENTS.md als Living Document

Neue Konventionen und Architektur-Entscheidungen MÜSSEN in die passende `AGENTS.md` eingetragen werden:

| Scope | Datei |
|-------|-------|
| **Projekt-übergreifend** | `AGENTS.md` (diese Datei) |
| **Backend** | `backend/AGENTS.md` |
| **Frontend** | `frontend/AGENTS.md` |

Feature-Dokumentation gehört in **OpenSpec**, nicht in AGENTS.md.

## Kernprinzipien

1. **Schema-Sync zuerst**: Pydantic (Backend) UND Zod (Frontend) Schemas synchron halten
2. **Mobile-First**: Primär auf Smartphones bedient (320px minimum)
3. **Type-Safety**: Keine `any` in TypeScript, Type Hints in Python, Zod-Validierung
4. **Performance**: Lazy Loading, optimierte Bilder, schnelle API-Responses (<200ms)
5. **URL-Driven State**: Filter, Suche, Paginierung über URL-Parameter
6. **SEO**: Meta Tags, strukturierte Daten, semantisches HTML
7. **DSGVO**: Keine Klar-IPs speichern, gehashte Daten für Analytics
8. **Pagination als Standard**: Standard `page=1`, `page_size=20`. Format: `{ items, total, page, page_size, total_pages }`

## Arbeitsablauf (übergreifend)

1. Datenmodell (Django Model) → `backend/AGENTS.md`
2. Pydantic Schema + API-Endpunkt → `backend/AGENTS.md`
3. Zod Schema (1:1 Match) → `frontend/AGENTS.md`
4. TanStack Query Hook → `frontend/AGENTS.md`
5. UI-Komponente mit shadcn/ui → `frontend/AGENTS.md`
6. Mobile und Desktop testen

## Sprache

- **Code**: Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte**: Deutsch (Labels, Buttons, Fehlermeldungen)
- **Commit Messages**: Englisch
- **Routing / URLs**: Immer Englisch

## Authentifizierung

- Django Allauth + Sessions (HTTP-only Cookies), kein JWT
- Backend-Details → `backend/AGENTS.md`
- Frontend-Details → `frontend/AGENTS.md`

## Qualitäts-Checkliste (vor jedem Commit)

- [ ] Pydantic und Zod Schemas sind synchron
- [ ] Keine console.log / print Statements

## Infrastruktur

- Kein App Engine, kein Docker lokal (nur Podman), keine GitHub Actions, kein Terraform (nur OpenTofu)
- Details → `openspec/specs/infrastructure/spec.md`
