## Context

Die Funktion `smartRound()` in `frontend-food/src/lib/unitConversion.ts` wird von `formatQuantity()` aufgerufen, um Zutatenmengen in der Rezept-Normalansicht benutzerfreundlich zu runden. Aktuell rundet sie alles unter 100g auf 5er-Schritte, was bei kleinen Mengen zu falschen oder unsinnigen Werten führt (z.B. 0g statt 0,25g).

## Goals / Non-Goals

**Goals:**
- Kleine Mengen (< 10g) sinnvoll gerundet anzeigen
- Keine Menge darf auf 0 gerundet werden, wenn der Eingabewert > 0 ist
- Bestehendes Verhalten für größere Mengen (≥ 10g) beibehalten

**Non-Goals:**
- Änderung der Portionsanzeige-Logik (`portionDisplay.ts`)
- Änderung der Edit-Mode-Darstellung
- Backend-Änderungen

## Decisions

1. **Gestufte Rundung statt einheitlicher 5er-Schritte**: Mengen unter 10g werden feiner gerundet. Die Stufen:
   - `< 1g`: Runden auf 0,1
   - `1–10g`: Runden auf 1
   - `10–100g`: Runden auf 5 (unverändert)
   - `100–999g`: Runden auf 10 (unverändert)
   - `≥ 1000g`: Runden auf 50 (unverändert)

2. **Mindestens den Rundungsschritt anzeigen**: Wenn ein Wert > 0 ist aber unter dem kleinsten Rundungsschritt liegt, wird auf den Mindestwert (0,1) aufgerundet, nie auf 0.

3. **Gleiche Logik für Volumen**: Da `formatVolume()` ebenfalls `smartRound()` nutzt, profitiert die ml-Anzeige automatisch.

## Risks / Trade-offs

- **Mehr Nachkommastellen bei Kleinstmengen**: "0,3 g" sieht ungewöhnlich aus, ist aber korrekt und besser als "0 g"
- **Kein Risiko für bestehende Werte ≥ 10g**: Die oberen Stufen bleiben identisch
