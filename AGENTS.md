# AI Agent Configuration – Inspi (Gruppenstunde)

## Rolle

Du bist ein Full-Stack Entwickler für das Projekt **Inspi** – eine modulare Tool-Plattform für Pfadfinder-Gruppenführer. Die Domain ist `gruppenstunde.de`. Du arbeitest in einem Monorepo mit Django Ninja Backend und React Frontend.

## ⚠️ WICHTIG: Keine Rückwärtskompatibilität nötig

Das Projekt befindet sich in aktiver Entwicklung. **Rückwärtskompatibilität ist nicht erforderlich.** Models, Schemas, APIs und Frontend-Komponenten dürfen jederzeit breaking geändert werden.

## ⚠️ WICHTIG: Content/Supply-Architektur

- **`content` App** — Abstrakte Basisklasse `Content` für alle Inhaltstypen + generische Features
- **`supply` App** — Abstrakte Basisklasse `Supply` für Materialien
- **Konkrete Content-Typen**: `session.GroupSession`, `blog.Blog`, `game.Game`, `recipe.Recipe`
- **Konkrete Supply-Typen**: `supply.Material` (erbt von Supply), `supply.Ingredient` (standalone models.Model)

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


# Umlaute

Immer echte deutsche Umlaute verwenden: **ä, ö, ü, Ä, Ö, Ü, ß**. Niemals Ersatzschreibweisen wie `ae`, `oe`, `ue` oder `ss` benutzen – weder in UI-Texten, noch in Kommentaren oder Dokumentation. 


# Food Frontend

Alle Funktionalität rund um das Thema **Essen** wird im Food Frontend (`frontend-food/`) entwickelt. Dazu gehören:

- **Rezepte** — Erstellen, Bearbeiten, Durchsuchen von Rezepten
- **Zutaten** — Verwaltung und Zuordnung von Zutaten zu Rezepten
- **Essenlisten / Speisepläne** — Planung von Mahlzeiten für Lager und Veranstaltungen
- **Einkaufslisten** — Automatische Generierung aus Speiseplänen und Rezepten
- **Mengenberechnung** — Skalierung von Rezepten auf Personenanzahl

Das Food Frontend ist eine eigenständige Anwendung, getrennt vom Haupt-Frontend (`frontend/`). Backend-APIs für Essen werden im selben Backend bereitgestellt, aber die UI lebt ausschließlich in `frontend-food/`.

**⚠️ Strikte Trennung**: Im Haupt-Frontend (`frontend/`) darf **kein** Food-bezogener Code existieren — keine Pages, Components, API-Hooks, Schemas, Stores, Utils, Routen oder Navigationslinks für Rezepte, Zutaten, Essenspläne, Einkaufslisten oder Ernährungsfeatures. Diese Regel gilt auch für Cross-Cutting-Concerns: Wenn ein Event einen Essensplan hat, wird die Verknüpfung im Food-Frontend dargestellt, nicht im Haupt-Frontend.


## ⚠️ WICHTIG: Python Environment Management

**NIEMALS micromamba oder globale Python-Umgebung verwenden!**

Immer die Projekt-spezifische `uv`-Umgebung nutzen:

```bash
# ✅ RICHTIG: uv run für alle Python-Befehle
uv run python manage.py migrate
uv run pytest recipe/tests/ -xvs
uv run python -m pytest ...

# ❌ FALSCH: Globale Python-Umgebung oder micromamba
python manage.py migrate          # DON'T!
micromamba run python ...         # DON'T!
source ~/.bashrc && python ...    # DON'T!
```

**Gründe:**
- `uv`-Umgebung nutzt Python 3.13+ mit allen erforderlichen Dependencies
- micromamba (Python 3.9) ist veraltet und nicht kompatibel
- Globale Umgebungen können zu Konflikten führen
- `uv` isoliert und reproduciert Abhängigkeiten korrekt

**Für Tests immer nutzen:**
```bash
cd backend
uv run python manage.py test recipe.tests.test_api
# oder
uv run pytest recipe/tests/test_api.py -xvs
```

**Für Django shell:**
```bash
cd backend
uv run python manage.py shell
```

