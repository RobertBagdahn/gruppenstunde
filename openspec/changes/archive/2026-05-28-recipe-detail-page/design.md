## Context

Die Rezept-Detailseite existierte vermutlich vor dem Refactoring von `idea` → `content/recipe`, wurde aber nicht migriert. Alle Bausteine sind vorhanden:

- **Backend-APIs**: `/api/recipes/:id/`, `/api/recipes/:id/nutri-score/`, `/api/recipes/:id/improvements/`, `/api/recipes/:id/nutrition-breakdown/`
- **Frontend-Komponenten**: `RecipeSidebar`, `RecipeHeaderInfo`, `RecipeImprovements`, `NutritionContributionPanel`, `PositiveTraitsBadges`, `HintDetailModal`, `IngredientList`, `PortionScaler`
- **API-Hooks**: `useRecipeNutriScore`, `useRecipeImprovements`, `useRecipeNutritionBreakdown` in `api/recipes.ts`
- **Schemas**: `RecipeDetailSchema`, `NutriScoreDetailSchema`, `ImprovementSchema`, `RecipeNutritionBreakdownSchema` in `schemas/recipe.ts`

Es fehlen: Route in `App.tsx`, `RecipeDetailPage`, `RecipeListPage`.

## Goals / Non-Goals

**Goals:**
- Rezept-Detailseite unter `/recipes/:slug` mit allen Analyse-Panels (NutriScore, Preis, Nährwert-Breakdown, Improvements, Positive Traits)
- Rezept-Listenpage unter `/recipes` mit paginierten Rezeptkarten
- Mobile-First Layout (320px Minimum)
- Verwendung der `EntityLinkContext`-Provider (detail/list)

**Non-Goals:**
- Neue Backend-Endpunkte oder Schema-Änderungen
- Rezept-Bearbeitungsfunktionen (Edit/Create)
- Neue UI-Komponenten — nur Komposition bestehender

## Decisions

### 1. Slug-basiertes Routing mit API-Lookup

Die URL nutzt Slugs (`/recipes/apfel-zimt-getrank-20l-2`). Die bestehende API erwartet eine `id`. Die Detailseite muss den Slug zur ID auflösen.

**Entscheidung**: Bestehenden API-Endpunkt prüfen — falls er Slug-Lookup unterstützt, direkt nutzen. Falls nicht, entweder Backend um Slug-Lookup erweitern oder erst die Liste laden. Wahrscheinlich existiert bereits ein `GET /api/recipes/{slug}/` Endpunkt (andere Content-Typen wie Sessions/Games nutzen Slug-Routing).

### 2. Page-Layout: Desktop = Content + Sidebar, Mobile = Stacked

```
┌─────────────────────────────────────────────────────┐
│ Desktop (≥768px)                                    │
├───────────────────────────────┬─────────────────────┤
│                               │                     │
│  Titelbild                    │  RecipeSidebar      │
│  Titel + Meta                 │  (NutriScore,       │
│  Beschreibung (Markdown)      │   Preis, Typ,       │
│  Zutatenliste                 │   Portionen,        │
│  Zubereitung (Markdown)       │   Share, Export)    │
│  NutritionContributionPanel   │                     │
│  RecipeImprovements           │                     │
│  PositiveTraitsBadges         │                     │
│                               │                     │
├───────────────────────────────┴─────────────────────┤
│ Mobile (<768px)                                     │
├─────────────────────────────────────────────────────┤
│  Titelbild (full-width)                             │
│  RecipeHeaderInfo (NutriScore + Preis inline)       │
│  Titel + Meta                                       │
│  PortionScaler                                      │
│  Zutatenliste                                       │
│  Zubereitung                                        │
│  NutritionContributionPanel                         │
│  RecipeImprovements                                 │
│  PositiveTraitsBadges                               │
│  RecipeMobileActionBar (sticky bottom)              │
└─────────────────────────────────────────────────────┘
```

### 3. Daten-Fetching-Strategie

Parallel-Queries mit TanStack Query:
- `useRecipeDetail(slug)` — Hauptdaten (existiert oder muss hinzugefügt werden)
- `useRecipeNutriScore(id)` — NutriScore-Details (abhängig von ID aus Detail)
- `useRecipeImprovements(id)` — Verbesserungsvorschläge
- `useRecipeNutritionBreakdown(id)` — Nährwert-Aufschlüsselung

Die drei Analyse-Queries starten erst, wenn `id` aus dem Detail-Query verfügbar ist (`enabled: !!recipeId`).

### 4. Rezeptliste als einfache Card-Grid-Seite

Standard-Pattern wie andere Listenansichten: paginierte Cards mit Bild, Titel, NutriScore-Badge, Preis, Tags. "Mehr laden"-Button.

### 5. Dateistruktur

```
frontend/src/pages/recipes/
├── RecipeDetailPage.tsx
└── RecipeListPage.tsx
```

Route in `App.tsx`:
```
/recipes        → RecipeListPage
/recipes/:slug  → RecipeDetailPage
```

## Risks / Trade-offs

- **[Slug→ID Resolution]** → Falls kein Slug-Endpunkt existiert, muss das Backend minimal erweitert werden. Mitigation: Prüfen ob `/api/recipes/{slug}/` bereits funktioniert.
- **[Komponentenkompatibilität]** → Bestehende Analyse-Komponenten erwarten bestimmte Props. Mitigation: Props-Interface prüfen und ggf. Adapter-Logic in der Page.
- **[Fehlende Rezeptlisten-API]** → Falls keine paginierte Listen-API existiert, muss ein Endpunkt ergänzt werden. Mitigation: Vermutlich existiert bereits über Content-System.
