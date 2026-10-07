## ADDED Requirements

### Requirement: Gemeinsamer Formatter für Zutatenmengen
Alle Anzeigeorte einer Zutatenmenge (Rezept-Detail, Wizard, Essensplan Tabellen- und Slot-Ansicht, Referenz-Mahlzeit) SHALL dieselbe Funktion verwenden. Ist die Menge eine Portionsanzahl (benannte Portion, vorgewogene Portion wie „EL 15 g", zusammengesetzte oder stückartige Portion), MUSS die Anzeige die Portion benennen („0,5 EL") und das Gewicht als Zusatz nennen. Der Name der Messeinheit der Portion (z. B. „Gramm") DARF NICHT als Einheit einer Portionsanzahl angezeigt werden. Nur direkte Metrikmengen (Portion „Gramm" mit 1 g, ohne Portion) zeigen Zahl plus g/ml.

#### Scenario: Vorgewogene Portion im Plan
- **WHEN** ein Plan-Eintrag `quantity=0.5` mit der Portion „EL" (Messeinheit Gramm, 15 g) hat
- **THEN** zeigt die Zeile „0,5 EL (7,5 g)" und nicht „0,5 Gramm (15g)"

#### Scenario: Direkte Grammmenge
- **WHEN** ein Plan-Eintrag `quantity=150` mit der Einheit Gramm und ohne Portion hat
- **THEN** zeigt die Zeile „150 g"

#### Scenario: Gleiche Anzeige im Rezept und im Plan
- **WHEN** dieselbe Zutat mit derselben Portion und Menge im Rezept und im Essensplan angezeigt wird
- **THEN** sind Menge, Einheit und Gewichtszusatz in beiden Ansichten gleich

#### Scenario: Referenz-Mahlzeit
- **WHEN** die Referenz-Mahlzeit einen Eintrag mit Portion anzeigt
- **THEN** nutzt sie denselben Formatter und zeigt die Portion statt einer gerundeten Zahl mit Messeinheit
