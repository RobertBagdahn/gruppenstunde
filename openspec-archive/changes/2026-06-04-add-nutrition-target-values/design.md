## Context

In der aktuellen Implementierung der Nährwert-Zusammenfassung (`NutritionView.tsx`) werden Soll-Ist-Vergleiche nur dann gezeichnet, wenn die API-Regeln erfolgreich aus der Datenbank geladen wurden und mindestens ein Eintrag für den jeweiligen Parameter existiert. Ist dies nicht der Fall (z.B. in frischen lokalen Entwicklungsumgebungen oder bei Netzwerkverzögerungen), fehlen die Soll-Wert-Balken vollständig. Zudem besitzt das Säulendiagramm (`NutrientBalanceChart.tsx`) gar keine Referenzwerte, um die Mengen visuell einzuordnen.

Dieses Design führt robuste Frontend-Fallbacks auf Basis der offiziellen DGE-Richtlinien ein und erweitert das Säulendiagramm um eine übersichtliche Visualisierung der Soll-Richtwerte.

## Goals / Non-Goals

**Goals:**
- Sicherstellen, dass in der Nährwert-Tabelle immer Soll-Ist-Balken angezeigt werden (mittels DGE-Fallbacks, falls DB-Regeln leer sind).
- Das Säulendiagramm (`NutrientBalanceChart.tsx`) so umstrukturieren, dass für jeden Hauptnährstoff (Eiweiß, Fett, Kohlenhydrate, Zucker, Ballaststoffe, Salz) ein direkter Ist-Soll-Vergleich möglich ist.
- Dynamische Skalierung der Soll-Werte im Diagramm anhand der Anzahl der ausgewählten Tage (`numDays`) und der Portionen, wenn "Gesamt" angezeigt wird.

**Non-Goals:**
- Keine Änderungen an der Datenbankstruktur oder an den Backend-APIs.
- Keine Anpassung von anderen Nährwerten (Mikronährstoffe wie Calcium/Eisen bleiben in der Tabelle über die DB-Regeln gesteuert).

## Decisions

### 1. Robustes Fallback-System in `NutritionView.tsx`
Falls `useRules()` keine aktiven Regeln zurückgibt, erstellen wir ein lokales Fallback-Objekt mit DGE-Standardwerten für 13-18-Jährige.

**Rationale:**
Dadurch ist die App offline-fähig und funktioniert auch ohne vollständige Datenbank-Seeds sofort optisch ansprechend und vollständig.

### 2. Multi-Bar Recharts Chart für Ist und Soll
Wir strukturieren `NutrientBalanceChart.tsx` um. Statt einer einzelnen Säule pro Nährstoff nutzen wir ein gruppiertes Säulendiagramm mit zwei Datenreihen: `Ist` (tatsächlich geplante Menge) und `Soll` (Ziel-Richtwert).

```tsx
// Beispielhafte Datenstruktur für Recharts
const data = [
  { name: 'Eiweiß', Ist: 25.6, Soll: 62.5, sollRange: [45, 80] },
  { name: 'Fett', Ist: 15.6, Soll: 70, sollRange: [55, 85] },
  // ...
];
```

Für Parameter wie Zucker/Salz (wo es nur ein Maximum gibt) verwenden wir die Obergrenze als Soll-Säule.
Die Soll-Säule wird visuell abgesetzt gestaltet (z.B. schraffiert, teiltransparent oder mit einer feinen Umrandung), um sie sofort von der Haupt-Ist-Säule unterscheiden zu können.

### 3. Dynamische Skalierung der Soll-Richtwerte
Wir übergeben `numDays` (Anzahl der Tage) und `showPerPortion` an `NutrientBalanceChart.tsx`.
- Wenn `showPerPortion` aktiv ist: Soll-Wert = `Tages-DGE-Soll * numDays` (da die "per_portion"-Werte im Plan die Summe über alle Tage darstellen).
- Wenn "Gesamt" angezeigt wird: Soll-Wert = `Tages-DGE-Soll * numDays * data.norm_portions`.

**Alternative betrachtet:** Feste, unskalierte Soll-Werte anzeigen.
*Nachteil:* Das würde bei der Anzeige von "Gesamt" oder über mehrere Tage hinweg zu völlig falschen Vergleichen führen (z.B. Vergleich von 3 Tagen Gesamt-Ist mit 1 Tag Soll). Daher ist die dynamische Skalierung der einzig korrekte Weg.

## Risks / Trade-offs

- **[Risiko]** Recharts BarChart Layout bricht auf schmalen Bildschirmen (Mobile-First-Anforderung).
  - **Mitigation:** Wir begrenzen die Breite der Säulen (`maxBarSize={16}`) und stellen sicher, dass der Container voll responsiv bleibt (`ResponsiveContainer`). Auf mobilen Geräten werden die Tooltips übersichtlich formatiert.
