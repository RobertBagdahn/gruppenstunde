# AI Agent Configuration – Frontend (React + TypeScript)

> Dieses AGENTS.md enthält **frontend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## Wichtige Schema-/Komponenten-Zuordnungen

| Feature | Schema | API Hooks | Seiten |
|---------|--------|-----------|--------|
| Essensplan | `schemas/mealEvent.ts` | `api/mealEvents.ts` | `pages/planning/MealEvent*.tsx` |
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
- **MealPlan → MealEvent**: Alte `mealPlan.ts`/`mealPlans.ts` sind nur Compat-Shims die auf `mealEvent.ts`/`mealEvents.ts` weiterleiten
- **Kein Price-Model mehr**: `useCreatePrice`/`useDeletePrice` existieren nicht mehr. Preis über `Ingredient.price_per_kg`.
- **Recipe Cache-Felder**: `RecipeListItemSchema` hat `cached_*` Felder für schnelle Listenansichten
- **URL-Routen**: Essensplanung unter `/meal-events/`, Legacy-Redirect von `/meal-plans/*`

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
- [ ] Mobile Layout getestet (320px, 375px, 768px)
- [ ] Keine TypeScript `any` Typen
- [ ] Bilder haben alt-Text und lazy loading
- [ ] Keine console.log Statements
- [ ] Content-URLs verwenden Slug
- [ ] Filter-Seiten speichern State in URL-Parametern
