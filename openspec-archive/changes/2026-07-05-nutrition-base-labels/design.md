## Context

Das Recipe-Detail (`frontend-food/`) zeigt Nährwerte aus verschiedenen Quellen und Berechnungen:

- **Nährwerte pro 100g**: Karten mit Kalorien/Protein/Fett/Kohlenhydrate aus `nb.per_100g_*` — korrekt als pro 100g gekennzeichnet in der Section-Überschrift, aber nicht in den einzelnen Werten
- **Zutaten-Beiträge**: Ingredient-Contributions aus `contributions.absolute` — diese sind absolute Werte fürs gesamte Rezept. Da `recipe.servings` meist 1 ist, fallen absolute und pro Portion zusammen. Die Section heißt aktuell "pro Nährwert", was fälschlich "pro 100g" assoziieren lässt
- **Gesamtnährwerte**: MacroBars mit per-100g-Werten + DGE-Referenz (die aufs gesamte Rezept basiert). Die aktuelle Bezeichnung "(pro 100g)" ist irreführend, weil die DGE-Abdeckung das ganze Rezept betrachtet
- **Verbesserungsvorschläge**: RecipeImprovements mit "Aktuell: X → Ziel: Y" — Werte sind pro Portion, aber unmarkiert
- **Recipe Rules UI**: Zeigt `value_per_serving`, ohne "pro Portion"-Hinweis
- **Gesundheitsindikatoren**: HealthTab — korrekt als pro 100g markiert

Das Problem: 5 Sections mit 3 verschiedenen Bezugsgrößen, aber nur 1 Section hat überhaupt einen Hinweis.

## Goals / Non-Goals

**Goals:**
- Jede Section, die Nährwerte anzeigt, bekommt einen sichtbaren Badge mit der Bezugsgröße
- Badge-Typen: "pro 100g", "pro Portion", "gesamt"
- Section-Header werden korrigiert, wo sie falsche oder unklare Bezeichnungen haben
- Konsistentes visuelles System (Farben, Größe, Platzierung)

**Non-Goals:**
- Keine Änderung an API-Endpunkten, Schemas oder Berechnungen
- Keine neuen Backend-Felder
- Keine Änderung an bestehenden Section-Headings, die bereits korrekt sind (HealthTab)
- Kein Refactoring der Komponenten-Struktur

## Decisions

### Decision 1: Badge-Komponente als kleiner, dezentraler Baustein

Statt einer globalen Utility-Komponente wird ein kleiner `NutritionBaseBadge` als eigener Baustein erstellt.

- **Warum**: Das Badge wird in verschiedenen Komponenten an unterschiedlichen Stellen im DOM benötigt. Ein eigener Baustein mit klarem Interface (`base: 'per_100g' | 'per_portion' | 'total'`) ist wartbarer als inline-Spans
- **Alternative**: Shadcn Badge Komponente direkt nutzen → eigener Wrapper ist konsistenter und erlaubt feste Farbzuordnung

### Decision 2: Drei feste Badge-Typen mit eigener Farbe

| Typ | Farbe | Beschreibung |
|-----|-------|-------------|
| `pro_100g` | bg-emerald-100 text-emerald-700 | Energiedichte |
| `pro_portion` | bg-amber-100 text-amber-700 | Pro Portion/Serving |
| `total` | bg-sky-100 text-sky-700 | Gesamtes Rezept |

- **Warum**: Feste Farbcodierung erlaubt visuelles Scannen — Nutzer erkennen auf einen Blick, welche Basis gilt
- **Alternative**: Nur Text ohne Farbe → schlechtere Scanbarkeit

### Decision 3: Section-Header Korrekturen

| Aktuell | Neu | Grund |
|---------|-----|-------|
| "Nährwerte pro 100g" | Keine Änderung | Bereits korrekt, + Badge |
| "Zutaten-Beiträge pro Nährwert" | "Zutaten-Beiträge" + Badge "pro Portion" | Falsche Assoziation vermeiden |
| "Gesamtnährwerte (pro 100g)" | "Gesamtnährwerte" + Badge "gesamt" | DGE bezieht sich auf Gesamtrezept |
| "Verbesserungsvorschläge" | Keine Änderung | + Badge "pro Portion" pro Karte |
| "Gesundheitsindikatoren (pro 100g)" | Keine Änderung | Bereits korrekt |

### Decision 4: Badge-Platzierung

- **Section-Header**: Badge rechts neben dem Titel in derselben Zeile
- **Verbesserungsvorschläge**: Badge im Header jeder Karte, neben "Reduzieren"/"Erhöhen"-Label
- **Recipe Rules**: Badge in der Regel-Karte/Zeile

## Risks / Trade-offs

- **[Niedrig] Badge-Farben könnten mit Ampel-Farben kollidieren**: HealthTab nutzt grün/gelb/rot für Gesundheitsindikatoren. Die Badges nutzen Pastell-Töne (emerald-100, amber-100, sky-100) — dezenter und nicht mit Ampel-Funktion verwechselbar.
- **[Niedrig] Badge raubt Platz auf Mobile**: Badge ist klein (text-[10px], reduced padding). Getestet auf 320px Viewport.
