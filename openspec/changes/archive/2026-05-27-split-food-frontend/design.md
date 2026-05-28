## Context

Das Frontend ist aktuell eine einzelne Vite/React-SPA (`frontend/`) die alle Domänen bedient. Die Food-Domäne (Rezepte, Zutaten, Essensplan, Einkaufslisten) soll als eigenständige App abgetrennt werden, um fokussierte Entwicklung und potenziell separates Deployment zu ermöglichen.

Aktueller Stand:
- Eine Vite-App auf Port 5173 mit gemeinsamem Layout, Router und Nav
- Auth über Django Allauth Sessions (HTTP-only Cookies)
- API-Proxy in `vite.config.ts` auf Backend Port 8000

## Goals / Non-Goals

**Goals:**
- Eigenständige Vite-App `frontend-food/` mit eigenem package.json, Router, Layout
- Food-App enthält: Rezepte, Zutaten, Essensplan, Einkaufslisten, Norm-Portionen-Simulator, Meal-Event-Landing
- Gleicher Look & Feel (shadcn/ui, Tailwind) wie Haupt-App
- `make food` startet die Food-App auf Port 5174
- Auth-Session-Sharing über gemeinsame Domain (localhost)
- Haupt-App wird um Food-Inhalte bereinigt

**Non-Goals:**
- Kein Shared-Package / Monorepo-Tooling (bewusste Duplikation)
- Keine Backend-Änderungen
- Kein separates Deployment vorerst (nur lokaler Dev-Split)
- Keine neue Funktionalität — nur strukturelle Trennung

## Decisions

### 1. Komplette Duplikation statt Shared Package

**Entscheidung**: shadcn/ui-Komponenten, Auth-Hooks, API-Client, Schemas werden kopiert.

**Rationale**: Einfachheit. Kein npm-workspaces/turborepo-Setup nötig. Die Apps können sich unabhängig weiterentwickeln. Bei Divergenz ist das gewollt. Der Aufwand für ein Shared Package rechtfertigt sich erst bei 3+ Apps.

**Alternative verworfen**: `packages/shared/` mit npm workspaces — zu viel Infrastruktur-Overhead für den aktuellen Stand.

### 2. Eigenes Layout mit reduzierter Navigation

**Entscheidung**: Food-App bekommt ein eigenes `Layout.tsx` mit nur food-relevanten Menüpunkten: Rezepte, Zutaten, Essensplan, Einkaufslisten.

**Rationale**: Klare Fokussierung. Nutzer der Food-App brauchen keine Sessions/Blog/Games-Links.

### 3. Port 5174 für Dev-Server

**Entscheidung**: Food-App läuft auf `localhost:5174`, API-Proxy auf `localhost:8000`.

**Rationale**: Standard-Vite-Verhalten, kein Konflikt mit Haupt-App. Session-Cookies funktionieren weil gleiche Domain (localhost).

### 4. Verzeichnisstruktur

```
frontend-food/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx              (Router)
│   ├── components/
│   │   ├── ui/              (shadcn kopiert)
│   │   ├── layout/          (eigenes FoodLayout)
│   │   └── recipe/          (recipe-spezifische Komponenten)
│   ├── pages/
│   │   ├── recipes/
│   │   ├── ingredients/
│   │   ├── planning/
│   │   ├── shopping/
│   │   └── tools/
│   ├── api/                 (recipes.ts, ingredients.ts, client.ts)
│   ├── schemas/             (recipe.ts, ingredient.ts)
│   ├── hooks/               (useAuth, etc.)
│   ├── store/               (auth store)
│   └── lib/                 (utils.ts, cn())
```

### 5. Makefile-Integration

```makefile
install-food:
	cd frontend-food && npm install

food:
	cd frontend-food && npm run dev
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Code-Drift zwischen Apps (z.B. Auth-Hook divergiert) | Akzeptiert — bei Bedarf manuell synchronisieren |
| Doppelte npm-Dependencies (mehr Disk-Space) | Vernachlässigbar lokal |
| Session-Cookie-Sharing in Production (andere Domain?) | Erst relevant bei Production-Deployment; dann Cookie-Domain konfigurieren |
| Vergessene Referenzen in Haupt-App (tote Links) | Alle Food-Links aus Layout.tsx und Footer entfernen |

## Open Questions

- Production-Deployment: Subdomain (`food.gruppenstunde.de`) oder Pfad-basiert? → Entscheidung vertagen
- Soll die Food-App auch eine eigene Suche haben oder nur die food-relevanten Ergebnisse?
