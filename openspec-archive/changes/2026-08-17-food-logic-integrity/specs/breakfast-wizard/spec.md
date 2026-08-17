## MODIFIED Requirements

### Requirement: Wizard-Einstieg über RefMeal-Frühstück

Das System SHALL den Frühstücks-Wizard über die bestehenden RefMeal- und DirectMeal-Routen öffnen und vorhandene RefMeal-Daten nach dem asynchronen Laden vollständig vorausfüllen.

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück und der Katalog geladen sind
- **THEN** öffnet sich der Wizard mit rekonstruierten Mengen und Verteilungen für Basis, Belag, Streichfett und Getränke

#### Scenario: Getränkerezepte werden korrekt erkannt
- **WHEN** ein gespeichertes Frühstück ein Rezept mit `recipe_type="drink"` enthält
- **THEN** wird es beim Rehydratisieren als Getränk eingeordnet

#### Scenario: Abbrechen im Edit-Mode kehrt zur Vorschau zurück
- **WHEN** der Nutzer einen bestehenden Wizard abbricht
- **THEN** navigiert das System zurück zur Vorschau und ändert das RefMeal nicht
