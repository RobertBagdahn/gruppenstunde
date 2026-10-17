## Context

Die Food-Frontend-Queries laufen über einen globalen `QueryClient` (`src/main.tsx`). Dessen Standard erlaubte eine einzige Wiederholung für alle Fehler außer 4xx. Die Anmeldeprüfung `useCurrentUser` setzte zusätzlich `retry: false`. Bei 429 gab es deshalb keine Wiederholung, und die Seite zeigte die Anmeldeaufforderung. Beim Einkauf am 16.10.2026 hat der Server rund 235 Anfragen mit 429 abgewiesen, darunter die Sitzungsprüfung.

## Goals / Non-Goals

**Goals:**
- Kurze Überlastung führt nicht zu einer falschen Abmeldung.
- Überlastung wird wiederholt, ohne den Server weiter zu belasten.
- Schriftgrößen-Tokens bleiben in allen Komponenten erhalten.

**Non-Goals:**
- Offline-Modus oder Wiederholung von Mutationen.
- Umbau des Kopfbands auf anderen Detailseiten (siehe Open Questions).

## Decisions

### Eine Wiederholungsregel für alle Queries
`src/lib/queryRetry.ts` enthält `shouldRetryQuery` und `queryRetryDelay`. Der globale Standard und `useCurrentUser` nutzen dieselben Funktionen.
- Wiederholt werden 429, 5xx und `TypeError` (Netzfehler), höchstens zwei Wiederholungen.
- Wartezeit: `Retry-After` des Servers (höchstens 30 s), sonst 1 s, 2 s, bis 8 s.
- **Verworfen:** eigene Wiederholung je Seite. Dann hätten 29 Stellen mit `useCurrentUser` unterschiedliche Regeln.

### Sitzungsprüfung ohne Abmeldung bei Fehlern
Die Einkaufsseite unterscheidet drei Fälle:
1. Antwort `is_authenticated: false` (200) oder 401 → Anmeldeaufforderung.
2. Prüfung fehlgeschlagen nach allen Wiederholungen → „Anmeldung gerade nicht prüfbar“ mit „Erneut versuchen“.
3. Gast mit gültigem Gast-Token → bleibt auf der Liste, unabhängig von der Sitzungsprüfung.

### `cn()` kennt die Projekt-Schriftgrößen
`tailwind-merge` wird mit `extendTailwindMerge` um die Tokens `caption`, `body`, `emphasis`, `section`, `title`, `metric`, `display` erweitert. Ohne das las `twMerge` `text-body` als Farbe und verwarf sie neben `text-foreground`.

### Kopfband mit umbrechenden Aktionen
Die Kopfzeile der Einkaufsseite nutzt `flex-wrap`. Der Titel verwendet `break-words` statt `[overflow-wrap:anywhere]`, weil letzteres die Mindestbreite so klein macht, dass der Titel mitten im Wort bricht.
- **Verworfen:** kleinere Titelgröße auf Handys. Das würde alle Detailseiten betreffen und braucht eine Typografie-Entscheidung.

## Risks / Trade-offs

- **[Risiko]** Mehr Wiederholungen erhöhen die Last bei echter Überlastung. → Höchstens drei Versuche, Wartezeit wächst; `Retry-After` wird respektiert.
- **[Risiko]** Die Schriftgrößen-Korrektur verändert Darstellung dort, wo Größen bisher verloren gingen. → Visuelle Prüfung auf Rezept- und Einkaufsseiten vor dem Ausrollen.
- **[Trade-off]** Die Wiederholung betrifft auch Seiten ohne eigene Fehlermeldung für die Anmeldung. Diese zeigen nach erschöpften Wiederholungen weiterhin die Anmeldeaufforderung.

## Open Questions

- Sollen die übrigen 28 Seiten mit `useCurrentUser` dieselbe Meldung „Anmeldung gerade nicht prüfbar“ erhalten statt der Anmeldeaufforderung?
- Soll der Titel-Umbruch auf allen Detailseiten gelten?
