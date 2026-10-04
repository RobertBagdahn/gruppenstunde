## ADDED Requirements

### Requirement: Nährwerte werden beim Speichern auf Plausibilität geprüft
Das System SHALL beim Anlegen und Ändern einer Zutat enthaltene Nährwertfelder mit dem Plausibilitäts-Service prüfen. Physikalisch unmögliche Werte MUST mit `422` abgelehnt werden. Die Antwort MUST eine deutsche Meldung und die betroffenen Feldnamen enthalten. Als unmöglich gelten: negative Werte, Gramm-Felder über 100 g/100 g, Summe aus Eiweiß, Fett, Kohlenhydraten und Ballaststoffen über dem Grenzwert, Zucker größer als Kohlenhydrate und gesättigte Fettsäuren größer als Fett.

#### Scenario: Eiweiß über 100 g
- **WHEN** ein Nutzer eine Zutat mit `protein_g = 200` speichert
- **THEN** antwortet das System mit `422` und `fields` enthält `protein_g`
- **AND** die Zutat wird nicht gespeichert und kein Nutri-Score berechnet

#### Scenario: Zucker größer als Kohlenhydrate
- **WHEN** ein Nutzer `carbohydrate_g = 3` und `sugar_g = 8` speichert
- **THEN** lehnt das System mit `422` ab und nennt `sugar_g` und `carbohydrate_g`

#### Scenario: Plausible Werte
- **WHEN** die Werte keinen harten Befund auslösen
- **THEN** wird die Zutat gespeichert

### Requirement: Weiche Nährwert-Befunde sind Warnungen
Das System SHALL Befunde, die nicht physikalisch unmöglich sind (z. B. Energie passt nicht zu den Makros), nicht ablehnen, sondern in der Antwort als `nutrition_warnings` mit Code, Text und Feldern zurückgeben. Das Formular MUST sie nach dem Speichern anzeigen.

#### Scenario: Energie weicht von den Makros ab
- **WHEN** eine Zutat gespeichert wird, deren Energie stark von der Atwater-Berechnung abweicht
- **THEN** wird sie gespeichert
- **AND** die Antwort enthält eine Warnung `energy_mismatch`

### Requirement: Prüfung nur bei Änderung von Nährwerten
Das System SHALL die Nährwertprüfung bei Updates nur ausführen, wenn mindestens ein Nährwert gegenüber dem gespeicherten Wert geändert wird, und dabei die Payload-Werte über die gespeicherten Werte legen.

#### Scenario: Preisänderung an Bestandszutat mit schlechten Werten
- **WHEN** nur `price_per_kg` einer Zutat mit bereits unplausiblen Werten geändert wird, auch wenn das Formular die unveränderten Nährwerte mitsendet
- **THEN** wird die Änderung gespeichert

#### Scenario: Teiländerung wird gegen Bestand geprüft
- **WHEN** nur `sugar_g` geändert wird und dadurch größer als die gespeicherten Kohlenhydrate ist
- **THEN** lehnt das System mit `422` ab

### Requirement: Clientseitige Feldvalidierung
Die Formulare zum Erstellen und Bearbeiten von Zutaten und der Dialog „Neue Zutat prüfen“ im Rezept-Wizard SHALL dieselben harten Regeln mit sofortigen Feldfehlern anzeigen und `fields` aus einem `422` den Eingabefeldern zuordnen.

#### Scenario: Server-Ablehnung
- **WHEN** der Server mit `422` und `fields: ["protein_g"]` antwortet
- **THEN** zeigt das Eiweiß-Feld die Meldung inline an
