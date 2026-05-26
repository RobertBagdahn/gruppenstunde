# AI Agent Configuration – Frontend (React + TypeScript)

> Dieses AGENTS.md enthält **frontend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## Navigation: Single-Location-Policy

Jedes Tool/Feature darf in der **primären Navigation** höchstens einmal erscheinen:

- **Primäre Navigation** umfasst: Desktop-Top-Level-Header, Desktop-Tools-Dropdown, Mobile-Bottom-Nav, Mobile-More-Menü (Tools-Section).
- Ein Tool, das als Top-Level-Link (Desktop) oder in der Mobile-Bottom-Nav erscheint, darf **nicht zusätzlich** im Tools-Dropdown / der Tools-Section des More-Menüs auftauchen.
- **Footer** ist von dieser Regel ausgenommen (dient als umfassende Sitemap).
- Beispiel: `Events/Aktionen` ist Top-Level-Link und in der Mobile-Bottom-Nav → darf nicht in `toolsMenuItems` stehen.

Die Arrays `toolsMenuItems`, `bottomNavItems`, `navItems` in `src/components/Layout.tsx` sind die Single Source of Truth und müssen dieser Regel folgen.

## Entity-Links & NewTab-Policy

Alle In-App-Links zu Domain-Entitäten (Rezept, Zutat, Material, Event, Location, Session, Game, Blog, User, Group, Tag) laufen über die Komponente `<EntityLink>` aus `src/components/shared/EntityLink.tsx`.

### Warum

- **Zentrale URL-Resolution**: `getEntityUrl(type, { id, slug })` in `src/lib/entityUrls.ts` ist die einzige Stelle, an der URL-Pattern stehen. Route-Änderungen passieren dort.
- **Konsistentes NewTab-Verhalten**: „Listen → neuer Tab / Detail → selber Tab" wird via Context automatisch durchgesetzt.
- **Accessibility**: `rel="noopener noreferrer"` bei `target="_blank"`, Keyboard-Focus-Ring, `aria-label`.

### Komponenten-API

```tsx
<EntityLink
  type="recipe" | "ingredient" | "material" | "event"
      | "location" | "session" | "game" | "blog"
      | "user" | "group" | "tag"
  id={string | number}        // entweder id ODER slug (typabhängig)
  slug={string}
  name="Apfelmus"             // Link-Text (wird auch aria-label)
  newTab={boolean}            // optional, überschreibt Context-Default
  variant="default" | "muted" | "chip"
  className="..."             // escape hatch
>
  {/* optional: overrides name */}
</EntityLink>
```

### URL-Resolution-Tabelle

| type | identifier | URL pattern |
|------|------------|-------------|
| recipe | slug | `/recipes/:slug` |
| ingredient | slug | `/ingredients/:slug` |
| material | slug | `/materials/:slug` |
| event | slug | `/events/:slug` |
| location | id | `/events?event_location_id=:id` |
| session | slug | `/sessions/:slug` |
| game | slug | `/games/:slug` |
| blog | slug | `/blogs/:slug` |
| user | id | `/profile/name/:id` |
| group | slug | `/groups/:slug` |
| tag | slug | `/search?tag_slugs=:slug` |

Fehlt der Pflicht-Identifier, wirft `getEntityUrl` im Dev-Build und liefert `#` in Prod.

### Context-Wrapper-Pattern

Jede **List-Page** wird in `<EntityLinkContext.Provider value="list">` eingewickelt, jede **Detail-Page** in `<EntityLinkContext.Provider value="detail">`. Alle `<EntityLink>`-Instanzen im Subtree erben daraus den NewTab-Default.

```tsx
// Listen-Page (z.B. RecipeListPage)
<EntityLinkContext.Provider value="list">
  {recipes.map(r => <EntityLink key={r.id} type="recipe" slug={r.slug} name={r.name} />)}
</EntityLinkContext.Provider>

// Detail-Page (z.B. RecipeDetailPage)
<EntityLinkContext.Provider value="detail">
  {/* Zutaten, Tags, Autoren innerhalb öffnen im selben Tab */}
  <EntityLink type="ingredient" slug={ing.slug} name={ing.name} />
</EntityLinkContext.Provider>
```

**Regel**: Listen → neuer Tab, Detail → selber Tab. Explizites `newTab={true|false}` überschreibt den Context (z.B. für Breadcrumbs innerhalb einer Liste).

### Was nicht über EntityLink läuft

- Navigation-Items (Header, Footer, Bottom-Nav) — das ist UI-Chrom, kein Entity-Link.
- Externe Links (http/https nach außen) — direkt `<a href target="_blank">`.
- Aktions-Buttons („Neu anlegen", „Bearbeiten") — das sind keine Entity-Links.

## Wichtige Schema-/Komponenten-Zuordnungen

| Feature | Schema | API Hooks | Seiten |
|---------|--------|-----------|--------|
| Essensplan | `schemas/mealPlan.ts` | `api/mealPlans.ts` | `pages/planning/MealEvent*.tsx` |
| Cockpit/Ampel | `schemas/cockpit.ts` | `api/cockpit.ts` | `components/cockpit/` |
| Rezepte | `schemas/recipe.ts` | `api/recipes.ts` | `pages/recipes/` |
| Zutaten | `schemas/supply.ts` + `ingredient.ts` | `api/supplies.ts` | `pages/supplies/` |
| Normportion | `schemas/normPerson.ts` | `api/normPerson.ts` | `pages/tools/NormPortionSimulatorPage.tsx` |
| Packlisten | `schemas/packingList.ts` | `api/packingLists.ts` | `pages/PackingList*.tsx`, `pages/tools/PackingListLandingPage.tsx` |

### Cockpit-Komponenten (`components/cockpit/`)
- `TrafficLightIndicator` — farbiger Punkt (grün/gelb/rot) mit Label, compact-Mode für Mobile
- `HealthTipCard` — zeigt tip_text für gelbe/rote Regeln
- `CockpitDashboard` — Grid aus TrafficLightIndicators mit Summary und Tips
- `CockpitSummaryCard` — Gesamtstatus-Banner mit Anzahl grün/gelb/rot

### Wichtige Hinweise
- **MealEvent → MealPlan**: Alte `mealEvent.ts`/`mealEvents.ts` sind nur Compat-Shims die auf `mealPlan.ts`/`mealPlans.ts` weiterleiten
- **Kein Price-Model mehr**: `useCreatePrice`/`useDeletePrice` existieren nicht mehr. Preis über `Ingredient.price_per_kg`.
- **Recipe Cache-Felder**: `RecipeListItemSchema` hat `cached_*` Felder für schnelle Listenansichten
- **URL-Routen**: Essensplanung unter `/meal-plans/`, Legacy-Redirect von `/meal-events/*`

## Arbeitsablauf – Frontend-Änderungen

1. Prüfe ob das benötigte Zod Schema existiert (in `schemas/<content-type>.ts`)
2. Verwende shadcn/ui Komponenten (nicht eigene bauen)
3. Verwende TanStack Query für Daten (kein raw fetch)
4. Client-State nur mit Zustand (minimal halten)
5. Mobile-First: `className="flex flex-col md:flex-row"`

### Bei KI-Features (Frontend-Seite)
1. TanStack Query Mutation mit Loading-State und Fehlerbehandlung
2. Timeouts beachten: Gemini-Calls können 5-15s dauern → Skeleton/Spinner

## Fehler-Behandlung

### Pattern: Query-Fehler

```typescript
const { data, error, isLoading, refetch } = useQuery({ ... });

if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
if (isLoading) return <Skeleton />;
```

### Pattern: Mutations mit Toast

```typescript
mutation.mutate(data, {
  onSuccess: () => toast.success('Erfolgreich'),
  onError: (err) => toast.error('Fehler', { description: err.message }),
});
```

Toast-Notifications in Seiten-Komponenten (onSuccess/onError), NICHT in API-Hooks.
`ConfirmDialog` statt `window.confirm()` für destruktive Aktionen.

## Rich Text: Markdown (nicht HTML)

- **Editor**: `MarkdownEditor` (Wrapper um `@uiw/react-md-editor`)
- **Renderer**: `MarkdownRenderer` (Wrapper um `react-markdown` + `remark-gfm`)
- Kein Tiptap, kein `dangerouslySetInnerHTML`

## Auth-Flow (Session-basiert)

1. CSRF Token via `GET /api/auth/csrf/`
2. Login: `POST /api/auth/login/` → Session Cookie
3. Alle Requests: `credentials: 'include'` + `X-CSRFToken` Header
4. `useCurrentUser()` Hook prüft Auth-Status (staleTime: 10min)

## Design-Strategie & UI-Guidelines

- **shadcn/ui** + Radix UI Primitives, CSS-Variablen-Theming
- **Icons**: Google Material Symbols (Outlined, weight 300) via CDN
- **Typografie**: `Source Sans 3`
- **Border Radius**: `--radius: 0.875rem`
- **Karten**: `hover:-translate-y-1`, sanfte Schatten
- **Buttons**: Primary mit Gradient, Hover-Glow

### Scout Level Farben

| Scout Level | Background | Border | Text |
|-------------|-----------|--------|------|
| Wölflinge | `bg-orange-50` | `border-orange-300` | `text-orange-700` |
| Jungpfadfinder | `bg-blue-50` | `border-blue-300` | `text-blue-700` |
| Pfadfinder | `bg-green-50` | `border-green-300` | `text-green-700` |
| Rover | `bg-red-50` | `border-red-300` | `text-red-700` |

## Qualitäts-Checkliste – Frontend

- [ ] Zod Schemas synchron mit Backend Pydantic Schemas

## Search-Konventionen

- **Mine-Toggle**: SearchPage zeigt einen `Switch` "Nur meine Beiträge" neben dem Sort-Control, nur für eingeloggte User
- **URL-State**: `?scope=mine` wird in der URL persistiert. Default (`all`) wird nicht in die URL geschrieben
- **Anonyme User**: `scope=mine` in URL wird ignoriert, nicht an API durchgereicht
- **Draft-Badge**: Ergebnis-Cards mit `status==='draft'` zeigen einen "Entwurf"-Badge (amber)
- **Schema**: `UnifiedSearchFilterSchema` enthält `scope: z.enum(['all','mine']).optional()`
- **Cache-Key**: `scope` ist Teil des TanStack Query Cache-Keys (über `filters`-Objekt)
- [ ] Mobile Layout getestet (320px, 375px, 768px)
- [ ] Keine TypeScript `any` Typen
- [ ] Bilder haben alt-Text und lazy loading
- [ ] Keine console.log Statements
- [ ] Content-URLs verwenden Slug
- [ ] Filter-Seiten speichern State in URL-Parametern
