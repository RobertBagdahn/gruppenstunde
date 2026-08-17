## 1. Portionen-Anzeige verbessern

- [x] 1.1 In `PortionCard` die Anzeige `({portion.quantity}g, ~{portion.weight_g}g Gewicht)` ersetzen durch `≈ {weight_g}g` (außer bei Basis-Portion "g" mit weight_g=1)
- [x] 1.2 Placeholder des Quantity-Feldes im Edit-Modus von "Menge" auf "Anzahl" ändern

## 2. Ranking-Buttons implementieren

- [x] 2.1 ▲/▼ Buttons in `PortionCard` hinzufügen (Material Icons `arrow_upward`/`arrow_downward`), links neben dem Portionsnamen
- [x] 2.2 Buttons disabled wenn Portion am Rand ist (erster/letzter Eintrag)
- [x] 2.3 Click-Handler: `rank` mit Nachbar-Portion tauschen via `useUpdatePortion` Mutation (zwei Calls)
- [x] 2.4 Optimistic Update: Liste sofort umsortieren, bei Fehler Query invalidieren

## 3. Sortierung sicherstellen

- [x] 3.1 Portionen-Liste im Frontend nach `rank` sortiert rendern (aufsteigend)
- [x] 3.2 Prüfen dass Backend die Portionen nach `rank` sortiert zurückgibt (Model ordering: `["-priority", "rank", "name"]` – passt bereits)
