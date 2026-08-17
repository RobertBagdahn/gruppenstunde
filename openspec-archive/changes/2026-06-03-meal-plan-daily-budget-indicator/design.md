## Context

Das Planungs-Frontend von Inspi (`frontend-food/`) bietet eine tabellarische Ansicht (`TableView.tsx`) zur Mahlzeiten- und Rezeptzuordnung. Um die Kosten während der Planung besser im Blick zu behalten, soll in dieser Tabellenansicht direkt das verbleibende oder überschrittene Budget pro Tag und Person angezeigt werden. Das Budget wird pro Speiseplan (`MealPlan`) in Euro pro Person und Tag konfiguriert (`budget_per_person_per_day`).

## Goals / Non-Goals

**Goals:**
- Anzeige eines Budget-Indikators in der Tagessummen-Zeile (Tabellenfuß) von `TableView.tsx` für jeden geplanten Tag.
- Berechnung der täglichen Kosten pro Person: `Tageskosten / Normportions`.
- Ampelschema für die farbliche Kennzeichnung (Grün, Gelb, Rot) inklusive Rahmen und Hintergrund-Styling.
- Anzeige des Differenzbetrags pro Person: verbleibend (`noch X,XX € / Pers.`) oder überschritten (`+X,XX € / Pers.`).
- Dynamisches Ausblenden des Indikators, wenn kein Budget für den Speiseplan definiert ist (`budget_per_person_per_day` ist null oder <= 0).

**Non-Goals:**
- Keine Anpassungen im Backend, da alle Daten über die bestehenden API-Endpunkte bereits geliefert werden.
- Keine Anpassungen an den Zod- oder Pydantic-Schemas.

## Decisions

### 1. Anzeigeort der Budget-Ampel
Wir platzieren den Budget-Indikator direkt im Tabellenfuß (`<tfoot>`) von `TableView.tsx` unter den Werten für `kcal` und `Gesamtkosten (€)`.
- **Begründung**: Dort laufen alle Tageswerte zusammen, und Planer sehen sofort, wie sich das Hinzufügen oder Entfernen eines Rezepts auf das Tagesbudget auswirkt.
- **Alternative**: Ein separates Dashboard oder Popover. Dies wäre jedoch weniger intuitiv und würde einen zusätzlichen Klick erfordern.

### 2. Visuelles Design des Indikators
Der Indikator wird als abgerundetes Badge mit Rahmen und Hintergrundfarbe implementiert:
- **Grün (Kosten <= Budget)**: `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Gelb (Kosten <= Budget * 1.2)**: `bg-amber-50 text-amber-700 border-amber-200`
- **Rot (Kosten > Budget * 1.2)**: `bg-red-50 text-red-700 border-red-200`
- **Text**: `noch X,XX € / Pers.` oder `+X,XX € / Pers.` (mit deutschen Umlauten und Kommaschreibweise).

## Risks / Trade-offs

- **[Risk]** Platzmangel bei vielen Tagen in der horizontal scrollbaren Tabelle.
  - **Mitigation**: Verwendung von kompakter Schriftgröße (`text-[10px]`) und kurzem Text, um ein Aufblähen der Spaltenbreite zu verhindern. Die Spalten haben bereits eine Mindestbreite von `min-w-[200px]`, was mehr als genug Platz bietet.
