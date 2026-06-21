## ADDED Requirements

### Requirement: Zutaten im Edit-Mode nach Gewicht sortieren

Der InlineIngredientEditor SHALL Zutaten beim Initialisieren nach `weight_g` absteigend sortieren, so dass die Reihenfolge mit dem View-Mode (IngredientList) übereinstimmt.

#### Scenario: Edit-Mode übernimmt Gewichts-Sortierung
- **WHEN** ein Nutzer auf "Bearbeiten" klickt und in den Edit-Mode wechselt
- **THEN** SHALL die Zutatenliste nach `weight_g` absteigend sortiert sein (schwerste Zutat zuerst)
- **THEN** SHALL die Reihenfolge identisch zur Anzeige im View-Mode sein

#### Scenario: Sortierung bleibt bei Menge-ändern stabil
- **WHEN** ein Nutzer die Menge einer Zutat im Edit-Mode ändert
- **THEN** SHALL die Position der Zutat in der Liste unverändert bleiben (kein Live-Re-Sort)
