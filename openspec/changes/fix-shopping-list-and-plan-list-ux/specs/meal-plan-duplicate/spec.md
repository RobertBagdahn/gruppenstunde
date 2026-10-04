## ADDED Requirements

### Requirement: Eingegebener Name bleibt unverändert
Beim Erstellen eines Plans aus einer Vorlage („Als Vorlage verwenden“) SHALL der im Dialog eingegebene Name unverändert als Plan-Name verwendet werden. Das Namensfeld darf mit „<Quellname> (Kopie)“ vorbelegt sein.

#### Scenario: Eigener Name
- **WHEN** der Nutzer im Dialog den Namen „Sommerlager 2027“ eingibt und erstellt
- **THEN** heißt der neue Plan „Sommerlager 2027“
- **AND** es wird kein „(Kopie)“ angehängt

#### Scenario: Vorbelegung
- **WHEN** der Dialog geöffnet wird
- **THEN** ist das Namensfeld mit „<Quellname> (Kopie)“ vorbelegt und änderbar
