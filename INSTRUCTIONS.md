# GitHub Copilot Instructions – Inspi (Gruppenstunde)

## Projekt-Kontext

**Inspi** (Inspirator) ist eine Plattform für Pfadfinder-Gruppenleiter\*innen, um Ideen für Gruppenstunden zu finden, zu teilen und zu bewerten. Das Maskottchen ist ein Glühwürmchen. Domain: `gruppenstunde.de`

### ⚠️ WICHTIG: Rename – activity → idea

In der gesamten Codebase werden die Begriffe **Gruppenstunde**, **Heimabend** und **Activity** einheitlich durch **Idea** ersetzt. Das betrifft:
- **Django Models**: `Activity` → `Idea`, `ActivityOfTheWeek` → `IdeaOfTheWeek`
- **Django App**: `backend/activity/` → `backend/idea/`
- **API-Endpunkte**: `/api/activities/` → `/api/ideas/`
- **URLs**: `/activity/42/nachtwanderung` → `/idea/42/nachtwanderung`
- **Pydantic Schemas**: `ActivityOut` → `IdeaOut`, etc.
- **Zod Schemas**: `ActivitySchema` → `IdeaSchema`, Datei: `idea.ts`
- **React Komponenten**: `ActivityCard` → `IdeaCard`, etc.
- **TanStack Query hooks**: `useActivities` → `useIdeas`, Datei: `ideas.ts`
- **Zustand Store**: `useActivityStore` → `useIdeaStore`
- **Variablennamen, Kommentare, Strings** – überall `idea` statt `activity`

Beim Code schreiben **immer "Idea"** verwenden, nicht mehr "Activity", "Gruppenstunde" oder "Heimabend".

## Architektur

Dies ist ein **Monorepo** mit getrenntem Backend und Frontend:

```
backend/   → Django 5.x + Django Ninja (REST API)
frontend/  → React 18 + Vite + TypeScript
```

### Backend (Django + Django Ninja)
- **Framework:** Django 5.x mit Django Ninja für die API
- **API-Style:** Django Ninja Router mit Pydantic Schemas
- **Datenbank:** PostgreSQL (lokal via Docker, Produktion via Cloud SQL) + **pgvector** für Embeddings
- **Bilder:** Google Cloud Storage (django-storages)
- **Auth:** Django Allauth + Ninja JWT
- **Auth:** Django Allauth (E-Mail-Login) + Session-basierte Auth (kein JWT)
- **AI:** Google Vertex AI (Gemini 3.1 Flash Lite) für Textverbesserung, Kategorisierung und Embeddings
- **Python:** 3.12+

### Frontend (React SPA)
- **Build:** Vite mit TypeScript (strict mode)
- **UI:** shadcn/ui (Radix + Tailwind CSS)
- **State:** Zustand (minimal stores, kein Boilerplate)
- **Data Fetching:** TanStack Query (React Query v5)
- **Validation:** Zod (Schema-Validierung, synced mit Backend Pydantic Schemas)
- **PDF:** Client-seitige PDF-Generierung (z.B. @react-pdf/renderer oder jsPDF)
- **Node:** 20+

---

## Feature-Übersicht nach Benutzerrolle

### 🌐 Ohne Login (Anonym)
- **Feedback/Likes geben** – Emotionen (love, happy, etc.) ohne Login
- **Kommentare schreiben** – anonyme Kommentare, die erst nach Admin-Freigabe sichtbar werden (Moderation)
- **Schnelle Idee eintragen** – Kurzformular (Titel, Kurzbeschreibung, Kategorie)
- **Ausführliche Idee eintragen** – Langformular mit KI-Unterstützung:
  - Texte mit Gemini 3.1 Flash Lite verbessern lassen
  - Kategorie/Tags werden durch KI vorgeschlagen
- **Refurbish-Modul** – Unformatierten langen Text eingeben → KI erstellt daraus eine strukturierte Idee (Titel, Beschreibung, Materialien, Schritte, Tags, Zeitangabe etc.)
- **Suche & Filter** – Volltextsuche, Tag-Filter, Amazon-ähnliche Filterseite
- **Ähnliche Ideen sehen** – basierend auf Text-Embeddings werden auf jeder Idee-Detailseite ähnliche Ideen angezeigt

### 🔐 Eingeloggt (User)
- Alles was Anonyme können, plus:
- **Profil anpassen** – Name, Bild, Bio
- **Persönliche Präferenzen** – Bevorzugte Altersstufe, Gruppengröße, etc. → werden als Default-Werte in der Suche/Filter verwendet
- **PDF-Export** – Druckversion einer Idee (client-seitig generiert)
- **Quartalskalender** – Online-Planer um kommende Ideen für Gruppenstunden zu planen; andere User können eingeladen werden mitzuarbeiten (kollaborativ)
- **Neue Tags vorschlagen** – Tags können vorgeschlagen werden (Admin muss freigeben)
- **Eigene Ideen bearbeiten** – CRUD auf eigene Ideen

### 👑 Admin
- Alles was eingeloggte User können, plus:
- **Idee der Woche festlegen** – Featured Idea
- **Tags pflegen** – Erstellen, Bearbeiten, Löschen, Hierarchie verwalten (Parent-Child)
- **Alles editierbar** – Alle Ideen, Kommentare, Tags, User-Daten
- **Instagram-Export** – 3 quadratische Bilder (1080×1080) generieren:
  1. Seite 1: Titel mit Hintergrund-Bild
  2. Seite 2: Gekürzte Erklärung
  3. Seite 3: Tags, Zeit, Alter, Schwierigkeit
- **Autor ändern** – Autor einer Idee neu zuweisen
- **Nutzerstatistiken einsehen** – Dashboard mit Aufrufzahlen, beliebte Ideen, aktive User
- **Kommentare freigeben** – Moderationswarteschlange für anonyme Kommentare

---

## KI-Integration (Vertex AI – Gemini 3.1 Flash Lite)

### Authentifizierung
- **Kein API Key** – Vertex AI SDK mit Service Account / Application Default Credentials
- `google-cloud-aiplatform` Python SDK verwenden
- Projekt-ID und Region über Environment-Variable (`GOOGLE_CLOUD_PROJECT`, `VERTEX_AI_LOCATION`)

### Features
1. **Textverbesserung** – User kann Text markieren → KI verbessert Formulierung, Grammatik, Stil
2. **Tag-/Kategorie-Vorschlag** – KI analysiert den Ideen-Text und schlägt passende Tags vor
3. **Refurbish-Modul** – Freitext → strukturierte Idee:
   - Input: beliebiger unformatierter Text
   - Output: Titel, Kurzbeschreibung, Langbeschreibung, Materialien, Schritte, Tags, Zeitangabe, Schwierigkeit, Kosten
4. **Text-Embeddings** – Beim Speichern/Aktualisieren einer Idee wird ein Embedding (Gemini Embedding Model via Vertex AI) erstellt und in PostgreSQL/pgvector gespeichert

### Service-Architektur
```python
# backend/idea/services/ai_service.py
class AIService:
    def improve_text(self, text: str, context: str) -> str: ...
    def suggest_tags(self, text: str) -> list[int]: ...
    def refurbish(self, raw_text: str) -> IdeaStructured: ...
    def create_embedding(self, text: str) -> list[float]: ...
```

### API-Endpunkte KI
```
POST   /api/ai/improve-text/     → Text verbessern
POST   /api/ai/suggest-tags/     → Tags vorschlagen
POST   /api/ai/refurbish/        → Freitext → strukturierte Idee
```

---

## Suche & Discovery

### Hybrid-Suche (PostgreSQL)
Die Suche kombiniert drei Strategien in PostgreSQL:
1. **Keyword-Suche** – PostgreSQL Full-Text Search (`SearchVector`, `SearchQuery`, `SearchRank`)
2. **Vektor-Ähnlichkeit** – pgvector Cosine Similarity auf Embeddings
3. **Tag-/Filter-Matching** – exakte Filter auf Tags, Stufen, Schwierigkeit etc.

Die Ergebnisse werden mit gewichtetem Scoring kombiniert:
```
score = w1 * text_rank + w2 * vector_similarity + w3 * tag_match_score
```

### Fuzzy-Suche
- PostgreSQL `pg_trgm` Extension für Fuzzy-Matching (Tippfehler-tolerant)
- Trigram-basierter Similarity-Score

### Such-UI
- **Startseite**: Prominente Suchleiste oben (Hero-Section) mit Sofort-Suche (Typeahead/Autocomplete)
- **Filterseite** (`/idea/search`): Amazon-ähnliche Filter-Sidebar:
  - Facettierte Filter (Checkbox-Listen pro Kategorie)
  - Sofortige Ergebnisanzeige beim Filtern (keine "Suchen"-Button nötig)
  - Filter-Counts anzeigen (z.B. "Draußen (42)")
  - Aktive Filter als Chips/Tags oben anzeigen, einzeln entfernbar
  - Sortierung: Relevanz, Neueste, Beliebteste, Zufällig
  - Pagination oder Infinite Scroll
  - URL-State: Filter werden in URL-Parametern gespeichert (teilbar, bookmarkbar)

### API-Endpunkte Suche
```
GET /api/ideas/search/?q=nachtwanderung&scout_level=1,2&topic=3&difficulty=easy&sort=relevant&page=1
GET /api/ideas/autocomplete/?q=nacht    → Schnelle Vorschläge für Typeahead
GET /api/ideas/{id}/similar/            → Ähnliche Ideen (pgvector)
```

---

## Hierarchische Tags

Tags haben eine **Parent-Child-Struktur** (verschachtelte Kategorien):
```python
class Tag(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    icon = models.CharField(max_length=50, blank=True)
    sort_order = models.IntegerField(default=0)
```

- Tags können beliebig tief verschachtelt werden
- Filter-UI zeigt Tags hierarchisch an (aufklappbare Gruppen)
- Bei Auswahl eines Parent-Tags werden alle Children mitgefiltert
- Admin kann Tags erstellen, verschieben, umbenennen, zusammenführen
- User können neue Tags vorschlagen (Admin-Approval nötig)
- Ersetzt das bisherige Topic-Modell (oder Topic wird zu einem Tag-Typ)

---

## View-Logging (Bot-frei)

Aufrufe werden geloggt, aber **nur von echten Nutzern** (keine Bots):
```python
class IdeaView(models.Model):
    idea = models.ForeignKey(Idea, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40)
    ip_hash = models.CharField(max_length=64)  # Gehashte IP, kein Klartext
    user_agent = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
```

- **Bot-Erkennung**: User-Agent Check gegen bekannte Bot-Listen, ggf. `django-user-agents`
- **Deduplizierung**: Pro Session/IP max. 1 View pro Idee pro 24h
- **Kein Speichern von Klar-IPs**: IP wird vor dem Speichern gehasht (DSGVO)
- **Aggregierte Statistiken** für Admins: Views pro Tag/Woche/Monat, Top-Ideen

---

## Quartalskalender (Collaborative Planner)

Ein Online-Tool mit dem User ihre kommenden Gruppenstunden-Ideen planen können:
```python
class Calendar(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

class CalendarEntry(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='entries')
    idea = models.ForeignKey(Idea, null=True, blank=True, on_delete=models.SET_NULL)
    date = models.DateField()
    notes = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)

class CalendarCollaborator(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(choices=[('editor', 'Editor'), ('viewer', 'Viewer')])
```

- User erstellt einen Kalender und weist Ideen zu bestimmten Daten zu
- Andere User können per Einladung (Link oder E-Mail) als Editor oder Viewer hinzugefügt werden
- Drag & Drop von Ideen auf Kalenderdaten

---

## Instagram-Export (Admin)

Generiert 3 quadratische Bilder (1080×1080px) für Instagram-Posts:

1. **Slide 1 – Titelbild**: Idee-Titel als Overlay auf dem Hintergrundbild (Idea.image)
2. **Slide 2 – Erklärung**: Gekürzte Beschreibung (max. ~150 Wörter), gut lesbar
3. **Slide 3 – Meta-Infos**: Tags, Dauer, Altersstufe, Schwierigkeit, Kosten als visuelles Layout

- Generierung server-seitig (z.B. Pillow/PIL oder html2image)
- Download als ZIP mit 3 PNGs
- Branding: Inspi-Logo + `gruppenstunde.de` Watermark

---

## Schema-Sync Strategie (Pydantic ↔ Zod)

Die zentrale Architektur-Entscheidung: Backend-Schemas (Pydantic in `backend/idea/schemas.py`) und Frontend-Schemas (Zod in `frontend/src/schemas/idea.ts`) werden **manuell synchron gehalten**. Als AI-Agent hast du Zugriff auf beides und kannst sie abgleichen.

**Beim Ändern eines Schemas:**
1. Pydantic Schema in `backend/*/schemas.py` ändern
2. Zod Schema in `frontend/src/schemas/*.ts` entsprechend anpassen
3. TanStack Query hooks in `frontend/src/api/*.ts` prüfen
4. Typen müssen 1:1 übereinstimmen

**Beispiel-Mapping:**
```python
# Backend: backend/idea/schemas.py
class IdeaOut(Schema):
    id: int
    title: str
    summary: str
    costs_rating: str
    execution_time: str
    difficulty: str
    image_url: str | None
    like_score: int
    view_count: int
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]
    similar_ideas: list[IdeaSimilarOut] | None
```

```typescript
// Frontend: frontend/src/schemas/idea.ts
export const IdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  difficulty: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
  similar_ideas: z.array(IdeaSimilarSchema).nullable(),
});
export type Idea = z.infer<typeof IdeaSchema>;
```

**Auth-Schemas** sind in `backend/core/api.py` (Pydantic) und `frontend/src/schemas/auth.ts` (Zod) definiert und müssen ebenfalls synchron bleiben.

## Code-Konventionen

### Python (Backend)
- **Type Hints** immer verwenden (Python 3.12 Syntax: `str | None` statt `Optional[str]`)
- **Pydantic Schemas** für alle API Ein-/Ausgaben (nie raw dicts zurückgeben)
- **Django Ninja Router** pro App (`idea/api.py`, `masterdata/api.py`)
- **Services Layer** für Business-Logik (`idea/services.py`), nicht in Views/API-Endpunkten
- **AI Service** in `idea/services/ai_service.py` – Vertex AI Calls isoliert
- **Choices** als `models.TextChoices` definieren (`idea/choices.py`)
- Keine `print()` Statements – `logging` verwenden
- Tests mit `pytest` + `pytest-django`

### TypeScript (Frontend)
- **Strict TypeScript** – kein `any`, kein `as` Casting außer bei externen Libs
- **Zod** für alle API-Responses validieren (parse, nicht assume)
- **TanStack Query** für alle API-Calls (kein raw `fetch`)
- **Zustand** Stores minimal halten (nur client-side state, kein Server-State)
- **shadcn/ui** Komponenten bevorzugen, nicht selber bauen
- **Mobile-First** – immer zuerst mobile Styles, dann `md:` und `lg:` Breakpoints
- Datei-Namenskonvention: `PascalCase.tsx` für Komponenten, `camelCase.ts` für Utils

## React Best Practices

### Komponenten-Architektur
- **Funktionale Komponenten** – keine Class Components, immer `function` statt `const` Arrow
- **Single Responsibility** – jede Komponente hat genau eine Aufgabe
- **Composition über Props-Drilling** – komplexe UIs aus kleinen Komponenten zusammenbauen
- **Props-Interface** am Anfang der Datei definieren, z.B. `interface IdeaCardProps { ... }`
- **Keine inline-Styles** – Tailwind-Klassen verwenden, `cn()` Utility für bedingte Klassen
- **Max 150 Zeilen** pro Komponente – bei mehr aufteilen

### State Management Regeln
- **Server State → TanStack Query**: Alle Daten vom Backend (Ideas, Tags, etc.)
- **Client State → Zustand**: Nur UI-Zustand (Filter, Sidebar offen, Theme, etc.)
- **Form State → React (local)**: `useState` für Formulare, kein Store nötig
- **URL State → React Router**: Filter und Pagination als URL-Parameter
- **NIEMALS** Server-Daten in Zustand duplizieren – das führt zu Sync-Problemen

```typescript
// ✅ Richtig: Server State mit TanStack Query
const { data: ideas } = useIdeas(filters);

// ❌ Falsch: Server-Daten in Zustand Store speichern
// const { ideas, setIdeas } = useStore();
// useEffect(() => setIdeas(data), [data]);
```

### TanStack Query Patterns
- **Query Keys** konsistent strukturieren: `['ideas', filters]`, `['idea', id]`
- **staleTime** für statische Daten hoch setzen (Tags, ScoutLevels: 30min+)
- **Pagination** mit `keepPreviousData: true` für nahtlose UX
- **Optimistic Updates** für Mutations (Emotions, Kommentare)
- **Error Boundaries** statt try/catch in Komponenten
- `enabled` Flag nutzen um abhängige Queries zu steuern

```typescript
// Query mit Abhängigkeit
const { data: idea } = useIdea(id);
const { data: comments } = useComments(id, {
  enabled: !!idea, // erst laden wenn Idea da
});
```

### Performance
- **`React.lazy()`** für Page-Komponenten (Code-Splitting)
- **`useMemo`/`useCallback`** nur bei nachweisbarem Performance-Problem, nicht prophylaktisch
- **Keine unnötigen Re-Renders** – Zustand Selektoren nutzen statt ganzen Store
- **`loading="lazy"`** auf allen Bildern außer above-the-fold
- **Virtualisierung** für lange Listen (>100 Items) mit `@tanstack/react-virtual`
- **Debounce** für Sucheingaben (300ms)
- **Prefetch** populäre Daten (Tags, ScoutLevels) beim App-Start
- **Skeleton Loading** statt Spinner für bessere perceived performance
- **Image Optimization**: WebP-Format, responsive `srcset`, CDN-Caching

```typescript
// ✅ Zustand Selektor – nur re-render wenn sich filters ändert
const filters = useIdeaStore((s) => s.filters);

// ❌ Ganzen Store abonnieren – re-render bei jeder Store-Änderung
// const store = useIdeaStore();
```

### Komponenten-Patterns
```typescript
// Props Pattern
interface Props {
  idea: IdeaListItem;
  onSelect?: (id: number) => void;
}

// Komponente – function declaration, kein default export inline
export default function IdeaCard({ idea, onSelect }: Props) {
  return ( ... );
}
```

```typescript
// Custom Hook Pattern – Logik aus Komponenten extrahieren
function useIdeaFilters() {
  const filters = useIdeaStore((s) => s.filters);
  const setFilter = useIdeaStore((s) => s.setFilter);
  const { data, isLoading } = useIdeas(filters);
  return { data, isLoading, filters, setFilter };
}
```

### Fehlerbehandlung
- **Error Boundary** Komponente für unerwartete Fehler
- **TanStack Query `error`** für API-Fehler (nicht try/catch)
- **Zod `.safeParse()`** wenn Fehler erwartet werden, `.parse()` wenn nicht
- **User-Feedback** immer zeigen: Loading Skeleton, Error Message, Empty State
- **Toast** für Mutations (Kommentar gepostet, Bewertung abgegeben)

### Accessibility (a11y)
- **Semantisches HTML**: `<article>`, `<nav>`, `<main>`, `<section>`, `<h1>`-`<h6>`
- **`aria-label`** auf interaktiven Elementen ohne sichtbaren Text
- **Keyboard Navigation**: alle interaktiven Elemente mit Tab erreichbar
- **`alt` Text** auf allen `<img>` Tags
- **shadcn/ui** liefert a11y out-of-the-box – nicht überschreiben

### SEO für React SPA
- **`<title>` und `<meta>`** pro Seite mit `react-helmet-async` oder Vite Plugin
- **Open Graph Tags**: `og:title`, `og:description`, `og:image` auf Idea-Detail
- **JSON-LD** Structured Data für Ideas (`HowTo`/`Article` Schema)
- **Meaningful URLs**: `/idea/42/nachtwanderung` statt `/idea/42`
- **Sitemap** generieren aus API-Daten

### Dateistruktur
```
src/
├── api/              # TanStack Query hooks (1 Datei pro API-Bereich)
│   ├── ideas.ts
│   ├── tags.ts
│   ├── auth.ts       # useCurrentUser, useLogin, useRegister, useLogout
│   ├── calendar.ts
│   └── ai.ts
├── components/       # Wiederverwendbare Komponenten
│   ├── ui/           # shadcn/ui Basis (Button, Card, Dialog, etc.)
│   ├── IdeaCard.tsx
│   ├── IdeaFilterSidebar.tsx
│   ├── SearchBar.tsx
│   ├── TagTree.tsx
│   ├── CommentSection.tsx
│   ├── RefurbishForm.tsx
│   └── Layout.tsx    # Header mit Auth-Status (Login/Logout)
├── pages/            # Route-Komponenten (1 pro Route)
│   ├── HomePage.tsx
│   ├── SearchPage.tsx        # Amazon-ähnliche Filterseite
│   ├── IdeaPage.tsx          # Detail mit ähnlichen Ideen
│   ├── CreateIdeaPage.tsx    # Quick + Detailed Idea Form
│   ├── RefurbishPage.tsx     # Freitext → strukturierte Idee
│   ├── LoginPage.tsx         # E-Mail + Passwort Login
│   ├── RegisterPage.tsx      # Registrierung
│   ├── ProfilePage.tsx       # Redirect zu /login wenn nicht auth
│   ├── CalendarPage.tsx      # Quartalskalender
│   └── admin/
│       ├── DashboardPage.tsx
│       ├── ModerationPage.tsx
│       └── TagManagementPage.tsx
├── schemas/          # Zod Schemas (synced mit Backend)
│   ├── idea.ts
│   ├── auth.ts       # User, Login, Register Schemas
│   ├── tag.ts
│   ├── user.ts
│   └── calendar.ts
├── store/            # Zustand Stores (nur Client-State)
│   └── useIdeaStore.ts
├── hooks/            # Custom Hooks (useDebounce, useMediaQuery, etc.)
├── lib/              # Utilities (cn, formatDate, pdfExport, etc.)
└── types/            # Globale TypeScript Types (wenn nötig)
```

## API-Endpunkte

### Auth (Session-basiert)
```
GET    /api/auth/csrf/                → CSRF Token holen
GET    /api/auth/me/                  → Aktueller User (oder 403)
POST   /api/auth/login/              → Login (E-Mail + Passwort → Session Cookie)
POST   /api/auth/register/           → Registrierung (E-Mail + 2× Passwort)
POST   /api/auth/logout/             → Logout (Session löschen)
```

### Ideas (Kern)
```
GET    /api/ideas/                    → Liste (paginiert, filterbar)
GET    /api/ideas/{id}/               → Detail inkl. ähnliche Ideen
POST   /api/ideas/                    → Erstellen (anonym oder auth)
PATCH  /api/ideas/{id}/               → Aktualisieren (auth, eigene oder admin)
DELETE /api/ideas/{id}/               → Löschen (auth, admin only)

GET    /api/ideas/search/?q=...       → Hybrid-Suche (Fulltext + Vektor + Filter)
GET    /api/ideas/autocomplete/?q=... → Typeahead Vorschläge
GET    /api/ideas/{id}/similar/       → Ähnliche Ideen (pgvector)
```

### Feedback & Kommentare
```
POST   /api/ideas/{id}/emotions/      → Emotion hinzufügen (anonym)
GET    /api/ideas/{id}/comments/      → Freigegebene Kommentare
POST   /api/ideas/{id}/comments/      → Kommentar erstellen (anonym, wird moderiert)
```

### Tags (hierarchisch)
```
GET    /api/tags/                     → Alle Tags (Baumstruktur)
GET    /api/tags/flat/                → Flache Liste (für Autocomplete)
POST   /api/tags/suggest/             → Tag vorschlagen (auth)
POST   /api/tags/                     → Tag erstellen (admin)
PATCH  /api/tags/{id}/                → Tag bearbeiten (admin)
DELETE /api/tags/{id}/                → Tag löschen (admin)
```

### KI
```
POST   /api/ai/improve-text/          → Text verbessern (Vertex AI)
POST   /api/ai/suggest-tags/          → Tags vorschlagen (Vertex AI)
POST   /api/ai/refurbish/             → Freitext → strukturierte Idee
```

### User & Profil
```
GET    /api/users/me/                 → Eigenes Profil
PATCH  /api/users/me/                 → Profil aktualisieren
PATCH  /api/users/me/preferences/     → Präferenzen (Default-Filter)
```

### Kalender
```
GET    /api/calendars/                → Eigene Kalender
POST   /api/calendars/               → Kalender erstellen
GET    /api/calendars/{id}/           → Kalender mit Entries
POST   /api/calendars/{id}/entries/   → Entry hinzufügen
POST   /api/calendars/{id}/invite/    → Collaborator einladen
```

### Admin
```
POST   /api/admin/idea-of-the-week/   → Idee der Woche setzen
GET    /api/admin/moderation/          → Unfreigegebene Kommentare
POST   /api/admin/moderation/{id}/     → Kommentar freigeben/ablehnen
GET    /api/admin/statistics/          → Nutzerstatistiken
POST   /api/admin/ideas/{id}/author/   → Autor ändern
POST   /api/admin/ideas/{id}/instagram/ → Instagram-Bilder generieren
```

### Filter-Parameter
```
?scout_level=1,2
?tag=3,5,12           # Hierarchisch: Parent-Tag filtert auch Children
?location=indoor
?difficulty=easy
?costs_rating=0
?execution_time=30-60
?sort=relevant|newest|oldest|popular|random
?page=1&page_size=20
```

## Datenbank-Modelle (Kern)

Die wichtigsten Models:

- **Idea** – Titel, Beschreibung, Kosten, Dauer, Schwierigkeit, Bild, Status, **Embedding** (pgvector)
- **Tag** – Hierarchisch (Parent-Child), mit Icon und Sortierung. Ersetzt bisherige Topics/TagCategory
- **MaterialItem** – Materialien pro Idea (quantity, name, unit)
- **Comment** – Verschachtelte Kommentare (self-referential), **mit Moderations-Status** (pending/approved/rejected)
- **Emotion** – Bewertungen (love, happy, disappointed, complex), anonym möglich
- **IdeaOfTheWeek** – Featured Idea mit Datum
- **IdeaView** – View-Logging (bot-frei, gehashte IP, DSGVO-konform)
- **UserPreferences** – Default-Filterwerte pro User (Altersstufe, Gruppengröße etc.)
- **Calendar** – Quartalskalender mit Entries und Collaborators
- **TagSuggestion** – Von Usern vorgeschlagene Tags (Admin-Approval)

Choice-Felder verwenden Django `TextChoices`:
- ExecutionTime: <30min, 30-60min, 60-90min, >90min
- Difficulty: Easy, Medium, Hard
- CostsRating: 0€, <1€, 1-2€, >2€
- Status: Draft, Published, Archived, Review
- CommentStatus: Pending, Approved, Rejected

## GCP Deployment

- **App Engine** oder **Cloud Run** für Backend
- **Cloud SQL** (PostgreSQL 15 + pgvector Extension) für Datenbank + Embeddings
- **Cloud Storage** Bucket für Bilder/Medien
- **Secret Manager** für Credentials
- **Vertex AI** für Gemini 3.1 Flash Lite (Text + Embeddings) – keine API Keys, Workload Identity / ADC
- Settings-Split: `inspi/settings/base.py`, `local.py`, `production.py`
- `GOOGLE_CLOUD_PROJECT`, `VERTEX_AI_LOCATION`, `APPENGINE_URL` als Env Vars

## Performance & SEO

- **Mobile-First**: Alle Komponenten müssen auf 320px funktionieren
- **Lazy Loading**: Bilder und schwere Komponenten lazy loaden
- **SSR/Prerendering**: Für SEO-kritische Seiten (Idea Detail) SSR erwägen
- **Meta Tags**: Jede Idea-Seite braucht OG Tags (title, description, image)
- **Structured Data**: JSON-LD für Ideas (HowTo Schema)
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Schnelle Ladezeiten sind prioritär**: Code-Splitting, Tree-Shaking, Asset-Compression, CDN
- **API-Response-Zeiten**: Suche < 200ms, Detail < 100ms, Listen < 300ms
- **Caching**: HTTP Cache-Headers, TanStack Query staleTime, CDN-Caching für statische Assets

## Entwicklungsumgebung

```bash
# Backend starten
cd backend && source .venv/bin/activate && python manage.py runserver

# Frontend starten
cd frontend && npm run dev

# Datenbank (Docker)
docker compose up -d db

# Migrations
cd backend && python manage.py makemigrations && python manage.py migrate

# pgvector Extension aktivieren (einmalig)
psql -d inspi -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d inspi -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

## Wichtige Pfade

| Was | Pfad |
|-----|------|
| Django Settings | `backend/inspi/settings/` |
| Auth API (Backend) | `backend/core/api.py` |
| API Router | `backend/idea/api.py` |
| Pydantic Schemas | `backend/idea/schemas.py` |
| Django Models | `backend/idea/models.py` |
| Choices/Enums | `backend/idea/choices.py` |
| AI Service | `backend/idea/services/ai_service.py` |
| Search Service | `backend/idea/services/search_service.py` |
| Auth Schemas (Zod) | `frontend/src/schemas/auth.ts` |
| Auth Hooks | `frontend/src/api/auth.ts` |
| Zod Schemas | `frontend/src/schemas/idea.ts` |
| API Hooks | `frontend/src/api/ideas.ts` |
| Zustand Store | `frontend/src/store/useIdeaStore.ts` |
| Login Page | `frontend/src/pages/LoginPage.tsx` |
| Register Page | `frontend/src/pages/RegisterPage.tsx` |
| Pages | `frontend/src/pages/` |
| Components | `frontend/src/components/` |
| shadcn UI | `frontend/src/components/ui/` |
