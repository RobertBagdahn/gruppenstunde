## Context

Die Zutaten-Datenbank (`supply.Ingredient`) enthält ~6.700 Einträge mit ~50 Feldern (Nährwerte, Scores, Preise, Tags). Die bestehende `DataDistributionsPage` (`/data-quality/distributions`) zeigt einige Verteilungs-Charts, ist aber auf Datenqualität fokussiert. Diese neue Seite soll unter `/ingredients/statistics/:tab` eine explorative Statistik-Oberfläche mit 20 kuratierten Tabs bieten.

Constraint: Kein neuer externer Dependency. Recharts v3.8.1 bereits im Projekt. shadcn/ui Tabs-Komponente verfügbar.

## Goals / Non-Goals

**Goals:**
- 20 kuratierte Tabs über 7 Analyse-Kategorien (Leaderboards, Verteilungen, Korrelationen, Tag-Listen, Scores, Vergleiche, Ausreißer)
- Pro Statistik-Typ ein dedizierter Backend-Endpoint (kein Monolith)
- Sub-Route pro Tab: `/ingredients/statistics/:tab` — tief verlinkbar
- Tab-spezifische Filter (nicht global)
- Nur verified Ingredients als Datenbasis
- Statische Top-20 & Bottom-20 Tabellen in Leaderboards
- Mean + Median + P5/P95 als Overlay in Histogrammen
- Alle Datenpunkte verlinken zur IngredientDetailPage
- Mobile-First (320px) mit horizontal scrollbaren Tabs
- Antwortzeit <200ms pro Endpoint

**Non-Goals:**
- Kein globaler Filter (jeder Tab hat eigene, thematisch passende Filter)
- Kein generischer Explorer-Tab mit freier Metrikwahl
- Kein Export (CSV/PDF)
- Kein Saisonalitäts-Tab (Daten lückenhaft)
- Kein Caching in V1 (on-the-fly Aggregation reicht bei ~6.700 Zeilen)
- Keine Trend-Analyse über Zeit
- Kein 1-vs-1-Vergleichs-Tool

## Decisions

### 1. API-Design: Dedizierte Endpoints pro Statistik-Typ

**Entscheidung**: Pro Analyse-Kategorie ein eigener Endpoint. Kein Monolith, aber auch nicht 20 Einzel-Endpoints.

**Endpoints:**

| Endpoint | Liefert | Für Tabs |
|----------|---------|----------|
| `GET /api/ingredients/statistics/rankings/` | Top/Bottom-Rankings | 1–5 (Leaderboards) |
| `GET /api/ingredients/statistics/distributions/` | Histogram-Daten | 6–10 (Verteilungen) |
| `GET /api/ingredients/statistics/scatter/` | Scatter-Daten + Korrelationen | 11–14 (Korrelationen) |
| `GET /api/ingredients/statistics/tag-lists/` | Gefilterte Listen nach Tags | 15–17 (Tag-Listen) |
| `GET /api/ingredients/statistics/scores/` | Score-Verteilungen | 18–19 (Score-Analysen) |
| `GET /api/ingredients/statistics/outliers/` | IQR-Ausreißer | 20 (Ausreißer) |
| `GET /api/ingredients/statistics/comparison/` | Gruppen-Vergleiche | Vergleichs-Tab |

**Rationale**:
- Tab-Wechsel = neuer Fetch (Daten sind tab-spezifisch, kein Sharing nötig)
- Jeder Endpoint ist fokussiert, einfach zu testen, einfach zu erweitern
- Kein Overfetching: Ein Tab lädt nur seine Daten
- TanStack Query cached pro Endpoint, Tab-Wechsel zurück = instant

**Alternativen**:
- Ein Monolith-Endpoint: Alle Daten auf einmal. Nachteil: Overfetching, ein Filter-Change invalidiert alles, große Response.
- 20 Einzel-Endpoints: Zu viele Endpoints, zu viel Boilerplate.

**Query-Parameter pro Endpoint** (tab-spezifisch):

| Endpoint | Parameter |
|----------|-----------|
| `rankings/` | `field` (sugar_g, protein_g, energy_kcal, price_per_kg, fibre_g), `retail_section_id`, `tag` (vegan, vegetarian, etc.) |
| `distributions/` | `field`, `retail_section_id`, `tag` |
| `scatter/` | `x_field`, `y_field`, `color_by` (nutri_class, tag), `retail_section_id` |
| `tag-lists/` | `tag` (gluten, lactose, vegan, vegetarian), `sort_by`, `retail_section_id` |
| `scores/` | `score_type` (nutri_score, nova), `retail_section_id` |
| `outliers/` | `field` (optional, sonst alle), `retail_section_id` |
| `comparison/` | `group_by` (tag name), `metric`, `retail_section_id` |

### 2. Datenbasis: Nur verified Ingredients

**Entscheidung**: Alle Statistik-Endpoints filtern standardmäßig `status='verified'`. Entwürfe werden ausgeschlossen, um Datenqualität zu garantieren.

**Rationale**: Entwürfe können unvollständige Nährwerte, fehlende Tags und Platzhalter-Preise haben. Statistische Aussagen brauchen geprüfte Daten.

Einige Tabs (z.B. Datenqualität) können einen `status`-Parameter anbieten, um „Alle" einzuschließen.

### 3. URL-Struktur: Sub-Routes pro Tab

**Entscheidung**: `/ingredients/statistics/:tab` mit React Router. Kein Query-Parameter für Tab-Auswahl.

**URL-Struktur**:
```
/ingredients/statistics/sugar-extremes       → Tab 1
/ingredients/statistics/protein-champions    → Tab 2
/ingredients/statistics/energy-density       → Tab 3
/ingredients/statistics/protein-per-euro     → Tab 4
/ingredients/statistics/nutrient-hall-of-fame → Tab 5
/ingredients/statistics/sugar-distribution   → Tab 6
/ingredients/statistics/protein-landscape    → Tab 7
/ingredients/statistics/fat-composition      → Tab 8
/ingredients/statistics/price-by-section     → Tab 9
/ingredients/statistics/fibre-desert         → Tab 10
/ingredients/statistics/sugar-vs-fat         → Tab 11
/ingredients/statistics/environment-vs-price → Tab 12
/ingredients/statistics/protein-vs-energy    → Tab 13
/ingredients/statistics/child-vs-nutri       → Tab 14
/ingredients/statistics/gluten-radar         → Tab 15
/ingredients/statistics/vegan-protein        → Tab 16
/ingredients/statistics/lactose-overview     → Tab 17
/ingredients/statistics/nutri-landscape      → Tab 18
/ingredients/statistics/nova-processing      → Tab 19
/ingredients/statistics/outlier-detector     → Tab 20
```

Tab-spezifische Filter gehen als Query-Parameter: `/ingredients/statistics/sugar-distribution?retail_section=3,5`

**Rationale**:
- Jeder Tab ist eine eigene, teilbare URL
- Browser-Zurück/Vor funktioniert zwischen Tabs
- SEO: Jede Statistik-Ansicht ist eine eigene Seite

### 4. Frontend-Charting: Recharts

**Entscheidung**: Recharts für alle Chart-Typen. Kein Boxplot nötig (Boxplots waren in den 20 Tabs nicht priorisiert).

- `BarChart` / `Bar`: Histogramme, Rankings, Vergleiche
- `ScatterChart` / `Scatter`: Korrelationen, Zucker-vs-Fett
- `PieChart` / `Pie`: Nutri-Score-Verteilung, NOVA-Klassen
- `Line` / `ReferenceLine`: Mean, Median, P5/P95 Overlays
- `Tooltip`, `Legend`, `ResponsiveContainer`: Standard

### 5. Tab-Implementierung: shadcn/ui Tabs + React Router

**Entscheidung**: shadcn/ui `<Tabs>` mit `useParams` für `:tab`. Tab-Wechsel = React Router Navigation.

**Tab-Konfiguration** (statisch, 20 Tabs):
```typescript
const TABS = [
  // Leaderboards (1-5)
  { id: "sugar-extremes", label: "Zucker-Extreme", category: "leaderboard" },
  { id: "protein-champions", label: "Protein-Champions", category: "leaderboard" },
  { id: "energy-density", label: "Kalorien-Dichte", category: "leaderboard" },
  { id: "protein-per-euro", label: "Preis-pro-Protein", category: "leaderboard" },
  { id: "nutrient-hall-of-fame", label: "Nährwert-Rekorde", category: "leaderboard" },
  // Verteilungen (6-10)
  { id: "sugar-distribution", label: "Zucker-Verteilung", category: "distribution" },
  { id: "protein-landscape", label: "Protein-Landschaft", category: "distribution" },
  { id: "fat-composition", label: "Fett-Komposition", category: "distribution" },
  { id: "price-by-section", label: "Preis pro Abteilung", category: "distribution" },
  { id: "fibre-desert", label: "Ballaststoff-Oase?", category: "distribution" },
  // Korrelationen (11-14)
  { id: "sugar-vs-fat", label: "Zucker vs. Fett", category: "correlation" },
  { id: "environment-vs-price", label: "Umwelt vs. Preis", category: "correlation" },
  { id: "protein-vs-energy", label: "Protein vs. Energie", category: "correlation" },
  { id: "child-vs-nutri", label: "Kind vs. Nutri", category: "correlation" },
  // Tag-Listen (15-17)
  { id: "gluten-radar", label: "Gluten-Radar", category: "tag-list" },
  { id: "vegan-protein", label: "Veganer Protein-Finder", category: "tag-list" },
  { id: "lactose-overview", label: "Laktose-Übersicht", category: "tag-list" },
  // Scores (18-19)
  { id: "nutri-landscape", label: "Nutri-Landschaft", category: "score" },
  { id: "nova-processing", label: "NOVA-Grad", category: "score" },
  // Ausreißer (20)
  { id: "outlier-detector", label: "Ausreißer-Detektor", category: "outlier" },
];
```

### 6. Filter-Strategie: Tab-spezifisch

**Entscheidung**: Keine globale Filter-Leiste. Jeder Tab hat seine eigenen, thematisch passenden Filter.

**Pro Tab-Kategorie**:
- **Leaderboards**: Retail-Section, Nutritional-Tag (vegan, vegetarian, etc.)
- **Verteilungen**: Retail-Section, Nutritional-Tag, Toggle „Alle / Nur pflanzlich" (bei Protein-Landschaft)
- **Korrelationen**: Retail-Section
- **Tag-Listen**: Retail-Section, Sortierung
- **Scores**: Retail-Section
- **Ausreißer**: Retail-Section, optional Feld-Auswahl

Filter werden als Query-Parameter in der URL gespeichert. Tab-Wechsel = Filter werden nicht übernommen (jeder Tab startet mit Defaults).

### 7. Leaderboard-Design: Statische Top-20 & Bottom-20

**Entscheidung**: Jeder Leaderboard-Tab zeigt eine Tabelle mit den 20 höchsten und 20 niedrigsten Werten. Nicht sortierbar, nicht paginiert.

**Visualisierung**: Horizontaler Bar-Chart (Ranking-Style) + Tabelle darunter. Toggle zwischen „Top 20" und „Bottom 20".

**Felder pro Zeile**: Name (verlinkt), Wert, Nutri-Score-Badge, Retail-Section, ggf. Tag-Badges.

### 8. Statistik-Overlay: Mean + Median + P5/P95

**Entscheidung**: Verteilungs-Histogramme zeigen vertikale Linien für Mittelwert, Median, 5. und 95. Perzentil. Darunter eine Summary-Box mit den exakten Zahlen und der Formulierung „X% der Zutaten liegen unter Yg".

**Kein** Boxplot, **keine** Standardabweichung, **keine** P10/P25/P75-Linien — um visuelles Rauschen zu minimieren.

### 9. Gruppen-Vergleich: Flexibler Selector

**Entscheidung**: Ein Vergleichs-Tab, wo der User eine Gruppe (z.B. „Vegan") und eine Metrik (z.B. „Protein") wählt. Der Chart vergleicht dann die Gruppe vs. Rest.

**Visualisierung**: Side-by-side Histogramme (Gruppe vs. Rest) oder ein Overlay-Histogramm. Statistischer Kennwert: Mittelwert-Differenz in Prozent.

### 10. Nutri-Score-Farben: Nur in Score-Tabs

**Entscheidung**: Die Nutri-Score-Farbpalette (A=Grün, B=Hellgrün, C=Gelb, D=Orange, E=Rot) wird NUR in Tabs verwendet, die explizit mit Nutri-Score arbeiten (Nutri-Landschaft, NOVA-Grad, ggf. als Badge in Leaderboard-Tabellen). Alle anderen Tabs nutzen eine neutrale Farbpalette.

### 11. Ausreißer-Erkennung: IQR-Methode

**Algorithmus** (Backend, Python):
```python
def compute_outliers(values: list[tuple[int, str, float]]) -> list[OutlierItem]:
    sorted_vals = sorted(values, key=lambda x: x[2])
    n = len(sorted_vals)
    q1 = sorted_vals[int(n * 0.25)][2]
    q3 = sorted_vals[int(n * 0.75)][2]
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    extreme_lower = q1 - 3 * iqr
    extreme_upper = q3 + 3 * iqr
    outliers = []
    for id, name, val in sorted_vals:
        if val < extreme_lower or val > extreme_upper:
            outliers.append(OutlierItem(id=id, name=name, value=val, severity="extreme"))
        elif val < lower or val > upper:
            outliers.append(OutlierItem(id=id, name=name, value=val, severity="moderate"))
    return outliers
```

**Darstellung**: Pro Nährwert-Metrik ein aufklappbares Akkordeon mit der Ausreißer-Tabelle. Moderate = gelb, extreme = rot. Jeder Name verlinkt zur Detailseite.

### 12. Mobile: Horizontale Tab-Leiste

**Entscheidung**: `<div className="overflow-x-auto">` für die Tab-Liste. Fade-Indikator am rechten Rand (CSS `mask-image` linear-gradient). 20 Tabs sind viel, aber durch horizontales Scrollen handhabbar.

Tab-spezifische Filter werden auf Mobile als Collapsible Panel über dem Chart gerendert (nicht als Sidebar).

### 13. Dateiorganisation

**Backend**:
```
backend/supply/
├── api/
│   └── ingredient_statistics.py    # Router mit 7 Endpoints
├── schemas/
│   └── ingredient_statistics.py    # Pydantic-Schemas pro Endpoint-Typ
```

**Frontend**:
```
frontend-food/src/
├── pages/ingredients/
│   ├── IngredientListPage.tsx           # Bestehend: Button hinzufügen
│   └── statistics/
│       ├── IngredientStatisticsPage.tsx # Page Shell: Tabs + Routing
│       ├── tabs/
│       │   ├── SugarExtremesTab.tsx     # Tab 1
│       │   ├── ProteinChampionsTab.tsx  # Tab 2
│       │   ├── EnergyDensityTab.tsx     # Tab 3
│       │   ├── ProteinPerEuroTab.tsx    # Tab 4
│       │   ├── NutrientHallOfFame.tsx   # Tab 5
│       │   ├── SugarDistributionTab.tsx # Tab 6
│       │   ├── ProteinLandscapeTab.tsx  # Tab 7
│       │   ├── FatCompositionTab.tsx    # Tab 8
│       │   ├── PriceBySectionTab.tsx    # Tab 9
│       │   ├── FibreDesertTab.tsx       # Tab 10
│       │   ├── SugarVsFatTab.tsx        # Tab 11
│       │   ├── EnvironmentVsPriceTab.tsx # Tab 12
│       │   ├── ProteinVsEnergyTab.tsx   # Tab 13
│       │   ├── ChildVsNutriTab.tsx      # Tab 14
│       │   ├── GlutenRadarTab.tsx       # Tab 15
│       │   ├── VeganProteinTab.tsx      # Tab 16
│       │   ├── LactoseOverviewTab.tsx   # Tab 17
│       │   ├── NutriLandscapeTab.tsx    # Tab 18
│       │   ├── NovaProcessingTab.tsx    # Tab 19
│       │   └── OutlierDetectorTab.tsx   # Tab 20
│       └── components/
│           ├── LeaderboardTable.tsx     # Wiederverwendbare Top/Bottom-20
│           ├── DistributionChart.tsx    # Histogramm + Overlay
│           ├── ScatterExplorer.tsx      # Scatter + Achsen-Wahl
│           └── OutlierAccordion.tsx     # Ausreißer-Akkordeon
├── schemas/
│   └── supply.ts                       # Zod-Schemas ergänzen
├── api/
│   └── supplies.ts                     # 7 neue TanStack Query Hooks
└── components/charts/
    └── ReferenceLines.tsx              # Mean/Median/P5/P95 Overlay
```

### 14. TanStack Query Hooks

```typescript
// api/supplies.ts

export function useIngredientRankings(filters: RankingFilters) {
  return useQuery({
    queryKey: ['ingredient-rankings', filters],
    queryFn: () => apiFetch(`/api/ingredients/statistics/rankings/?${toParams(filters)}`)
      .then(validate(IngredientRankingsSchema)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientDistributions(filters: DistributionFilters) { /* ... */ }
export function useIngredientScatter(filters: ScatterFilters) { /* ... */ }
export function useIngredientTagLists(filters: TagListFilters) { /* ... */ }
export function useIngredientScores(filters: ScoreFilters) { /* ... */ }
export function useIngredientOutliers(filters: OutlierFilters) { /* ... */ }
export function useIngredientComparison(filters: ComparisonFilters) { /* ... */ }
```

### 15. Routing

Neue Route in `App.tsx`:
```tsx
<Route path="ingredients/statistics/:tab?" element={<IngredientStatisticsPage />} />
```

`:tab` ist optional — ohne Tab wird auf den ersten Tab (`sugar-extremes`) redirectet.

Button auf `IngredientListPage`:
- Position: Oben rechts in der Toolbar, neben Sort/Filter
- Icon: Material Symbol `bar_chart_4_bars`
- Text: „Statistiken"
- Link: `/ingredients/statistics`

## Risks / Trade-offs

- **[Risk] 20 Tabs auf Mobile unübersichtlich** → Horizontales Scrollen + Fade-Indikator. 20 Tabs sind viel, aber durch Kategorisierung im Kopf behält der User Orientierung. Dropdown wäre platzsparender, aber weniger entdeckungsfreundlich.
- **[Risk] 7 separate Endpoints = 7 Requests beim ersten Besuch?** → Nein. Nur der aktive Tab fetched. TanStack Query cached, Tab-Wechsel zurück = instant. Der User sieht nie mehr als einen Ladezustand gleichzeitig.
- **[Risk] IQR-Outlier bei schiefen Verteilungen irreführend** → Nährwerte sind oft rechtsschief. IQR markiert dann viele „Ausreißer". Lösung: Severity-Level (moderate vs extreme) und Kontext im Histogramm (Perzentile).
- **[Risk] Keine globalen Filter = viel Klickarbeit** → Tab-spezifische Filter sind thematisch passender. Ein „Filter zurücksetzen" pro Tab. Die Tabs sind bewusst eigenständige Analyse-Inseln.
- **[Risk] `retail_section_id`-Filter mit „keine Kategorie"** → Zutaten ohne Retail-Kategorie (~420) würden bei Filterung ausgeschlossen. Sollte als explizite Option „Ohne Kategorie" angeboten werden.

## Open Questions

- Tab-Icons: Emojis (visuell auf Mobile) oder Material Symbols (konsistent)? Der Entwurf nutzt Text-Labels ohne Icons — Icons können später ergänzt werden.
- Lazy Loading der Tab-Komponenten: `React.lazy()` pro Tab, damit nicht alle 20 Tab-Komponenten beim Initial Load geladen werden?
- Cache-Invalidierung: Sollte nach Edit einer Zutat der gesamte Statistics-Cache invalidiert werden? Ja — `queryClient.invalidateQueries({ queryKey: ['ingredient-'] })` nach Ingredient-Mutation.
