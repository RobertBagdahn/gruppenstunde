# Proposal: Ingredient Statistics Page

## Status: Ready

## What

Eine öffentliche, explorative Statistik-Seite unter `/ingredients/statistics/:tab` mit 20 kuratierten Tabs. Nutzer entdecken Extreme, Verteilungen, Korrelationen und Ausreißer in der Zutatendatenbank — mit direkter Verlinkung zu jeder Zutat.

## Why

Die Zutatendatenbank enthält ~6.700 geprüfte Einträge mit ~50 Feldern pro Zutat (Nährwerte, Scores, Preise, Tags). Diese Datendichte ist perfekt für statistische Exploration — aber die bestehende `DataDistributionsPage` ist auf Datenqualität fokussiert und bietet keine Ranglisten, Korrelationen oder Tag-basierte Filter.

Die Statistik-Seite macht die Datenbank **erlebbar**: Statt nur Zutaten zu suchen, können Nutzer Fragen stellen wie „Welche vegane Zutat hat das meiste Protein pro Euro?" oder „Wie verteilt sich Zucker über alle Lebensmittel?".

## Exploration Summary

20 Architektur-Entscheidungen aus der Exploration:

| # | Thema | Entscheidung |
|---|-------|-------------|
| 1 | Routing | Eigene Route `/ingredients/statistics` |
| 2 | Navigation | Horizontale Tabs |
| 3 | URL | Sub-Route `/ingredients/statistics/:tab` |
| 4 | Berechnung | Dedizierte Backend-APIs pro Statistik-Typ (7 Endpoints) |
| 5 | Auth | Öffentlich |
| 6 | Mobile | Horizontal scrollbar mit Fade-Indikator |
| 7 | Button | Oben rechts in Toolbar der IngredientListPage |
| 8 | Tabs | Nur fixe, kuratierte Tabs (20 Stück) |
| 9 | Visual | Variiert pro Tab (Charts, Tabellen, beides) |
| 10 | Filter | Tab-spezifisch (nicht global) |
| 11 | Kategorien | Alle 7 priorisiert (Leaderboards, Verteilungen, Korrelationen, Tag-Listen, Scores, Vergleiche, Ausreißer) |
| 12 | Daten | Nur verified Ingredients |
| 13 | Leaderboard | Statische Top-20 & Bottom-20 Tabelle |
| 14 | Kennwerte | Mean + Median + P5/P95 als Linien im Chart |
| 15 | Interaktion | Alle Datenpunkte verlinken zur IngredientDetailPage |
| 16 | Farben | Nutri-Score-Farben nur in Score-spezifischen Tabs |
| 17 | Saison | Kein Saisonalitäts-Tab |
| 18 | Ausreißer | IQR-Methode (moderate >1.5×IQR, extreme >3×IQR) |
| 19 | Export | Kein Export |
| 20 | Vergleiche | Flexibel: Gruppe (z.B. Vegan) + Metrik (z.B. Protein) wählbar |

## 20 Tabs

### Leaderboards (1–5)
1. **Zucker-Extreme** — Top-20/Bottom-20 Zuckergehalt
2. **Protein-Champions** — Top-20/Bottom-20, Badges: vegan/vegetarisch/fleischlich
3. **Kalorien-Dichte** — Energiedichteste und energieärmste Zutaten
4. **Preis-pro-Protein** — Protein (g) pro Euro, farbkodiert
5. **Nährwert-Rekorde** — Hall of Fame/Shame für Ballaststoffe, Salz, Vitamin C

### Verteilungen (6–10)
6. **Zucker-Verteilung** — Histogramm + Mean/Median/P5/P95 + IQR-Ausreißer
7. **Protein-Landschaft** — Histogramm + Toggle „Alle / Nur pflanzlich"
8. **Fett-Komposition** — Side-by-side: Gesamtfett vs. gesättigte Fettsäuren
9. **Preis pro Abteilung** — Gestapeltes Histogramm nach Retail-Section
10. **Ballaststoff-Oase?** — Histogramm, rechts vom Median = grün

### Korrelationen (11–14)
11. **Zucker vs. Fett** — Scatter, Punktgröße = Kalorien, Farbe = Nutri-Score
12. **Umwelt vs. Preis** — Scatter mit Trendlinie
13. **Protein vs. Energie** — Scatter mit „Heiliger Gral"-Zone
14. **Kind vs. Nutri** — Child-Score vs. Nutri-Score mit Sweet Spot

### Tag-Listen (15–17)
15. **Gluten-Radar** — Sortierbare Tabelle aller glutenhaltigen Zutaten
16. **Veganer Protein-Finder** — Alle veganen Zutaten, sortiert nach Protein
17. **Laktose-Übersicht** — Alle laktosehaltigen Zutaten mit Laktosegehalt

### Scores (18–19)
18. **Nutri-Landschaft** — Pie-Chart A–E + Top-3/Bottom-3 pro Klasse
19. **NOVA-Grad** — Balken-Chart NOVA 1–4 + Kreuztabelle

### Ausreißer (20)
20. **Ausreißer-Detektor** — IQR-Ausreißer pro Nährwert, Akkordeon, Summary-Zählung

## Technical Notes

- **Chart-Library**: Recharts v3.8.1 (bereits installiert)
- **UI**: shadcn/ui Tabs, Mobile: horizontal scrollbar + CSS fade
- **Bestehende Referenz**: `DataDistributionsPage.tsx` als Chart-Pattern-Vorlage
- **Backend**: 7 Endpoints unter `/api/ingredients/statistics/`, `.values()` für Performance
- **Frontend**: 7 TanStack Query Hooks, URL-synchronisierte Filter, `staleTime: 5min`
