## Context

Die Funktion `calculateNaturalPortions()` in `frontend-food/src/lib/portionDisplay.ts` berechnet für jede Zutat eine menschenlesbare Portionsanzeige ("ca. 3 x Stück"). Sie teilt das Gesamtgewicht durch `portion.weight_g`. Bei Portionen mit `weight_g=1` (Fallback "Gramm"-Portion) ergibt das identische Zahlen zur bereits angezeigten Gramm-Angabe — redundant und bei großen Mengen verwirrend.

## Goals / Non-Goals

**Goals:**
- Redundante Portionsanzeige bei `weight_g <= 1` unterdrücken
- Sinnvolle Portionen (z.B. "1 Stück Gurke = 300g") weiterhin anzeigen

**Non-Goals:**
- Änderung der Backend-Logik zur Portion-Erstellung
- Automatische Erkennung/Korrektur fehlender sinnvoller Portionen
- Änderung des Portion-Datenmodells

## Decisions

1. **Filter in `calculateNaturalPortions()`**: Portionen mit `weight_g <= 1` werden übersprungen (`continue`). Das ist der einfachste Eingriff mit minimalem Blast-Radius.

2. **Schwellenwert `<= 1`**: Eine Portion mit 1g Gewicht liefert nie nützliche Information (die Gramm-Zahl steht schon daneben). Portionen ab 2g aufwärts können theoretisch sinnvoll sein (z.B. "1 Prise = 2g").

3. **Kein Fallback-Text**: Wenn nach dem Filtern keine Portionen übrig bleiben, wird einfach keine "ca."-Zeile angezeigt. Das ist besser als eine unsinnige Anzeige.

## Risks / Trade-offs

- **Minimal**: Nutzer die tatsächlich eine "1g = 1 Stück"-Portion sinnvoll finden, sehen diese nicht mehr. Dieses Szenario existiert in der Praxis nicht.
- **Einfach revertierbar**: Ein-Zeilen-Änderung, kein Schema/API-Impact.
