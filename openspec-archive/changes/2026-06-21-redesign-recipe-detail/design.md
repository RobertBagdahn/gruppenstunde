## Context

Die `RecipeDetailPage.tsx` (1857 Zeilen) ist die komplexeste Seite im Food Frontend. Im Zuge der `servings`→`portions`-Umbenennung wurden Backend-Variablen auf 2 Dateien nicht vollständig migriert (Runtime-NameError), und Frontend-API-Payloads senden noch alte Key-Namen (Silent Data Loss). Der vorausgehende Change `add-semantic-color-tokens` und `fix-per-serving-per-portion-schema-mismatch` haben Farb-Tokens + Schema-Rename erledigt, aber die tasks.md des Changes `redesign-recipe-detail` war fehlerhaft (Tasks als ✅ markiert, aber nie implementiert).

### Bestehende Spec
`recipe-detail-reorganized/spec.md` definiert korrekt:
- Analyse-Tabs statt Accordions
- Kategorie-Benchmarking
- Neue Section-Reihenfolge
- Button-Konsolidierung
- `showFactors` im PortionScaler
- DGE-Dropdown

## Goals / Non-Goals

**Goals:**
- Alle 4 Runtime-NameError-Bugs fixen (2 Backend, 2 Frontend-Payload-Keys)
- 4 Analyse-Accordions → Tab-Sektion mit 4 Tabs (separate Komponenten)
- Kategorie-Benchmarking in allen 4 Tabs via `RecipeCategoryBenchmark` + `RecipeNutriScoreDistribution`
- Fehlende Frontend-Bausteine nachliefern: Zod-Schema, API-Hook, Color-Export
- `ScaleIngredientsDialog` entfernen, Faktor-Quick-Select in `PortionScaler`
- Section-Reihenfolge: Zutaten → Zubereitung(defaultOpen) → Tags → Tabs → Regeln
- Zubereitung `defaultOpen=true`
- `NUTRI_SCORE_COLORS_BY_LETTER` Export in supply.ts

**Non-Goals:**
- DGE-Dropdown (Alter/Geschlecht) — späterer Change
- Summary-Box über den Tabs — späterer Change
- Image-Placeholder-Verhalten — separater Change
- Kochmodus-PortionScaler-Integration — späterer Change
- Backend-TypeStats-Model/Signals/Endpoint (existieren bereits)

## Decisions

### 1. Analyse-Tabs als separate Komponenten
Vier separate Dateien, jede erhält ihre Daten per Props von `RecipeDetailPage`:
```
┌────────────────────────────────────────────────────┐
│ RecipeDetailPage.tsx                                │
│  ├─ RecipeAnalysisTabs (Wrapper, hält activeTab)    │
│  │   ├─ PriceTab.tsx       (Preis-Analyse)          │
│  │   ├─ NutritionTab.tsx   (Inhaltsstoff-Analyse)   │
│  │   ├─ HealthTab.tsx      (Gesundheits-Analyse)    │
│  │   └─ WeightTab.tsx      (Gewichts-Analyse)       │
│  └─ RecipeRulesBox (wie bisher, nach den Tabs)      │
└────────────────────────────────────────────────────┘
```
**Rationale**: `RecipeAnalysisTabs.tsx` existiert bereits — muss nur importiert und mit Inhalten befüllt werden. Separate Komponenten halten `RecipeDetailPage.tsx` lesbarer als 1857 Zeilen Inline-JSX.

### 2. Bugfixes — einfache String-Ersetzung
Alle 4 Bugs sind reine `servings`→`portions` Ersetzungen:
- Backend `nutrition.py:298-302`: 5× in `return { ... }` Block
- Backend `shopping/api.py:456`: 1× in `weight_g = ...` Formel
- Frontend `RecipeDetailPage.tsx:697,736`: Payload-Keys in `mutate()`-Aufrufen
- Frontend `EditRecipePage.tsx`: State + Payload

### 3. Kategorie-Benchmarking — Frontend-Datenfluss
Backend existiert bereits (`RecipeTypeStats` Model + `GET /api/recipes/type-stats/{recipe_type}/`). Fehlende Frontend-Stücke:
- **Zod-Schema**: `RecipeTypeStatsSchema` in `schemas/recipe.ts` (Match zu Pydantic `RecipeTypeStatsOut`)
- **API-Hook**: `useRecipeTypeStats(recipeType)` in `api/recipes.ts` → `fetchJson(API_BASE + '/type-stats/' + recipeType + '/')`
- **Integration**: In jedem Tab `const { data: typeStats } = useRecipeTypeStats(recipe.recipe_type)` → `typeStats.count >= 10` → `RecipeCategoryBenchmark` rendern

### 4. showFactors-Prop am PortionScaler
```tsx
interface PortionScalerProps {
  defaultPortions?: number;
  min?: number;
  max?: number;
  onChange: (portions: number) => void;
  showFactors?: boolean;   // NEU
  compact?: boolean;
  className?: string;
}
```
Wenn `showFactors=true`, erscheinen Quick-Select-Buttons "0.5×", "1.5×", "2×" unter dem Input. Der aktuelle Portionswert wird mit dem Faktor multipliziert und via `onChange` gemeldet.

### 5. Section-Reihenfolge
Aktuell → Neu (wie Spec):
```
Aktuell:                          Neu:
  Zutaten                          Zutaten
  4 Analyse-Accordions             Zubereitung (defaultOpen=true)
  Zubereitung (defaultOpen=false)  Themen-Tags
  Themen-Tags                      Nutritional Tags (Allergene)
  Nutritional Tags                 4 Analyse-Tabs
  Rezeptregeln                     Rezeptregeln
```
**Umstellung**: JSX in `RecipeDetailPage.tsx` umordnen. `AnalysisSection` für Zubereitung bekommt `position: relative` Verschiebung vor die Analyse-Tabs.

### 6. ScaleIngredientsDialog entfernen
- Import (`line 59`) löschen
- State `showScaleDialog` (`line 325`) löschen
- `scaleByFactor` aus Store verwenden wir im PortionScaler (wenn `showFactors=true` und Faktor geklickt wird)
- JSX `<ScaleIngredientsDialog ...>` (`line 1717`) löschen
- `showScaleDialog` aus `useState` entfernen

### 7. NUTRI_SCORE_COLORS_BY_LETTER
Export in `schemas/supply.ts` hinzufügen:
```typescript
export const NUTRI_SCORE_COLORS_BY_LETTER: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};
```

## Risks / Trade-offs

- **Tab-Wechsel verliert Scroll-Zustand** → Nutzer muss bei langen Tabs jedes Mal neu scrollen. Ein "Alle öffnen"-Button kann später ergänzt werden. Moderate UX-Einbuße, akzeptabel.
- **ScaleIngredientsDialog entfernen** → Bestehende Nutzer, die den Dialog kannten, müssen sich an PortionScaler mit Faktor-Buttons gewöhnen. Geringes Risiko.
- **Section-Reihenfolge verschiebt bekannte Positionen** → Nutzer finden Zubereitung jetzt direkt nach Zutaten (prominenter). Positive UX-Änderung.
