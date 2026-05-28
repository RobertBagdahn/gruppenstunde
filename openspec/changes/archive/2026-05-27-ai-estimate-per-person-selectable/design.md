## Context

Die AI-Mengenschätzung in `InlineIngredientEditor.tsx` zeigt aktuell eine Tabelle mit "pro Person" und "Gesamt" (hochgerechnet auf `editServings`). Alle Werte werden per "Übernehmen"-Button auf einmal appliziert. Das Backend (`recipe/services/ai_ingredients_service.py`) liefert bereits `quantity_per_person` und `unit` pro Item.

## Goals / Non-Goals

**Goals:**
- Nur pro-Person-Werte anzeigen (keine Hochrechnung)
- Alt/Neu-Vergleich pro Zutat-Zeile
- Einzelselektion per Checkbox (default: unchecked)
- Nur selektierte Zeilen übernehmen

**Non-Goals:**
- Backend-Änderungen
- Schema-Änderungen
- Unit-Konvertierung oder intelligentes Runden

## Decisions

1. **Kein "Gesamt"-Spalte mehr** — Die Spalte "pro Person" wird zur einzigen Mengenspalte. Die Portionen-Hochrechnung entfällt komplett aus dem Dialog.

2. **State: `Set<number>` für selektierte Item-IDs** — Ein `useState<Set<number>>` trackt welche Zeilen ausgewählt sind. Default ist leer (nichts ausgewählt).

3. **Apply-Logik schreibt `quantity_per_person`** — `handleApplyEstimate` schreibt nur für selektierte Items den neuen Wert. Da Rezepte auf 1 Portion normiert sind, wird `quantity_per_person` direkt als `quantity` im Item gespeichert.

4. **"Alle auswählen / abwählen"** — Ein Toggle im Header ermöglicht Bulk-Auswahl.

5. **Alt-Wert-Anzeige** — Der aktuelle `quantity + unit` aus `editItems` wird als "Alt" angezeigt. Wenn kein Wert vorhanden: `—`.

## Risks / Trade-offs

- **Mehr Klicks nötig**: User muss jetzt aktiv Checkboxen anklicken. Mitigiert durch "Alle auswählen"-Button.
- **Kein Undo**: Einmal übernommen, kein Zurück (außer nicht-Speichern). Akzeptables Risiko, da der Editor noch nicht gespeichert wurde bis "Speichern" geklickt wird.
