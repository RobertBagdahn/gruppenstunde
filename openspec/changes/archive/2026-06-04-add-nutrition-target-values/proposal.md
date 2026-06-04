## Why

In der Nährwert-Übersicht des Essensplaners sehen Benutzer derzeit nur absolute Werte (z.B. "533 kcal", "25.6 g Eiweiß") ohne visuelle Einordnung oder Soll-Werte (Richtwerte), wenn die Datenbankregeln in ihrer lokalen Umgebung leer sind oder geladen werden. Zudem fehlt dem Nährstoff-Verteilungsdiagramm (`NutrientBalanceChart`) jegliche Referenz oder Zielwert-Orientierung. Dies erschwert es Gruppenführern, die Ausgewogenheit und Eignung eines Essensplans auf einen Blick zu beurteilen.

## What Changes

- **Robuste Frontend-Fallbacks für Nährwert-Richtwerte**: Hinzufügen von statischen DGE-Richtwerten (Deutsche Gesellschaft für Ernährung) für Jugendliche (13-18 Jahre) als Fallbacks im Frontend-Code für alle 7 Hauptparameter (Energie, Eiweiß, Fett, Kohlenhydrate, Zucker, Ballaststoffe, Salz). Dies stellt sicher, dass der farbige `SollIstBar`-Vergleichsbalken immer angezeigt wird, selbst wenn die Datenbankregeln nicht geseedet sind oder geladen werden.
- **Soll-Werte im Säulendiagramm**: Erweiterung des Nährstoff-Verteilungsdiagramms (`NutrientBalanceChart`) zu einem interaktiven Ist- vs. Soll-Vergleichsdiagramm. Jede Säule erhält eine visuelle Referenz (z.B. eine gestreifte, transluzente Soll-Säule direkt daneben oder eine markierte Ziellinie).
- **Inhaltsreiche Tooltips**: Aktualisierung der Tooltips im Säulendiagramm, um sowohl den aktuellen "Ist-Wert" als auch den empfohlenen "Soll-Bereich" in Gramm bzw. kcal anzuzeigen.

## Capabilities

### New Capabilities
<!-- Keine neuen Kern-Funktionen auf Systemebene, sondern eine UI-Verfeinerung bestehender Features -->

### Modified Capabilities
- `extended-nutrition-rules`: Die Visualisierung der Regeln wird robuster gestaltet, indem im Frontend feste DGE-Fallbackwerte für die Nährwertbereiche genutzt werden, falls keine DB-Regeln verfügbar sind. Zudem wird das Diagramm um eine Soll-Ist-Vergleichs-Anzeige erweitert.

## Impact

- **Affected Frontend Components**:
  - `frontend-food/src/pages/planning/NutritionView.tsx` (Zusatz der Fallback-Logik)
  - `frontend-food/src/components/charts/NutrientBalanceChart.tsx` (Umstellung auf Recharts BarChart mit gruppierten Säulen für Ist und Soll-Richtwerte)
- **APIs & Backend**: Keine Änderungen am Backend oder an den APIs erforderlich (breaking-free).
