# context-recipe-suggestions Specification

## Purpose

Kontextbewusste Rezeptvorschläge für Mahlzeiten im Essensplan mit Scoring, Kategorisierung und KI-Enhancement.
## Requirements
### Requirement: IngredientSeason Modell

Das System SHALL ein IngredientSeason-Modell bereitstellen, das saisonale Verfügbarkeit von Zutaten abbildet.

#### Scenario: Modell-Struktur

- **WHEN** ein IngredientSeason-Eintrag angelegt wird
- **THEN** enthält er: ingredient FK, month (1-12), is_high_season (Boolean, default=True)
- **THEN** hat er einen UniqueConstraint auf (ingredient, month)

#### Scenario: Saison-Score Berechnung

- **WHEN** ein Rezept 10 Zutaten hat, davon 4 mit IngredientSeason-Einträgen für den aktuellen Monat
- **THEN** hat es einen season_score von 4/10 = 0.4
- **WHEN** ein Rezept 10 Zutaten hat, aber keine mit Saison-Einträgen
- **THEN** wird es als "neutral" behandelt (season_score = 0, kein Malus)
- **WHEN** ein Rezept 10 Zutaten hat, davon 2 mit is_high_season=true im aktuellen Monat
- **THEN** zählen diese 2 als "in season"
