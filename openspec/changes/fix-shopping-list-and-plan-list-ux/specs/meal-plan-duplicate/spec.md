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

### Requirement: Vorbelegte Daten passen zur Vorlage
Der Dialog „Als Vorlage verwenden“ SHALL das Ende so vorbelegen, dass der neue Plan dieselbe Anzahl Kalendertage wie die Vorlage umfasst: Ende = Startdatum + (Kalendertage der Vorlage − 1), mit der Endzeit der Vorlage. Weicht die Tagesanzahl ab oder liegt das Ende nicht nach dem Start, MUST der Dialog dies vor dem Absenden auf Deutsch melden und nichts senden. Das Backend zählt Kalendertage von Quelle und Ziel in Ortszeit.

#### Scenario: Abendstart
- **GIVEN** die Vorlage läuft vom 05.10. 08:00 bis 06.10. 19:00
- **WHEN** der Nutzer den Start auf den 16.10. 18:00 setzt
- **THEN** ist das Ende mit 17.10. 19:00 vorbelegt und das Erstellen gelingt

#### Scenario: Abweichende Tagesanzahl
- **WHEN** der Nutzer bei einer zweitägigen Vorlage ein Ende drei Kalendertage nach dem Start wählt und „Erstellen“ klickt
- **THEN** zeigt der Dialog „Der Zeitraum muss wie die Vorlage 2 Tage umfassen (aktuell 3 Tage).“ und sendet keine Anfrage
