## MODIFIED Requirements

### Requirement: Normportionen-Anzeige

Das System MUSS die Portionen-Anzeige auf der Rezept-Detailseite mit einem erklärenden Hinweis versehen und die reine Portionenzahl nicht mehr isoliert darstellen.

#### Scenario: Normportionen-Hinweis anzeigen
- **WHEN** die Rezept-Detailseite angezeigt wird
- **THEN** MUSS anstelle der reinen Portionenzahl ein erklärender Hinweis angezeigt werden: „Dieses Rezept ist berechnet für X Normportion(en). Eine Normportion basiert auf einem 15-jährigen Pfadfinder (PAL 1,5)."
- **THEN** MUSS der PortionScaler weiterhin funktionieren, aber mit dem Kontext-Hinweis

#### Scenario: Portionen-Badge in Kacheln
- **WHEN** ein Rezept in der Listenansicht als Kachel angezeigt wird
- **THEN** MUSS der Portionen-Badge entfernt werden (da ohne Kontext irreführend)

### Requirement: Gewichtsanzeige mit automatischer Einheitenkonvertierung

Das System MUSS große Grammzahlen automatisch in Kilogramm konvertieren.

#### Scenario: Gewicht >= 1000g
- **WHEN** eine Gewichtsangabe >= 1000g angezeigt wird (in Zutatenliste, Einkaufsliste, Nährwertanalyse)
- **THEN** MUSS die Anzeige in Kilogramm erfolgen, gerundet auf eine Dezimalstelle (z.B. 1500g → 1,5 kg, 2300g → 2,3 kg, 1000g → 1 kg)

#### Scenario: Gewicht < 1000g
- **WHEN** eine Gewichtsangabe < 1000g angezeigt wird
- **THEN** MUSS die Anzeige in Gramm erfolgen, ganzzahlig gerundet (z.B. 253.7g → 254 g)

#### Scenario: Sehr kleine Mengen
- **WHEN** eine Gewichtsangabe < 1g angezeigt wird
- **THEN** MUSS die Anzeige in Gramm mit einer Dezimalstelle erfolgen (z.B. 0.5g → 0,5 g)

### Requirement: Autor-Position

Das System MUSS den Autor-Bereich am unteren Ende der Rezept-Detailseite anzeigen.

#### Scenario: Autor unten anzeigen
- **WHEN** die Rezept-Detailseite gerendert wird
- **THEN** MUSS der Autor-Bereich (Name, Avatar, Link) nach der Beschreibung und vor den Kommentaren positioniert sein
- **THEN** MUSS der Autor NICHT mehr in der oberen Info-Box erscheinen
