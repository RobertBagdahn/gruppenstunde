## Context

`MealItem` hat bereits ein `factor`-Feld (FloatField, default=1.0). Nährwert- und Kostenberechnungen nutzen diesen Factor bereits korrekt. Es fehlen nur die API zum Updaten und das Frontend-UI zum Editieren.

## Goals / Non-Goals

**Goals:**
- PATCH-Endpunkt zum Ändern des MealItem-Factors
- Immer sichtbares Inline-Input für den Factor im Essensplan (Option B)
- Dezimaleingabe (z.B. 0.33), keine Bruch-Darstellung

**Non-Goals:**
- Validierung der Factor-Summe pro Meal (explizit ausgeschlossen)
- Factor beim Hinzufügen setzen (nur nachträglich)
- Bulk-Update mehrerer Items gleichzeitig

## Decisions

| Entscheidung | Begründung |
|---|---|
| PATCH statt PUT | Nur `factor` wird geändert, kein vollständiges Ersetzen nötig |
| Immer sichtbares Input (Option B) | Benutzer soll ohne extra Klick den Factor sehen und ändern können |
| Dezimalzahl, kein Bruch | Einfacher zu implementieren, flexibler (0.33, 0.5, 2.0) |
| Debounced Save (on blur / Enter) | Vermeidet zu viele API-Calls beim Tippen |
| Keine Validierung der Summe | Explizite Anforderung — verschiedene Anwendungsfälle brauchen verschiedene Summen |

## Risks / Trade-offs

- **Kein visueller Hinweis bei "ungewöhnlichen" Factors**: Ein Factor von 0.01 oder 50.0 könnte ein Tippfehler sein, wird aber akzeptiert. Akzeptables Risiko bei erfahrenen Nutzern.
- **Input-Breite**: Kleines Input-Feld muss trotzdem Werte wie "0.33" gut darstellen können. Lösung: feste Breite ~60px.
