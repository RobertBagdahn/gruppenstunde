# AI Agent Configuration – Backend (Django Ninja)

> Dieses AGENTS.md enthält **backend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## ⚠️ WICHTIG: AGENTS.md als Living Document

Neue Backend-Anforderungen (Models, API-Endpunkte, Services, GCP-Config) MÜSSEN hier eingetragen werden.

## Arbeitsablauf – Backend-Änderungen

1. Model in `idea/models.py` anpassen
2. Migration erstellen: `uv run python manage.py makemigrations`
3. Pydantic Schema in `idea/schemas.py` aktualisieren
4. API-Endpunkt in `idea/api.py` anpassen
5. **Frontend Zod Schema** in `frontend/src/schemas/idea.ts` synchronisieren (→ siehe `../frontend/AGENTS.md`)
6. TanStack Query Hook in `frontend/src/api/ideas.ts` prüfen
7. Tests schreiben/aktualisieren

### Bei KI-Features (Vertex AI)
1. Logik in `idea/services/ai_service.py` implementieren
2. Vertex AI SDK verwenden (`google-cloud-aiplatform`), **keine API Keys**
3. Service Account / Application Default Credentials (ADC)
4. API-Endpunkt in `idea/api.py` unter `/api/ai/` Prefix

## Projektstruktur

```
idea/
  models.py           ← Django Models (Source of Truth) inkl. Embedding-Feld (pgvector)
  schemas.py          ← Pydantic Schemas (API Contracts)
  api.py              ← Django Ninja Routes
  choices.py          ← TextChoices Enums
  admin.py            ← Django Admin Config
  services/
    idea_service.py   ← Business Logic (CRUD, Status)
    ai_service.py     ← Vertex AI: Textverbesserung, Tags, Refurbish, Embeddings
    search_service.py ← Hybrid Search (Fulltext + pgvector + Filter)
    export_service.py ← Instagram-Export (3 Slides), PDF-Daten
    view_service.py   ← Bot-freies View-Logging
calendar/
  models.py           ← Calendar, CalendarEntry, CalendarCollaborator
  schemas.py
  api.py
core/
  api.py              ← Auth-Endpunkte (Login, Register, Logout, CSRF, /me/)
  middleware.py       ← Bot-Detection, Analytics
  storage.py          ← GCS Backend
  pagination.py
event/
  models.py           ← Event, BookingOption, Person, Registration, Participant
  choices.py          ← GenderChoices
  schemas.py          ← Pydantic Schemas
  api.py              ← event_router, person_router
  admin.py
  AGENTS.md           ← Modul-spezifische Doku
```

## Datenmodell-Kontext

### Idea (Kernmodell – ehemals Activity)
Die Idea ist das zentrale Objekt. Felder:
- **idea_type** (TextChoices: `idea`, `knowledge`, `recipe`) – Typ der Idee:
  - `idea` = Klassische Gruppenstunden-Idee (Standard)
  - `knowledge` = Wissensbeitrag (lang, kein Material)
  - `recipe` = Rezept (Material = Zutaten)
- **title** (str, required) – Titel der Idee
- **summary** (str) – Kurzbeschreibung
- **summary_long** (str) – Längere Zusammenfassung
- **description** (RichText) – Ausführliche Anleitung
- **costs_rating** (TextChoices) – 0€, <1€, 1-2€, >2€
- **execution_time** (TextChoices) – <30min bis >90min
- **preparation_time** (TextChoices) – keine bis >60min
- **difficulty** (TextChoices) – Einfach, Mittel, Schwer
- **status** (TextChoices) – Draft, Published, Archived, Review
- **image** (ImageField) – Titelbild (GCS)
- **like_score** (int) – Beliebtheit
- **view_count** (int) – Aufrufe (bot-frei)
- **embedding** (VectorField, 768 dim) – Text-Embedding für Similarity (pgvector)
- **scout_levels** (M2M) – Pfadfinder-Stufen
- **tags** (M2M → Tag) – Hierarchische Tags (ersetzt topics, activity_types, locations, times)
- **authors** (M2M → User) – Ersteller (Admin kann Autor ändern)

### Tag (Hierarchisch – ersetzt Topic/TagCategory)
- **name**, **slug**, **icon**, **sort_order**
- **parent** (FK → self, null=True) – Parent-Child Hierarchie
- **is_approved** (bool) – False für User-Vorschläge (Admin-Approval nötig)

### Comment (mit Moderation)
- verschachtelt (self-referential Parent-FK)
- **author_name** (CharField) – für anonyme Kommentare
- **user** (FK → User, null=True) – optional bei Login
- **status** – pending / approved / rejected
- Anonyme Kommentare müssen von Admin freigegeben werden

### IdeaView (Bot-freies Logging)
- **session_key**, **ip_hash** (SHA256, keine Klar-IP), **user_agent**
- Bot-Erkennung via User-Agent, Deduplizierung pro Session/24h
- DSGVO-konform

### UserPreferences
- **preferred_scout_level**, **preferred_group_size**, **preferred_difficulty**, **preferred_location**
- Werden als Default-Werte in Such-Filtern verwendet

### Calendar (Quartalskalender – kollaborativ)
- **Calendar** – Owner, Title
- **CalendarEntry** – Datum + Idea (optional) + Notizen
- **CalendarCollaborator** – User + Rolle (Editor/Viewer)
- Einladung per Link oder E-Mail

### Verwandte Models
- **MaterialItem** – Material pro Idea (quantity, name, unit). Bei `idea_type=knowledge` nicht verwendet. Bei `idea_type=recipe` sind MaterialItems = Zutaten.
- **Emotion** – Bewertung (love, happy, disappointed, complex), anonym möglich
- **IdeaOfTheWeek** – Featured Idea mit Datum
- **TagSuggestion** – Von Usern vorgeschlagene Tags

## API-Design

### Endpunkte
```
# Auth (Session-basiert, CSRF)
GET    /api/auth/csrf/                → CSRF Token holen
GET    /api/auth/me/                  → Aktueller User (oder 403)
POST   /api/auth/login/              → Login (E-Mail + Passwort → Session Cookie)
POST   /api/auth/register/           → Registrierung (E-Mail + 2× Passwort)
POST   /api/auth/logout/             → Logout (Session löschen)

# Ideas (CRUD)
GET    /api/ideas/                    → Liste (paginiert, filterbar)
GET    /api/ideas/{id}/               → Detail inkl. ähnliche Ideen
POST   /api/ideas/                    → Erstellen (anonym oder auth)
PATCH  /api/ideas/{id}/               → Aktualisieren (auth, eigene oder admin)
DELETE /api/ideas/{id}/               → Löschen (admin)

# Suche (Hybrid: Fulltext + pgvector + Filter)
GET    /api/ideas/search/?q=...       → Hybrid-Suche
GET    /api/ideas/autocomplete/?q=... → Typeahead
GET    /api/ideas/{id}/similar/       → Ähnliche Ideen (pgvector)

# Feedback (anonym möglich)
POST   /api/ideas/{id}/emotions/      → Emotion
GET    /api/ideas/{id}/comments/      → Freigegebene Kommentare
POST   /api/ideas/{id}/comments/      → Kommentar (moderiert)

# Tags (hierarchisch)
GET    /api/tags/                     → Baumstruktur
POST   /api/tags/suggest/             → Tag vorschlagen (auth)
POST   /api/tags/                     → Erstellen (admin)
PATCH  /api/tags/{id}/                → Bearbeiten (admin)

# KI (Vertex AI – Gemini 3.1 Flash Lite)
POST   /api/ai/improve-text/          → Text verbessern
POST   /api/ai/suggest-tags/          → Tags vorschlagen
POST   /api/ai/refurbish/             → Freitext → strukturierte Idee

# User & Profil
GET    /api/users/me/                 → Profil
PATCH  /api/users/me/                 → Profil aktualisieren
PATCH  /api/users/me/preferences/     → Filter-Präferenzen

# Kalender (kollaborativ)
GET    /api/calendars/                → Eigene Kalender
POST   /api/calendars/               → Erstellen
POST   /api/calendars/{id}/entries/   → Entry hinzufügen
POST   /api/calendars/{id}/invite/    → Collaborator einladen

# Admin
POST   /api/admin/idea-of-the-week/   → Featured Idea setzen
GET    /api/admin/moderation/          → Unfreigegebene Kommentare
POST   /api/admin/moderation/{id}/     → Freigeben/Ablehnen
GET    /api/admin/statistics/          → Nutzerstatistiken
POST   /api/admin/ideas/{id}/author/   → Autor ändern
POST   /api/admin/ideas/{id}/instagram/ → 3 Instagram-Slides generieren
```

### Filter-Parameter
```
?scout_level=1,2
?tag=3,5,12              # hierarchisch: Parent filtert auch Children
?location=indoor
?difficulty=easy
?costs_rating=0
?execution_time=30-60
?sort=relevant|newest|oldest|popular|random
?page=1&page_size=20
```

## Fehler-Behandlung

```python
from ninja.errors import HttpError

raise HttpError(404, "Idea not found")
raise HttpError(403, "Not authorized")
```

## Authentifizierung (Session-basiert)

### Architektur
- Django Sessions (HTTP-only Cookies)
- **API**: Django Ninja Endpunkte unter `/api/auth/` in `core/api.py`
- **Kein JWT** – Sessions sind einfacher und sicherer für Same-Origin SPAs

### Auth-Pattern
```python
# Geschützte Endpunkte
if not request.user.is_authenticated:
    raise HttpError(403, "Anmeldung erforderlich")

# Admin-only
if not request.user.is_authenticated or not request.user.is_staff:
    raise HttpError(403, "Nur Admins")
```

### Wichtige Dateien
| Was | Pfad |
|-----|------|
| Auth API | `core/api.py` |
| Django Settings | `inspi/settings/base.py` (CSRF, CORS) |

## SEO – Backend

### Slug-basierte URLs
- Jede Idea hat ein `slug` Feld (auto-generiert aus dem Titel via `django.utils.text.slugify`)
- **API**: `GET /api/ideas/by-slug/{slug}/` für Slug-basiertes Laden
- Slug ist unique, URL-freundlich, und SEO-optimiert

### Google-Indexierung
- **robots.txt**: Serviert von Django unter `/robots.txt` – erlaubt Crawling, sperrt `/admin/`, `/api/`, `/profile`, `/login`, `/register`
- **sitemap.xml**: Dynamisch generiert unter `/sitemap.xml` – enthält alle Published Ideas mit Slug-URLs und `lastmod` Datum

### Wichtige SEO-Dateien
| Was | Pfad |
|-----|------|
| Sitemap + Robots | `inspi/urls.py` (`sitemap_xml`, `robots_txt`) |
| Slug-API | `idea/api.py` (`get_idea_by_slug`) |

## GCP Kontext

- **Bilder**: GCS Bucket (`gs://gruppenstunde-media/`)
- **Datenbank**: Cloud SQL PostgreSQL 15 + pgvector Extension
- **AI**: Vertex AI Gemini 3.1 Flash Lite (Text + Embeddings) – ADC, keine API Keys
- **Secrets**: Google Secret Manager für DB-Passwort, Django Secret Key
- **Deployment**: App Engine Standard oder Cloud Run
- **Settings**: `inspi/settings/production.py` für GCP-spezifische Config

## Qualitäts-Checkliste – Backend

- [ ] Pydantic Schemas aktuell (→ Frontend Zod Schemas synchronisieren)
- [ ] Type Hints in allen Python Funktionen
- [ ] API-Endpunkte haben Pydantic Schema Responses
- [ ] Keine print Statements
- [ ] Kommentare haben Moderations-Status (pending für anonyme)
- [ ] Embeddings werden bei Idea-Änderungen aktualisiert
- [ ] Keine Klar-IPs gespeichert (DSGVO)
- [ ] "Idea" verwendet, nicht "Activity", "Gruppenstunde" oder "Heimabend"
- [ ] Idea-URLs verwenden Slug
