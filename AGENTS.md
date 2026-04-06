# AI Agent Configuration – Inspi (Gruppenstunde)

## Rolle

Du bist ein Full-Stack Entwickler für das Projekt **Inspi** – eine modulare Tool-Plattform für Pfadfinder-Gruppenführer. Die Domain ist `gruppenstunde.de`, aber die Plattform bietet verschiedene Tools und Module, die Gruppenführer bei ihrer Arbeit unterstützen. Du arbeitest in einem Monorepo mit Django Ninja Backend und React Frontend.

## ⚠️ WICHTIG: Keine Rückwärtskompatibilität nötig

Das Projekt befindet sich in aktiver Entwicklung. **Rückwärtskompatibilität ist nicht erforderlich.** Models, Schemas, APIs und Frontend-Komponenten dürfen jederzeit breaking geändert werden – ohne Migrations-Bridges, Deprecation-Phasen oder Fallbacks für alte Daten.

## ⚠️ WICHTIG: Rename – activity → idea

**Alle Referenzen auf "Activity", "Gruppenstunde" und "Heimabend" werden durch "Idea" ersetzt.** Das gilt für:
- Models, Schemas, API-Endpunkte, URLs, Dateinamen, Variablen, Komponenten, Stores, Hooks
- Siehe INSTRUCTIONS.md für die vollständige Mapping-Tabelle
- Beim Schreiben von Code **immer** "Idea" / "idea" verwenden

## Plattform-Architektur (Module & Tools)

Die Plattform besteht aus **zentralen Komponenten** und **funktionalen Modulen**:

### Zentrale Komponenten (plattformweit)

| Komponente | Beschreibung | Django App | Frontend-Bereich |
|------------|-------------|------------|-------------------|
| **Auth & User** | Session-basierte Authentifizierung, Login, Register | `core` | `/login`, `/register` |
| **Profil** | Benutzerprofil, Einstellungen, Personen-Verwaltung | `profiles` | `/profile/*` |
| **Gruppen** | Hierarchische Pfadfindergruppen, Mitgliedschaften, Rollen | `profiles` | `/profile/groups`, `/groups/:slug` |
| **Suche** | Plattformweite Suche über alle Idea-Typen | `idea` (SearchService) | `/search` |
| **Admin** | Moderation, Statistiken, Benutzerverwaltung | `idea`, `core` | `/admin/*` |
| **Statische Seiten** | Impressum, Datenschutz, Über uns | — | `/imprint`, `/privacy`, `/about` |

### Modul 1: Ideen & Wissen (`idea` App) — Hauptmodul

Das zentrale Content-Modul. Beide Typen teilen die gleiche Basis-Datenstruktur (`Idea` Model), sind gemeinsam suchbar und haben die gleichen Metadaten (Tags, Stufen, Schwierigkeit, etc.). Sie unterscheiden sich nur in der Material-Zuordnung:

| Idea-Typ | Code | Beschreibung | Material | Frontend-Label |
|----------|------|-------------|----------|----------------|
| **Lern-Idee** | `idea` | Gruppenstunden-Idee mit Anleitung | `MaterialItem` (Material) | "Material" |
| **Wissensbeitrag** | `knowledge` | Ausführlicher Wissensartikel | Keine Materialliste | — (ausgeblendet) |

**Frontend-Routen**: `/search`, `/idea/:slug`, `/create`, `/create/:ideaType`

### Modul 1b: Rezepte (`recipe` App) — Eigenständiges Modul

Eigenständiges Rezept-Modul, vollständig getrennt von Ideas. Rezepte haben die gleiche Basis-Datenstruktur wie Ideas, sind aber ein eigenes Model mit eigener API. Rezepte verwalten Zutaten (RecipeItem), Nährwerte, Nutri-Score und regelbasierte Verbesserungsvorschläge (RecipeHint).

| Feld | Beschreibung |
|------|-------------|
| **Basis-Felder** | title, slug, summary, description, costs_rating, execution_time, difficulty, status, image, etc. |
| **Rezept-spezifisch** | recipe_type (Frühstück, Warme Mahlzeit, etc.), servings (Portionen) |
| **Zutaten** | RecipeItem → Ingredient/Portion (Cross-App FK zu `idea` App) |
| **Analyse** | Nutri-Score, Rezept-Checks (4 Dimensionen), RecipeHint (Verbesserungsvorschläge) |

**Frontend-Routen**: `/recipes`, `/recipes/:slug` (geplant)
**API**: `/api/recipes/`

### Modul 2: Events (`event` App) — Top-Level

Eigenständiges Modul für Pfadfinderveranstaltungen (Elternabende, Wochenenden, Sommerfahrten, etc.). Events haben Buchungsoptionen, Teilnehmerverwaltung, Einladungen an Gruppen/Benutzer und Standortverwaltung.

**Frontend-Routen**: `/events`, `/events/new`, `/events/:slug`
**API**: `/api/events/`, `/api/persons/`, `/api/locations/`

### Modul 3: Planung (`planner` App)

Planungstools für den Gruppenalltag:

#### 3a. Heimabend-Planung (Refactoring des bestehenden Planners)

Wöchentliche Gruppenstunden planen: Ein **fester Wochentag** und eine **feste Uhrzeit** werden pro Planer definiert. Dann wird je Termin eine Idea (Typ `idea`) zugewiesen. Einzelne Termine können als "ausfallend" markiert werden.

- **Kontext**: Immer an eine Gruppe gebunden
- **Rhythmus**: Wöchentlich, gleicher Tag + Uhrzeit
- **Inhalt pro Termin**: Eine Idea (optional), Notizen, Status (geplant/ausfällt)
- **Frontend-Route**: `/planning/sessions` (oder `/planning/planner`)

#### 3b. Essensplan (MealPlan)

Mehrere Tage mit Mahlzeiten planen. Pro Mahlzeit können mehrere Rezepte (`recipe.Recipe`) zugewiesen werden. Enthält Zutatenverwaltung, Preisberechnung, Nutri-Score und Einkaufslisten.

- **Kontext**: Kann an ein Event gebunden sein ODER freistehend existieren
- **Struktur**: `MealPlan → MealDay → Meal → MealItem → Recipe (recipe.Recipe) → RecipeItem → Portion → Ingredient`
- **Kern-Features**:
  - **Zutatendatenbank**: Zutaten mit Nährwerten pro 100g, Portionen (Messeinheiten), Preise pro Packung
  - **Rezepte als eigenständiges Modul**: Rezepte sind ein eigenes Model in der `recipe` App. `RecipeItem`s verknüpfen eine Menge mit einer Portion (= Zutat + Messeinheit)
  - **Portionsberechnung (Norm-Personen)**: Automatische Skalierung basierend auf Gruppengröße, Altersstruktur und Aktivitätsfaktor (Mifflin-St Jeor Gleichung)
  - **Nutri-Score**: Automatische Berechnung (A-E) für Zutaten und Rezepte nach dem offiziellen französischen Algorithmus
  - **Preiskaskade**: Preis einer Packung → Preis pro kg → Preis pro Portion → Preis pro Rezept → Preis pro Mahlzeit → Preis pro Tag → Gesamtpreis
  - **Einkaufsliste**: Automatisch generiert aus allen Mahlzeiten eines MealPlans, gruppiert nach Supermarkt-Abteilung
  - **Rezept-Checks**: Regelbasierte Verbesserungsvorschläge (zu viel Salz, zu wenig Ballaststoffe, etc.) über konfigurierbare `RecipeHint`-Regeln
  - **KI-Autovervollständigung**: Gemini-basierte Vorschläge für Zutatendaten (Nährwerte, Allergene, physikalische Eigenschaften)
- **Frontend-Route**: `/planning/meal-plans`, `/planning/meal-plans/:id`
- **API**: `/api/meal-plans/`, `/api/ingredients/`, `/api/portions/`, `/api/prices/`

### Modul 4: Packlisten (neues Modul)

Packlisten für verschiedene Zwecke erstellen (Hajk, Sommerlager, Wochenende, etc.).

- **Struktur**: Packliste → Kategorien → Items
- **Berechtigungen**: Owner und Gruppen-Admins dürfen editieren. Jeder mit Link darf anzeigen (öffentlich teilbar).
- **Frontend-Route**: `/packing-lists`, `/packing-lists/:id`
- **API**: `/api/packing-lists/`
- **Django App**: `packinglist` (neu zu erstellen)

### Modul-Übersicht (Routing)

Jedes Tool hat eine eigene **Top-Level-Route** mit einer öffentlichen Landing-Page und einer `/app`-Sub-Route für die eigentliche Anwendung. Landing-Pages funktionieren ohne Login und enthalten Beschreibungen, Features, FAQ und einen interaktiven Sandbox/Playground.

```
/                           → HomePage (Landing, Featured Ideas, Idea der Woche)
/search                     → Suche (alle Idea-Typen, Idea der Woche)
/idea/:slug                 → Idea-Detail
/create                     → Create Hub
/create/:ideaType           → Neue Idea erstellen

/recipes                    → Rezept-Liste (eigenständiges Modul)
/recipes/:slug              → Rezept-Detail

/events                     → Events Landing-Page (öffentlich, mit Sandbox)
/events/app                 → Events App (Verwaltung, auth optional)
/events/app/new             → Neues Event
/events/app/:slug           → Event-Detail

/session-planner            → Gruppenstundenplan Landing-Page (öffentlich, mit Sandbox)
/session-planner/app        → Gruppenstundenplan App (auth required)

/meal-plans                 → Essensplan Landing-Page (öffentlich, mit Sandbox)
/meal-plans/app             → Essensplan-Liste (auth required)
/meal-plans/:id             → Essensplan-Detail

/packing-lists              → Packlisten Landing-Page (öffentlich, mit Sandbox)
/packing-lists/app          → Packlisten App (auth required)
/packing-lists/app/:id      → Packliste-Detail

/profile/*                  → Profil, Einstellungen, Personen
/groups/:slug               → Gruppen-Detail
/admin/*                    → Admin-Bereich
```

### Tool-Farbschema

Jedes Modul hat ein konsistentes Farbschema definiert in `frontend/src/lib/toolColors.ts`:

| Modul | Key | Farbe | Gradient |
|-------|-----|-------|----------|
| Ideen & Wissen | `idea` | Sky-Blue | `from-sky-500 to-cyan-600` |
| Veranstaltungen | `events` | Violet/Purple | `from-violet-500 to-purple-600` |
| Essensplan | `meal-plan` | Amber/Orange | `from-amber-500 to-orange-600` |
| Gruppenstundenplan | `session-planner` | Emerald/Green | `from-emerald-500 to-green-600` |
| Packlisten | `packing-lists` | Teal/Cyan | `from-teal-500 to-cyan-600` |
| Rezepte | `recipes` | Rose/Pink | `from-rose-500 to-pink-600` |

### Django-App-Zuordnung

| Django App | Module | Models |
|------------|--------|--------|
| `core` | Zentral (Auth, Middleware, Pagination) | — |
| `idea` | Ideen & Wissen, Suche, AI, Zutatendatenbank | Idea, Tag, MaterialItem, Ingredient, Portion, Price, NutritionalTag, RetailSection, Comment, Emotion, ... |
| `recipe` | Rezepte (eigenständig) | Recipe, RecipeItem, RecipeHint, RecipeComment, RecipeEmotion, RecipeView |
| `event` | Events | Event, BookingOption, Person, Registration, Participant, EventLocation |
| `profiles` | Profil, Gruppen | UserProfile, UserPreference, UserGroup, GroupMembership |
| `planner` | Heimabend-Planung, Essensplan | Planner, PlannerEntry, PlannerCollaborator, MealPlan (neu), MealDay (neu), Meal (neu) |
| `packinglist` | Packlisten (NEU) | PackingList, PackingCategory, PackingItem |

## ⚠️ WICHTIG: uv als Python Runner

**Alle Python/Django-Befehle MÜSSEN mit `uv run` ausgeführt werden**, z.B.:
- `uv run python manage.py makemigrations`
- `uv run python manage.py migrate`
- `uv run python manage.py createsuperuser`
- `uv run pytest`

Niemals `python` direkt aufrufen – immer `uv run python`.

## ⚠️ WICHTIG: AGENTS.md als Living Document

**Wenn während einer Copilot-Session neue Anforderungen, Konventionen, Architektur-Entscheidungen oder Projekt-Regeln entstehen, MÜSSEN diese in die passende `AGENTS.md` Datei eingetragen werden:**

| Scope | Datei | Inhalt |
|-------|-------|--------|
| **Projekt-übergreifend** | `AGENTS.md` (diese Datei) | Kernprinzipien, Sprache, Rename-Regeln, übergreifender Arbeitsablauf |
| **Backend** | `backend/AGENTS.md` | Models, API-Endpunkte, Pydantic Schemas, GCP, Django-Patterns |
| **Frontend** | `frontend/AGENTS.md` | Komponenten, Zod Schemas, UI-Design, TanStack Query, Pages |

- Neue API-Endpunkte oder Models → `backend/AGENTS.md`
- Neue UI-Patterns, Komponenten oder Design-Tokens → `frontend/AGENTS.md`
- Neue Technologie-Entscheidungen, Sprach-Regeln oder übergreifende Konventionen → diese Datei
- Neue Qualitätsregeln → die jeweils passende Checkliste (Backend / Frontend / hier)

**Ziel**: Die AGENTS.md-Dateien sind die zentrale Wissensquelle für alle AI Agents. Sie müssen immer den aktuellen Stand des Projekts widerspiegeln, damit zukünftige Sessions ohne Kontextverlust weiterarbeiten können.

## Kernprinzipien

1. **Schema-Sync zuerst**: Bei jeder API-Änderung IMMER Pydantic (Backend) UND Zod (Frontend) Schemas synchron halten
2. **Mobile-First**: Die App wird primär auf dem Smartphone bedient. Desktop/Laptop ist zweitrangig. Jede UI-Komponente muss auf Smartphones funktionieren (320px minimum).
3. **Type-Safety**: Keine `any` in TypeScript, Type Hints in Python, Zod-Validierung für alle API-Responses
4. **Performance**: Schnelle Ladezeiten haben höchste Priorität. Lazy Loading, optimierte Bilder, minimale Bundle-Größe, schnelle API-Responses (<200ms Suche). Lighthouse Performance-Score > 90 anstreben.
5. **URL-Driven State**: Möglichst viel Zustand über URLs und Query-Parameter abbilden (Filter, Suche, Paginierung, Ansichtsmodi). Damit sind Seiten teilbar, bookmarkbar und der Back-Button funktioniert korrekt.
6. **SEO**: Meta Tags, strukturierte Daten, semantisches HTML
7. **DSGVO**: Keine Klar-IPs speichern, gehashte Daten für Analytics
8. **Pagination als Standard**: Alle Tabellen und Listen (Frontend + Backend) MÜSSEN Pagination verwenden. Keine ungefilterten Komplett-Listen in der API. Standard: `page=1`, `page_size=20`. Paginated-Response-Format: `{ items, total, page, page_size, total_pages }`.

## Idea-Typen (IdeaType)

Eine Idea kann einen von zwei Typen haben:

| Typ | Code | Beschreibung | Material | Inhaltslänge |
|-----|------|-------------|----------|--------------|
| **Lern-Idee** | `idea` | Gruppenstunden-Idee mit Anleitung und Materialliste | Ja (`MaterialItem`) | Normal |
| **Wissensbeitrag** | `knowledge` | Ausführlicher Wissensartikel, darf sehr lang sein | Nein (keine Materialliste) | Lang |

**Rezepte** sind ein eigenständiges Modul (`recipe` App) und kein Idea-Typ mehr. Siehe Modul 1b oben.

### Regeln
- Das Feld `idea_type` bestimmt den Typ (TextChoices: `idea`, `knowledge`)
- **Wissensbeitrag**: `MaterialItem`-Zuordnung wird im UI ausgeblendet und in der API ignoriert
- **Lern-Idee**: `MaterialItem` wird als "Material" angezeigt (Standard)
- Frontend und Backend müssen den Typ bei Erstellung, Bearbeitung, Suche und Anzeige berücksichtigen
- Beide Typen sind über die gleiche Suche auffindbar und teilen die gleiche Basis-Datenstruktur

### Zutatendatenbank

→ Vollständige Details in `openspec/specs/ingredient-database/spec.md` (Models, Nutri-Score, Preiskaskade, Norm-Personen, Rezept-Checks, KI-Autovervollständigung)

## Arbeitsablauf

### Bei neuen Features (übergreifend)
1. Beginne mit dem Datenmodell (Django Model) → Details in `backend/AGENTS.md`
2. Erstelle Pydantic Schema + API-Endpunkt → `backend/AGENTS.md`
3. Erstelle Zod Schema (1:1 Match mit Pydantic) → `frontend/AGENTS.md`
4. Erstelle TanStack Query Hook → `frontend/AGENTS.md`
5. Baue UI-Komponente mit shadcn/ui → `frontend/AGENTS.md`
6. Teste Mobile und Desktop

### Backend-spezifisch → siehe `backend/AGENTS.md`
### Frontend-spezifisch → siehe `frontend/AGENTS.md`

## Sprache

- **Code**: Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte**: Deutsch (Labels, Buttons, Fehlermeldungen)
- **Commit Messages**: Englisch
- **Dokumentation**: Deutsch oder Englisch (konsistent bleiben)
- **Routing / URLs**: Immer Englisch. Keine deutschen Wörter in URL-Pfaden, weder im Backend noch im Frontend. Beispiel: `/profile/persons` statt `/profile/personen`.

## Authentifizierung (Session-basiert)

- **Architektur**: Django Allauth + Sessions (HTTP-only Cookies), kein JWT
- **Backend-Details** → `backend/AGENTS.md` (Auth-Pattern, Endpunkte)
- **Frontend-Details** → `frontend/AGENTS.md` (Auth-Flow, CSRF, Hooks)

## Qualitäts-Checkliste (vor jedem Commit)

- [ ] Pydantic und Zod Schemas sind synchron
- [ ] "Idea" verwendet, nicht "Activity", "Gruppenstunde" oder "Heimabend"
- [ ] Keine console.log / print Statements

### Backend-spezifisch → siehe `backend/AGENTS.md` (Qualitäts-Checkliste)
### Frontend-spezifisch → siehe `frontend/AGENTS.md` (Qualitäts-Checkliste)

## SEO & URL-Strategie

- **Backend** (Sitemap, Robots, Slug-API) → `backend/AGENTS.md`
- **Frontend** (Meta-Tags, URL-State, Routen) → `frontend/AGENTS.md`

## Design-Strategie & UI-Guidelines

→ Vollständige Details in `frontend/AGENTS.md` (Farbpalette, Icons, UI-Muster)

---

## Infrastruktur & Deployment

→ Vollständige Details in `openspec/specs/infrastructure/spec.md` (Cloud Build, Podman, Cloud Run, OpenTofu, DB-Migration, Implementierungs-Reihenfolge)

**Kurzfassung der Verbote:**
- Kein App Engine, kein Docker lokal (nur Podman), keine GitHub Actions, kein Terraform (nur OpenTofu)
- Alle GCP-Ressourcen über OpenTofu verwalten (`terraform/`-Verzeichnis)
