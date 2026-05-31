## Context

Die `MealSlot` Komponente in `MealEventDetailPage.tsx` zeigt Mahlzeiten im Essensplan an. Meals können mit einem RefMeal verknüpft werden (`is_synced = true`), wobei die Inhalte aus der Referenz-Mahlzeit synchronisiert werden. Aktuell ist dieser Zustand visuell kaum unterscheidbar vom normalen Zustand.

## Goals / Non-Goals

**Goals:**
- Verknüpfte Meals klar als "read-only" und "aus Vorlage" erkennbar machen
- User versteht sofort: "Diese Inhalte kommen von woanders und kann ich hier nicht bearbeiten"
- Entkoppeln-Aktion bleibt erreichbar über `link_off` Icon

**Non-Goals:**
- Keine Änderung am RefMeal-Editor selbst
- Keine Backend-Änderungen
- Keine neuen API-Endpunkte

## Decisions

1. **Read-only bei `is_synced`**: Wenn verknüpft, werden Add-Recipe-Button (+), Factor-Input und Item-Delete-Button komplett ausgeblendet (nicht nur disabled)

2. **Visuelles Feedback**: Items bekommen `text-muted-foreground` Klasse (Tailwind grau). Kein opacity — bleibt lesbar aber klar "passiv"

3. **Label "Referenz-Mahlzeit"**: Wird als `text-xs text-blue-500 font-medium` über den Items angezeigt, mit einem `sync` Icon davor. Format: `↻ Referenz-Mahlzeit`

4. **Icon-Logik bleibt wie gehabt**: `link` (grau) wenn nicht verknüpft, `link_off` (blau) wenn verknüpft. Das 🔗 Emoji im Header wird entfernt (redundant)

5. **Kein Wrapper/Container**: Die Items werden direkt grau, kein extra Border oder Box um den "Referenz"-Bereich

## Risks / Trade-offs

- **Risiko**: User könnte denken die Mahlzeit sei "kaputt" weil alles grau ist → Mitigation: Label "Referenz-Mahlzeit" macht klar warum
- **Trade-off**: Add-Button komplett weg vs. disabled → Entscheidung: Weg, weniger Clutter
