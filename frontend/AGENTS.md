# AI Agent Configuration – Frontend (React + TypeScript)

> Dieses AGENTS.md enthält **frontend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## ⚠️ WICHTIG: AGENTS.md als Living Document

Neue Frontend-Anforderungen (Komponenten, Pages, Stores, UI-Patterns, Design-Tokens) MÜSSEN hier eingetragen werden.

## Arbeitsablauf – Frontend-Änderungen

1. Prüfe ob das benötigte Zod Schema existiert
2. Verwende shadcn/ui Komponenten (nicht eigene bauen)
3. Verwende TanStack Query für Daten (kein raw fetch)
4. Client-State nur mit Zustand (minimal halten)
5. Mobile-First: `className="flex flex-col md:flex-row"`

### Bei KI-Features (Frontend-Seite)
1. TanStack Query Mutation mit Loading-State und Fehlerbehandlung
2. Timeouts beachten: Gemini-Calls können 5-15s dauern → Skeleton/Spinner

## Projektstruktur

```
src/
  schemas/              ← Zod Schemas (MUSS mit Pydantic matchen)
    idea.ts
    tag.ts
    user.ts
    auth.ts               ← User, Login, Register Schemas (sync mit core/api.py)
    planner.ts            ← Planner, PlannerDetail, PlannerEntry, Collaborator, WEEKDAY_LABELS
    mealPlan.ts           ← MealPlan, MealDay, Meal, MealItem Schemas
    ingredient.ts         ← Ingredient, Portion, Price, NutritionalTag, RetailSection
    recipeCheck.ts        ← RecipeHint, Bewertungsergebnisse
    packingList.ts        ← PackingList, PackingCategory, PackingItem (is_checked), PackingListSummary (checked_count, is_template)
  api/                  ← TanStack Query Hooks
    ideas.ts              ← useIdeas, useIdea, useIdeaBySlug, useSimilarIdeas, useComments, useAutocomplete, useIdeaOfTheWeek, useCreateComment, useCreateEmotion, useUpdateIdea
    tags.ts
    ai.ts
    auth.ts               ← useCurrentUser, useLogin, useRegister, useLogout
    planner.ts            ← usePlanners, usePlanner, useCreatePlanner, useUpdatePlanner, useDeletePlanner, useAddPlannerEntry, useUpdatePlannerEntry, useRemovePlannerEntry, useInviteCollaborator, useSearchUsers
    mealPlans.ts          ← useMealPlans, useMealPlan, useMealDays, useMeals, useShoppingList
    ingredients.ts        ← useIngredients, useIngredient, usePortions, usePrices
    recipeChecks.ts       ← useRecipeChecks, useRecipeHints, useNutriScore
    admin.ts
    packingLists.ts       ← usePackingLists, usePackingListTemplates, usePackingList, useCreatePackingList, useUpdatePackingList, useDeletePackingList, useClonePackingList, useResetChecks, fetchExportText, useCreateCategory, useUpdateCategory, useDeleteCategory, useSortCategories, useCreateItem, useUpdateItem, useDeleteItem, useSortItems
  store/                ← Zustand Stores (nur Client-State)
    useIdeaStore.ts
  components/           ← React Komponenten
    ui/                 ← shadcn/ui Basis-Komponenten
    ErrorBoundary.tsx      ← React Error Boundary (wraps App in main.tsx)
    ErrorDisplay.tsx        ← Shared error UI (full/inline variants, auto-detects 404/403/network/500)
    ConfirmDialog.tsx       ← Confirmation dialog for destructive actions (native <dialog>, loading state)
    MarkdownEditor.tsx     ← Markdown WYSIWYG Editor (Wrapper um @uiw/react-md-editor)
    MarkdownRenderer.tsx   ← Markdown-zu-HTML Renderer (react-markdown + remark-gfm)
    ToolLandingPage.tsx    ← Reusable Landing-Page-Komponente für alle Tools (Hero, Features, Sandbox, FAQ, CTA)
    IdeaCard.tsx
    IdeaFilterSidebar.tsx  ← Amazon-ähnliche Facetten-Filter
    SearchBar.tsx          ← Typeahead/Autocomplete
    TagTree.tsx            ← Hierarchische Tag-Anzeige
    CommentSection.tsx     ← Kommentare (anonym, moderiert)
    RefurbishForm.tsx      ← Freitext → strukturierte Idee
    SimilarIdeas.tsx       ← Ähnliche Ideen (pgvector)
    meal-plan/             ← Essensplan-Komponenten
      MealPlanCard.tsx       ← Übersichtskarte für einen MealPlan
      MealDayColumn.tsx      ← Tag-Spalte mit Mahlzeiten
      MealSlot.tsx           ← Einzelne Mahlzeit (Frühstück/Mittag/Abend)
      MealItemRow.tsx        ← Rezept innerhalb einer Mahlzeit
      ShoppingList.tsx       ← Einkaufsliste (gruppiert nach Abteilung)
      NutritionSummary.tsx   ← Nährwert-Zusammenfassung pro Tag/Plan
      NutriScoreBadge.tsx    ← Nutri-Score A-E Badge
    ingredients/           ← Zutaten-Komponenten
      IngredientSearch.tsx   ← Zutat suchen/auswählen
      IngredientDetail.tsx   ← Zutat-Detail mit Portionen/Preisen
      PortionForm.tsx        ← Portion hinzufügen/bearbeiten
      PriceForm.tsx          ← Preis hinzufügen/bearbeiten
      IngredientAiSuggestions.tsx ← KI-Vorschläge Sidebar
      NutritionalTagBadges.tsx    ← Allergen-Badges
    recipe/                ← Rezept-spezifische Komponenten
      RecipeItemList.tsx     ← Zutatenliste im Rezept
      RecipeItemForm.tsx     ← Zutat zum Rezept hinzufügen
      RecipeChecks.tsx       ← Bewertungen (Sättigung, Preis, Gesundheit)
      RecipeHints.tsx        ← Verbesserungsvorschläge
  pages/
    HomePage.tsx
    SearchPage.tsx         ← Amazon-ähnliche Filterseite
    IdeaPage.tsx           ← Detail + ähnliche Ideen
    CreateIdeaPage.tsx     ← Quick + Detailed mit KI
    RefurbishPage.tsx
    ProfilePage.tsx        ← Redirects zu /login wenn nicht angemeldet
    PlannerPage.tsx        ← Heimabend-Planer (Kalender-UI, gruppenbasiert, Wochentag+Uhrzeit, Status planned/cancelled, Collaborators)
    LoginPage.tsx          ← E-Mail + Passwort Login (Session-basiert)
    RegisterPage.tsx       ← Registrierung mit Passwort-Bestätigung
    planning/
      MealPlanListPage.tsx   ← Essensplan-Übersicht
      MealPlanDetailPage.tsx ← Essensplan-Detail (Tage/Mahlzeiten/Rezepte)
    tools/                   ← Tool Landing Pages (öffentlich, mit Sandbox)
      EventsLandingPage.tsx        ← Events Landing + interaktiver Sandbox
      MealPlanLandingPage.tsx       ← Essensplan Landing + interaktiver Sandbox
      SessionPlannerLandingPage.tsx ← Gruppenstundenplan Landing + interaktiver Sandbox
      PackingListLandingPage.tsx    ← Packlisten Landing + interaktiver Sandbox
    ingredients/
      IngredientListPage.tsx ← Zutatendatenbank (Admin/Suche)
      IngredientDetailPage.tsx ← Zutat-Detail
      IngredientCreatePage.tsx ← Zutat erstellen (mit KI-Assistent)
    admin/
      DashboardPage.tsx
      ModerationPage.tsx
      TagManagementPage.tsx
    PackingListsPage.tsx     ← Packlisten-Übersicht mit Vorlagen-Sektion, Klonen, Fortschrittsbalken (auth required)
    PackingListDetailPage.tsx ← Packliste-Detail mit Kategorien/Items, Checkboxen, Fortschritt, Export (Text/PDF/Drucken), Klonen, Reset (inline-edit, public read)
  lib/
    utils.ts
    pdfExport.ts           ← Client-seitige PDF-Generierung
    nutriScore.ts          ← Nutri-Score Farbcodes und Labels (A-E)
    toolColors.ts          ← Zentrale Farb-/Metadaten-Konfiguration für alle Module (ToolConfig Interface)
```

## Fehler-Behandlung

### Komponenten

| Komponente | Pfad | Beschreibung |
|------------|------|-------------|
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | React class component, wraps `<App />` in `main.tsx`, zeigt Crash-Screen mit Reload-Button |
| `ErrorDisplay` | `src/components/ErrorDisplay.tsx` | Shared Error UI mit `full`/`inline` Varianten, erkennt automatisch 404/403/Network/500 Fehler, `onRetry`/`onBack` Buttons |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | Native `<dialog>` fuer destruktive Aktionen, `loading` State, `destructive`/`default` Varianten |
| `sonner` Toaster | Konfiguriert in `main.tsx` | Toast-Benachrichtigungen (bottom-right, richColors, closeButton, 4s Duration) |

### Pattern: Query-Fehler

```typescript
const { data, error, isLoading, refetch } = useQuery({
  queryKey: ['ideas', filters],
  queryFn: () => fetchIdeas(filters),
});

if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
if (isLoading) return <Skeleton />;
```

### Pattern: Mutations mit Toast

```typescript
deleteMutation.mutate(id, {
  onSuccess: () => toast.success('Erfolgreich geloescht'),
  onError: (err) => toast.error('Fehler', { description: err.message }),
});
```

### Pattern: ConfirmDialog fuer destruktive Aktionen

```typescript
const [showConfirm, setShowConfirm] = useState(false);

<ConfirmDialog
  open={showConfirm}
  onConfirm={() => { /* mutation */ }}
  onCancel={() => setShowConfirm(false)}
  title="Wirklich loeschen?"
  description="Diese Aktion kann nicht rueckgaengig gemacht werden."
  confirmLabel="Loeschen"
  loading={mutation.isPending}
/>
```

**Wichtig**: Toast-Notifications werden in den Seiten-Komponenten (onSuccess/onError Callbacks) verwendet, NICHT in den API-Hooks selbst. Alle `window.confirm()` Aufrufe wurden durch `ConfirmDialog` ersetzt.

## Rich Text: Markdown (nicht HTML)

**Alle Freitextfelder (description, summary, invitation_text, etc.) verwenden Markdown, nicht HTML.**

### Editor
- **`MarkdownEditor`** (`src/components/MarkdownEditor.tsx`) — Wrapper um `@uiw/react-md-editor`
- Verwendet für alle Felder, in denen User formatierten Text eingeben (Idea description, Event description, etc.)
- Props: `value`, `onChange`, `height` (optional, default 300)
- Immer im Light-Mode (via `data-color-mode="light"`)

### Renderer
- **`MarkdownRenderer`** (`src/components/MarkdownRenderer.tsx`) — Wrapper um `react-markdown` + `remark-gfm`
- Verwendet überall, wo Markdown-Inhalte angezeigt werden
- Props: `content` (string), `className` (optional)
- **Niemals `dangerouslySetInnerHTML` verwenden** — immer `MarkdownRenderer` nutzen

### PDF-Export
- **`exportToPdf`** (`src/lib/pdfExport.ts`) — Exportiert gerenderte HTML-Elemente als PDF
- Verwendet `jspdf` + `html2canvas`, unterstützt mehrseitige Dokumente
- Auf `IdeaPage` über einen Button verfügbar

### Regeln
- **Kein Tiptap** — wurde entfernt. Keine `@tiptap/*` Pakete importieren.
- **Kein `dangerouslySetInnerHTML`** — XSS-Risiko. Immer `MarkdownRenderer` verwenden.
- Backend speichert Markdown als plain text in `TextField`.
- Existierende HTML-Daten können mit `python manage.py convert_html_to_markdown` migriert werden.

## Authentifizierung (Session-basiert) – Frontend

### Architektur
- **TanStack Query** (`useCurrentUser`) + CSRF Token via Cookie
- **Kein JWT** – Sessions sind einfacher und sicherer für Same-Origin SPAs

### Auth-Flow
1. Frontend holt CSRF Token via `GET /api/auth/csrf/` (oder liest `csrftoken` Cookie)
2. Login: `POST /api/auth/login/` mit `{email, password}` → setzt Session Cookie
3. Alle geschützten Requests senden `credentials: 'include'` + `X-CSRFToken` Header
4. `useCurrentUser()` Hook prüft Auth-Status via `GET /api/auth/me/` (staleTime: 10min)
5. Logout: `POST /api/auth/logout/` → Session wird gelöscht, Query Cache invalidiert

### Auth-Pattern
```typescript
// Auth-Status prüfen (in Layout, geschützten Seiten)
const { data: user } = useCurrentUser();

// Geschützte Navigation: Planer, Profil, Admin nur für eingeloggte User
// Admin-Link nur für user.is_staff

// Redirect auf /login wenn nicht angemeldet
useEffect(() => {
  if (!userLoading && !user) navigate('/login');
}, [user, userLoading, navigate]);
```

### Wichtige Dateien
| Was | Pfad |
|-----|------|
| Auth Schemas (Zod) | `src/schemas/auth.ts` |
| Auth Hooks | `src/api/auth.ts` |
| Login Page | `src/pages/LoginPage.tsx` |
| Register Page | `src/pages/RegisterPage.tsx` |
| Layout (Auth UI) | `src/components/Layout.tsx` |

## SEO – Frontend

### Slug-basierte URLs
- **Frontend-Route**: `/idea/:slug` (z.B. `/idea/nachtwanderung-im-wald`)
- **Legacy-Route**: `/idea/:id` wird weiterhin unterstützt für Rückwärtskompatibilität

### Meta-Tags
- Dynamische `<title>` und `<meta name="description">` Tags auf allen Seiten via `useDocumentMeta` Hook

### URL-State für Filter-Seiten
- **SearchPage** (`/search`): Alle Filter werden in URL-Parametern gespeichert (z.B. `/search?q=feuer&difficulty=easy&tag_ids=3,5&page=2`)
- **Reload-safe**: Beim Laden der Seite werden URL-Parameter gelesen und der Zustand Store wird damit initialisiert (`initFromUrlParams`)
- **Sync**: Jede Filter-Änderung aktualisiert die URL-Parameter via `setSearchParams({ replace: true })`
- **Bookmarkbar & Teilbar**: User können Filter-URLs bookmarken oder teilen
- Die Funktion `filtersToSearchParams()` serialisiert Filter zu URLSearchParams, `searchParamsToFilters()` deserialisiert sie zurück

### Wichtige SEO-Dateien
| Was | Pfad |
|-----|------|
| Meta-Tag Hook | `src/pages/IdeaPage.tsx` (`useDocumentMeta`) |
| URL-State Sync | `src/store/useIdeaStore.ts` (`filtersToSearchParams`, `initFromUrlParams`) |
| SEO-Routing | `src/App.tsx` (`/idea/:slug` Route) |

## Scout Level Farben (Altersgruppen)

Jede Pfadfinder-Stufe hat eine feste Farbe für UI-Badges und Info-Boxen:

| Scout Level      | Background     | Border             | Text             |
|------------------|----------------|--------------------|------------------|
| Wölflinge        | `bg-orange-50` | `border-orange-300` | `text-orange-700` |
| Jungpfadfinder   | `bg-blue-50`   | `border-blue-300`   | `text-blue-700`   |
| Pfadfinder       | `bg-green-50`  | `border-green-300`  | `text-green-700`  |
| Rover            | `bg-red-50`    | `border-red-300`    | `text-red-700`    |

Die Farben sind als `SCOUT_LEVEL_COLORS` Map in `src/pages/IdeaPage.tsx` definiert. Fallback für unbekannte Stufen: `bg-muted / border-border / text-foreground`.

## Design-Strategie & UI-Guidelines

### Design-Philosophie
- **Modern & einladend**: Warme Farbverläufe, weiche Schatten, abgerundete Ecken
- **shadcn/ui Best Practices**: CSS-Variablen-basiertes Theming, konsistente Spacing-Skala, Radix UI Primitives
- **Material Symbols**: Google Material Symbols (Outlined, weight 300) als Icon-Library via CDN
- **Mobile-First**: Alle Komponenten responsiv, Hamburger-Menü auf Mobile

### Farbpalette (erweitert)
| Semantic | HSL | Verwendung |
|----------|-----|------------|
| Primary (Inspi Green) | `142 60% 45%` | Buttons, Links, Akzente |
| Primary Foreground | `0 0% 100%` | Text auf Primary |
| Secondary | `45 93% 58%` | Warm Amber Akzente, Badges |
| Accent | `18 76% 57%` | Orange Highlights, CTAs |
| Background | `140 20% 98%` | Leichter Grünstich im Hintergrund |
| Card | `0 0% 100%` | Karten-Hintergrund |
| Muted | `140 10% 95%` | Dezente Grünton-Flächen |
| Destructive | `0 84% 60%` | Fehlermeldungen |
| Chart Colors | Amber, Orange, Teal | Statistiken, Badges |

### Aktuelles Preset (Neutral / Sky / Yellow)
- Basisflächen bleiben neutral-warm (`background` um HSL `42 18% 97%`), damit Karten und Formulare ruhig wirken.
- Primary nutzt Sky/Teal-Blau (`primary` um HSL `198 78% 37%`) statt Grün.
- Accent und Chart-Farben bleiben gelb dominiert (`accent` um HSL `43 92% 53%`).
- Typografie nutzt `Source Sans 3` global für Body und Headlines.
- Der Haupt-Header ist invertiert und solide dunkel (`shell-solid`) mit subtilen gelben Akzenten statt Glasmorphismus.
- Border Radius bleibt mittelgroß (`--radius: 0.875rem`).

### Icon-Konventionen (Material Symbols)
```tsx
// Material Symbols werden als <span> mit className verwendet:
<span className="material-symbols-outlined">search</span>
<span className="material-symbols-outlined">add</span>
<span className="material-symbols-outlined">favorite</span>

// Größen über font-size oder text-{size} Klassen:
<span className="material-symbols-outlined text-lg">home</span>
<span className="material-symbols-outlined text-2xl">settings</span>
```

### Häufig verwendete Icons
| Aktion | Icon Name |
|--------|-----------|
| Suchen | `search` |
| Erstellen | `add_circle` |
| Aufbereiten | `auto_fix_high` |
| Planer | `calendar_month` |
| Essensplan | `restaurant_menu` |
| Einkaufsliste | `shopping_cart` |
| Zutat | `egg_alt` |
| Rezept | `menu_book` |
| Nährwerte | `nutrition` |
| Nutri-Score | `health_and_safety` |
| Profil | `person` |
| Admin | `admin_panel_settings` |
| Abmelden | `logout` |
| Anmelden | `login` |
| Filter | `tune` |
| Favorit | `favorite` |
| Ansichten | `visibility` |
| Zeit | `schedule` |
| Schwierigkeit | `signal_cellular_alt` |
| Kosten | `payments` |
| Menü | `menu` |
| Schließen | `close` |
| KI | `auto_awesome` |

### UI-Muster
- **Header**: Glasmorphismus-Effekt (`backdrop-blur`, halbtransparenter Hintergrund), Gradient-Akzentlinie oben
- **Hero-Bereich**: Gradient-Hintergrund (Primary → Teal), weiße Texte, große Suchleiste
- **Karten**: Hover-Transform (`hover:-translate-y-1`), sanfte Schatten, Gradient-Overlay auf Bildern
- **Buttons**: Primary mit Gradient, Hover-Glow-Effekt, Icon + Text Kombination
- **Filter-Sidebar**: Farbige Section-Header mit Icons, Chip-basierte aktive Filter
- **Badges/Tags**: Farbige Hintergründe mit passenden Textfarben (nicht nur primary/10)
- **Formulare**: Floating Labels oder Label über Input, Focus-Ring in Primary-Farbe
- **Empty States**: Illustrationen + hilfreiche Texte
- **Skeleton Loading**: Gradient-Animation statt einfachem Pulse

## Qualitäts-Checkliste – Frontend

- [ ] Zod Schemas synchron mit Backend Pydantic Schemas
- [ ] Mobile Layout getestet (320px, 375px, 768px)
- [ ] Keine TypeScript `any` Typen
- [ ] Bilder haben alt-Text und lazy loading
- [ ] Meta Tags auf Idea-Detail-Seiten
- [ ] Keine console.log Statements
- [ ] "Idea" verwendet, nicht "Activity", "Gruppenstunde" oder "Heimabend"
- [ ] Idea-URLs verwenden Slug (`/idea/{slug}`), nicht numerische IDs
- [ ] Search/Filter-Seiten speichern Filter-State in URL-Parametern (bookmarkbar, teilbar)
- [ ] Essensplan & Zutaten: UI-Patterns gemäß `openspec/specs/ingredient-database/spec.md` und `openspec/specs/meal-plan/spec.md` (Nutri-Score Farbcodes, Preisdarstellung, Nährwerte, Einkaufsliste, Allergen-Badges)
