# Inspi – Agent-Regeln

## Projekt

- Monorepo mit Django-Ninja-Backend und React-Frontends.
- Die alte `idea`-App existiert nicht mehr. Verwende `content`, `session`, `blog`, `game`, `recipe` und `supply`.
- Feature-Anforderungen und Geschäftslogik gehören in OpenSpec, nicht in diese Datei.
- Keine Rückwärtskompatibilität nötig; das Projekt befindet sich in aktiver Entwicklung.

## Dauerhafte Regeln

- Code, Variablen, Funktionen und Kommentare: Englisch.
- UI-Texte: Deutsch mit echten Umlauten (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`).
- URLs: Englisch. Commit Messages: Englisch.
- Python-Befehle immer mit `uv run` ausführen.
- Keine `any`-Typen in TypeScript; Python-Funktionen erhalten Type Hints.
- Pydantic- und Zod-Schemas synchron halten.
- Session-Auth mit HTTP-only Cookies, kein JWT.
- Mobile-first ab 320px; URL-State für Filter, Suche und Pagination.
- Keine Klar-IPs speichern; keine `console.log`- oder `print`-Statements in Production-Code.

## Architektur

- `content` ist die abstrakte Basis für Content-Typen.
- `supply` ist die abstrakte Basis für Materialien; `Ingredient` ist ein eigenständiges Model.
- Große Django-Apps verwenden Packages für `models`, `api` und `schemas`; `__init__.py` re-exportiert öffentliche Namen.
- Food-UI gehört ausschließlich nach `frontend-food/`. Das Haupt-Frontend darf keine Food-Seiten, Hooks, Schemas, Stores, Routen oder Navigationslinks enthalten.

## Ablauf

1. OpenSpec und zuständige `AGENTS.md` lesen.
2. Backend-Model, Pydantic-Schema und API ändern.
3. Frontend-Zod-Schema und TanStack-Query-Hook synchronisieren.
4. UI mit vorhandenen Komponenten umsetzen.
5. Relevante Tests ausführen und Änderungen prüfen.

## Zuständigkeit

- Projektweite Regeln: diese Datei.
- Backend: `backend/AGENTS.md`.
- Haupt-Frontend: `frontend/AGENTS.md`.
- Food-Frontend: `frontend-food/AGENTS.md`.
