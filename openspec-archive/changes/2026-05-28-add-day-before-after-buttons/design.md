## Context

Die MealPlanDetailPage zeigt Tage chronologisch sortiert an. Jeder Tag wird über `POST /api/meal-plans/{id}/days/` mit `{ date: "YYYY-MM-DD" }` erstellt. Aktuell gibt es einen Date-Picker + "Tag hinzufügen" Button. Die gruppierten Tage sind im Frontend als sortiertes Array verfügbar (`groupedByDate`).

## Goals / Non-Goals

**Goals:**
- Schnelles Erweitern des Plans um einen Tag am Anfang oder Ende
- Kein manuelles Datum-Auswählen nötig für den häufigsten Fall
- Konsistente UX mit bestehendem "Tag hinzufügen"-Flow

**Non-Goals:**
- Bestehenden Date-Picker entfernen (bleibt für beliebige Tage)
- Backend-Änderungen
- Mehrere Tage auf einmal hinzufügen

## Decisions

1. **Button-Platzierung**: "Tag davor" oben vor der Tagesliste, "Tag danach" unten nach der Tagesliste. So ist die räumliche Zuordnung intuitiv.

2. **Datum-Berechnung**: Frontend berechnet `firstDate - 1 day` bzw. `lastDate + 1 day` mit date-fns (`subDays`, `addDays`). Format als `yyyy-MM-dd` für die API.

3. **Leerer Zustand**: Wenn noch keine Tage existieren, werden beide Buttons ausgeblendet — der Date-Picker ist dann der einzige Weg.

4. **Fehlerfall "Tag existiert bereits"**: API gibt 400 zurück, Toast-Fehler wird angezeigt. Kein pre-check nötig da der Fall selten ist (nur wenn Tage nicht zusammenhängend sind).

5. **Styling**: Outline-Buttons mit ChevronLeft/ChevronRight Icons, volle Breite passend zum Card-Layout der Tage.

## Risks / Trade-offs

- **Lücken im Plan**: Wenn Tage nicht zusammenhängend sind (z.B. Mo, Mi), fügt "Tag davor" den Sonntag hinzu, nicht den Dienstag. Das ist korrekt und erwartbar.
- **Keine Validierung gegen Duplikate im Frontend**: Bewusst akzeptiert — die API validiert sicher, und der Fall tritt selten auf.
