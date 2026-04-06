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
2. `google-genai` SDK verwenden (`genai.Client(vertexai=True, ...)`), **keine API Keys**
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
    nutri_service.py  ← Nutri-Score Berechnung, Nährwert-Aggregation
    price_service.py  ← Preiskaskade (Price → Portion → RecipeItem → Recipe → Meal → MealPlan)
    norm_person.py    ← Norm-Personen-Berechnung (Mifflin-St Jeor), Portionsskalierung
    recipe_checks.py  ← Rezept-Bewertungen (Sättigung, Preis, Gesundheit, Geschmack)
    hint_service.py   ← RecipeHint-Regelabgleich für Verbesserungsvorschläge
    ingredient_ai.py  ← KI-Autovervollständigung für Zutaten (Gemini Flash)
    shopping_service.py ← Einkaufslisten-Generierung aus MealPlan
planner/
  models.py           ← Planner (group FK, weekday, time), PlannerEntry (status), PlannerCollaborator, MealPlan, MealDay, Meal, MealItem
  schemas.py          ← PlannerOut, PlannerDetailOut, PlannerCreateIn, PlannerUpdateIn, PlannerEntryOut, PlannerEntryIn, PlannerEntryUpdateIn, CollaboratorOut, InviteIn
  api.py              ← planner_router (9 Endpunkte: CRUD + Entries + Invite, group-based access control)
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
profiles/
  models.py           ← UserProfile, UserPreference, UserGroup, GroupMembership
packinglist/
  models.py           ← PackingList (is_template, clone_for_user), PackingCategory, PackingItem (is_checked)
  schemas.py          ← Pydantic Schemas (Out, CreateIn, UpdateIn, SortOrderIn) inkl. is_template, is_checked, checked_count
  api.py              ← packing_list_router (17 Endpunkte: CRUD + Sort + Templates + Clone + Export + Reset)
  admin.py            ← Admin mit Inlines
  management/commands/seed_packing_lists.py  ← 12 Vorlagen-Packlisten seeden
recipe/
  models.py           ← Recipe, RecipeItem, RecipeHint, RecipeComment, RecipeEmotion, RecipeView
  choices.py          ← RecipeStatusChoices, RecipeTypeChoices, DifficultyChoices, etc.
  schemas.py          ← Pydantic Schemas (RecipeListOut, RecipeDetailOut, RecipeCreateIn, etc.)
  api.py              ← recipe_router (CRUD, Items, Comments, Emotions, Checks, Hints, NutriScore)
  admin.py            ← Admin mit RecipeItem-Inline
```

## Datenmodell-Kontext

### Idea (Kernmodell – ehemals Activity)
Die Idea ist das zentrale Objekt. Felder:
- **idea_type** (TextChoices: `idea`, `knowledge`) – Typ der Idee:
  - `idea` = Klassische Gruppenstunden-Idee (Standard)
  - `knowledge` = Wissensbeitrag (lang, kein Material)
- **title** (str, required) – Titel der Idee
- **summary** (str) – Kurzbeschreibung
- **summary_long** (str) – Längere Zusammenfassung
- **description** (TextField) – Ausführliche Anleitung (Markdown-Format, kein HTML)
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

### Planner (Heimabend-Planung – kollaborativ, gruppenbasiert)
- **Planner** – Owner, Title, group (FK → UserGroup, optional), weekday (0=Mon–6=Sun), time (TimeField)
- **PlannerEntry** – Datum + Idea (optional) + Notizen + status (planned/cancelled)
- **PlannerCollaborator** – User + Rolle (Editor/Viewer)
- Zugang: Owner, Collaborator, oder GroupMembership (Members = read, Admins = write)
- **MealPlan** – Essensplan (optional an Event gebunden)
- **MealDay** → **Meal** → **MealItem** (Rezept-Zuordnung)
- Einladung per Link oder E-Mail

### Verwandte Models (Idea-App)
- **MaterialItem** – Material pro Idea (quantity, name, unit). Bei `idea_type=knowledge` nicht verwendet.
- **Emotion** – Bewertung (love, happy, disappointed, complex), anonym möglich
- **IdeaOfTheWeek** – Featured Idea mit Datum
- **TagSuggestion** – Von Usern vorgeschlagene Tags

### Recipe (Eigenständiges Modul – `recipe` App)
- **Recipe** — Eigenständiges Rezept-Model (ehem. `idea_type=recipe`), gleiche Basis-Felder wie Idea + recipe_type, servings
- **RecipeItem** — Verknüpft Rezept mit Zutat über Portion (Cross-App FK zu `idea.Ingredient`, `idea.Portion`)
- **RecipeHint** — Regelbasierte Verbesserungsvorschläge
- **RecipeComment** — Kommentare mit Moderation
- **RecipeEmotion** — Reaktionen (anonym möglich)
- **RecipeView** — Bot-freies View-Logging (DSGVO-konform)

### Zutatendatenbank & MealPlan Models

→ Vollständige Details in `openspec/specs/ingredient-database/spec.md` und `openspec/specs/meal-plan/spec.md`

**Kurzübersicht der Models (in `idea` App):**
- **Ingredient** — Zutat (Stammdaten, Nährwerte pro 100g, Scores, Nutri-Score)
- **MeasuringUnit** — Messeinheit (g, ml, Scheibe, Esslöffel, etc.)
- **Portion** — Messbare Einheit einer Zutat (Ingredient + MeasuringUnit → weight_g)
- **Price** — Packungspreis (löst Preiskaskade aus via post_save Signal)
- **RetailSection** — Supermarkt-Abteilung (für Einkaufslisten)
- **NutritionalTag** — Allergen/Unverträglichkeit
- **IngredientAlias** — Alternative Suchbegriffe

**MealPlan Models (in `planner` App):**
- **MealPlan** — Essensplan (optional an Event gebunden, Norm-Portionen, Aktivitätsfaktor)
- **MealDay** → **Meal** → **MealItem** — Tage → Mahlzeiten → Rezept-Zuordnung (MealItem FK zu `recipe.Recipe`)

**Services (in `idea/services/`):**
- `nutri_service.py` — Nutri-Score Berechnung
- `price_service.py` — Preiskaskade
- `norm_person.py` — Portionsskalierung (Mifflin-St Jeor)
- `recipe_checks.py` — Rezept-Bewertungen (4 Dimensionen)
- `hint_service.py` — RecipeHint-Regelabgleich
- `ingredient_ai.py` — KI-Autovervollständigung (Gemini Flash)
- `shopping_service.py` — Einkaufslisten-Generierung

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

# Kalender / Planner (kollaborativ, gruppenbasiert)
GET    /api/planner/                      → Eigene + gruppen-sichtbare Planner
POST   /api/planner/                      → Erstellen (auth, mit group_id, weekday, time)
GET    /api/planner/{id}/                  → Detail (Entries, Collaborators, can_edit)
PATCH  /api/planner/{id}/                  → Aktualisieren (owner/group-admin/editor)
DELETE /api/planner/{id}/                  → Löschen (owner only)
POST   /api/planner/{id}/entries/          → Entry hinzufügen (editor+)
PATCH  /api/planner/{id}/entries/{eid}/    → Entry aktualisieren (editor+)
DELETE /api/planner/{id}/entries/{eid}/    → Entry löschen (editor+)
POST   /api/planner/{id}/invite/           → Collaborator einladen (owner/editor)

# Essensplan, Zutatendatenbank, Stammdaten, KI-Zutaten
# → Vollständige Endpunkt-Listen in openspec/specs/meal-plan/spec.md
#   und openspec/specs/ingredient-database/spec.md

# Rezepte (eigenständiges Modul)
GET    /api/recipes/                           → Paginierte Liste (filterbar)
GET    /api/recipes/{id}/                       → Detail per ID
GET    /api/recipes/by-slug/{slug}/             → Detail per Slug (SEO)
POST   /api/recipes/                           → Erstellen (auth)
PATCH  /api/recipes/{id}/                       → Aktualisieren (auth)
DELETE /api/recipes/{id}/                       → Löschen (auth)
GET    /api/recipes/{id}/recipe-items/          → Zutaten auflisten
POST   /api/recipes/{id}/recipe-items/          → Zutat hinzufügen
PATCH  /api/recipes/{id}/recipe-items/{iid}/    → Zutat aktualisieren
DELETE /api/recipes/{id}/recipe-items/{iid}/    → Zutat entfernen
GET    /api/recipes/{id}/comments/              → Kommentare
POST   /api/recipes/{id}/comments/              → Kommentar erstellen
POST   /api/recipes/{id}/emotions/              → Emotion setzen/toggeln
GET    /api/recipes/{id}/recipe-checks/         → 4-Dimensionen-Bewertung
GET    /api/recipes/{id}/recipe-hints/          → Regelbasierte Hinweise
GET    /api/recipes/{id}/nutri-score/           → Detaillierter Nutri-Score
POST   /api/recipes/{id}/image/                 → Bild hochladen

# Admin
POST   /api/admin/idea-of-the-week/   → Featured Idea setzen
GET    /api/admin/moderation/          → Unfreigegebene Kommentare
POST   /api/admin/moderation/{id}/     → Freigeben/Ablehnen
GET    /api/admin/statistics/          → Nutzerstatistiken
POST   /api/admin/ideas/{id}/author/   → Autor ändern
POST   /api/admin/ideas/{id}/instagram/ → 3 Instagram-Slides generieren

# Packlisten (CRUD + Sort + Templates + Export)
GET    /api/packing-lists/                                        → Eigene Packlisten (owner + group-admin, excl. templates)
GET    /api/packing-lists/templates/                               → Vorlagen auflisten (öffentlich)
POST   /api/packing-lists/                                        → Erstellen
GET    /api/packing-lists/{id}/                                   → Detail (öffentlich lesbar, can_edit Flag)
PATCH  /api/packing-lists/{id}/                                   → Aktualisieren (owner/group-admin)
DELETE /api/packing-lists/{id}/                                   → Löschen (owner/staff)
POST   /api/packing-lists/{id}/clone/                             → Packliste klonen (auth, deep copy)
GET    /api/packing-lists/{id}/export/text/                        → Text-Export (öffentlich)
POST   /api/packing-lists/{id}/reset-checks/                      → Alle is_checked zurücksetzen (auth + edit)
POST   /api/packing-lists/{id}/categories/                        → Kategorie hinzufügen
PATCH  /api/packing-lists/{id}/categories/{cat_id}/               → Kategorie bearbeiten
DELETE /api/packing-lists/{id}/categories/{cat_id}/               → Kategorie löschen
POST   /api/packing-lists/{id}/categories/sort/                   → Kategorien sortieren
POST   /api/packing-lists/{id}/categories/{cat_id}/items/         → Item hinzufügen
PATCH  /api/packing-lists/{id}/categories/{cat_id}/items/{item_id}/ → Item bearbeiten (inkl. is_checked)
DELETE /api/packing-lists/{id}/categories/{cat_id}/items/{item_id}/ → Item löschen
POST   /api/packing-lists/{id}/categories/{cat_id}/items/sort/    → Items sortieren
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
- **AI**: Vertex AI Gemini Flash (Text + Embeddings + Zutaten-Autovervollständigung) – ADC, keine API Keys
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
- [ ] Freitext-Felder (description, summary, etc.) verwenden Markdown, kein HTML
- [ ] Preiskaskade wird bei Price-Änderungen korrekt ausgelöst (Signal)
- [ ] Nutri-Score wird bei Nährwert-Änderungen neu berechnet
- [ ] RecipeItem-Änderungen aktualisieren Rezept-Aggregate (Preis, Nährwerte)
