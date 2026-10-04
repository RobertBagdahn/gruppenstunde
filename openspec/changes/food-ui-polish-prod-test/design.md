## Context

Die Punkte sind unabhängig voneinander, klein und liegen alle im Frontend; nur der Duplikat-Hinweis braucht eine kleine Backend-Antwort. Gemeinsame Regel für alle: Fehlerzustände und Zahlen müssen für den Nutzer eindeutig und aktuell sein.

## Goals / Non-Goals

**Goals:**
- Keine widersprüchlichen oder veralteten Zahlen in Planer und Wizard.
- Fehlermeldungen sagen, was falsch ist und was zu tun ist.

**Non-Goals:**
- Kein Umbau der Wizard-Schrittlogik, keine Slug-Änderungen.

## Decisions

- **Schritt-Zähler per Pfad.** `getVisibleSteps` bekommt die Pfad-Annahme; solange keine Eingabe gemacht wurde, wird die Variante mit Review-Schritt gezählt. Alternative „Zähler ausblenden“ wurde verworfen (Orientierung).
- **Optimistische Plan-Summen.** `removeItemFromPlan` und `scaleItemInPlan` (reine Funktionen in `api/mealPlanOptimistic.ts`) führen Kosten und kcal des Eintrags und die Mahlzeit-Totals sofort nach. Entfernen, Faktor und Menge nutzen sie in `onMutate`, bei Fehlern wird der vorherige Stand wiederhergestellt, `onSettled` lädt neu. Alternative „Header mit Ladezustand“ wurde verworfen, weil die Rechnung einfach und exakt genug ist.
- **Duplikat-Hinweis.** Backend antwortet bei vorhandenem Namen mit `409` und `existing: {id, slug, name}`; das Frontend zeigt „Die Zutat ‚Salz‘ gibt es schon“ mit Link. Alternative „nur Text“ wurde verworfen, weil der Nutzer sonst suchen muss.
- **Auth-Seiten.** `LoginPage`/`RegisterPage` prüfen die Session und leiten per `Navigate` weiter, ohne Flackern (erst nach geladenem Auth-Status).

## Risks / Trade-offs

- [Optimistische Plan-Summe weicht von der Server-Summe ab] → Server-Antwort ersetzt den lokalen Wert, Invalidierung bleibt; Items ohne brauchbaren Altwert (0 oder fehlend) bleiben dem Server überlassen.
- [Weiterleitung eingeloggter Nutzer bricht Re-Auth-Flows] → Ausnahme für `mode=reauth`/`next`-Parameter.

## Migration Plan

Keine.

## Open Questions

Keine.
