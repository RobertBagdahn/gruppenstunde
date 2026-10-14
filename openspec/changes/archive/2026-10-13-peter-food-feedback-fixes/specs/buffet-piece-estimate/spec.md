## ADDED Requirements

### Requirement: Stückzahl für Buffet-Zutaten mit bestätigtem Einzelgewicht schätzen

Der Buffet-Builder SHALL bei ausgewählten Zutaten mit vertrauenswürdigem Stückgewicht eine klar als Näherung markierte Gesamtstückzahl berechnen. Die Schätzung SHALL nur angezeigt werden, wenn die Rollenmenge in Gramm vorliegt und eine aktive, stückartige Portion ein bestätigtes oder importiertes positives Gewicht besitzt. Die Rechnung SHALL Rollenmenge pro Person × Item-Anteil × effektive Personenzahl ÷ Grammgewicht pro Stück verwenden. Die API darf dazu ausschließlich bestätigte/importierte Stückgewichte als `piece_weight_g` liefern. Ohne vertrauenswürdiges Stückgewicht SHALL keine Stückzahl geraten werden.

#### Scenario: Brötchen mit bestätigtem Stückgewicht

- **GIVEN** eine Buffetrolle enthält 140 g pro Person, 34 effektive Personen und Brötchen mit bestätigtem Stückgewicht 55 g
- **AND** Brötchen haben 100 % Anteil an der Rolle
- **WHEN** der Nutzer das Buffet zusammenstellt
- **THEN** SHALL die UI ungefähr 87 Brötchen insgesamt anzeigen
- **AND** SHALL den Wert sichtbar als Näherung kennzeichnen

#### Scenario: Teilanteil innerhalb der Rolle

- **GIVEN** Brötchen erhalten 50 % einer 140-g-Rolle für 34 Personen und wiegen bestätigt 55 g je Stück
- **WHEN** der Builder die Schätzung darstellt
- **THEN** SHALL die Schätzung ungefähr 43 Brötchen betragen

#### Scenario: Stückgewicht fehlt oder ist nicht vertrauenswürdig

- **GIVEN** für eine Zutat gibt es keine aktive stückartige Portion mit bestätigtem/importiertem Gewicht
- **WHEN** die Buffetrolle angezeigt wird
- **THEN** SHALL keine Stückzahlschätzung erscheinen
