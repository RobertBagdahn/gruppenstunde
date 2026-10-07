# pdf-amount-formatting Specification

## Purpose
Gewichtsbasierte Mengenformatierung für gedruckte Exporte: Rezept- und Direktzutaten-Karten, Schritt-Platzhalter und Einkaufsliste im App-Format; Stückzahl und Gewicht erscheinen gemeinsam.

## Requirements

### Requirement: Gewichtsbasierte Mengen auf Rezeptkarten
Mengen auf gedruckten Rezept- und Direktzutaten-Karten SHALL aus dem vertrauenswürdigen Portionsgewicht (`quantity × weight_g`) berechnet werden und MUST NOT die Portionsanzahl mit dem Namen der Maßeinheit ausgeben. Gewichte ab 1000 g SHALL in kg, Volumen ab 1000 ml in l ausgegeben werden. Piece-Portionen SHALL als Stückzahl mit Gesamtgewicht in Klammern erscheinen.

#### Scenario: Pre-weighed Portion
- **WHEN** eine Zutat die Portion „100g Gurke" (weight_g 100) mit quantity 0,3 hat und 35 Personen skaliert werden
- **THEN** zeigt die Karte „1,05 kg" statt „10,5 Gramm"

#### Scenario: Volumen-Portion
- **WHEN** eine Zutat quantity 3 auf der Portion „1 EL (10ml)" (weight_g 10) hat und 35 Personen skaliert werden
- **THEN** zeigt die Karte „1,05 l"

#### Scenario: Piece-Portion
- **WHEN** eine Zutat quantity 1,5 auf der Portion „Stück" (60 g) hat und 37 Personen mit Faktor 1,5 skaliert werden
- **THEN** zeigt die Karte „56 Stück (≈ 3,33 kg)" mit ganzzahliger Stückzahl ab 10 Stück

#### Scenario: Direkte Metrik-Portion
- **WHEN** die Portion „Gramm" (quantity 1, weight_g 1) genutzt wird und quantity 16 mit 34 Personen skaliert wird
- **THEN** zeigt die Karte „544 g"

#### Scenario: Stück-Portion mit unbestätigtem Gewicht
- **WHEN** eine Stück-Portion ein gespeichertes, aber nicht bestätigtes Gewicht über 1 g hat
- **THEN** zeigt die Karte Stückzahl und das Gewicht als „≈"-Richtwert

#### Scenario: Portion ohne verwertbares Gewicht
- **WHEN** das Gewicht fehlt oder nur der Altwert 1 g je Stück vorliegt
- **THEN** zeigt die Karte nur die Stückzahl bzw. „N × Portionsname" und MUST NOT eine Gramm-Zahl erfinden

### Requirement: Direktzutaten mit gewählter Portion
Für `MealItem` mit gewählter Portion SHALL das PDF `quantity` als Portionsanzahl pro Person behandeln und das Gewicht über das Portionsgewicht berechnen.

#### Scenario: Samstags-Frühstück
- **WHEN** ein `MealItem` „Margarine" quantity 0,16 auf der Portion „100g" (weight_g 100) für 33 Personen hat
- **THEN** zeigt das PDF „528 g" und die Pro-Person-Angabe „à 16 g p. P."

### Requirement: Pro-Person-Angabe
Rezept- und Frühstückskarten SHALL zusätzlich die Menge pro Person als kleine Zweitangabe zeigen.

#### Scenario: Pro-Person-Angabe neben Gesamtmenge
- **WHEN** eine Karte die Gesamtmenge 544 g bei 34 Personen zeigt
- **THEN** steht daneben „à 16 g p. P."

### Requirement: Skalierte Schritt-Platzhalter
Platzhalter in Zubereitungsschritten SHALL im PDF mit dem Skalierungsfaktor des Gerichts und mit portionsbewusstem Mengenformat aufgelöst werden.

#### Scenario: Platzhalter in Schritt
- **WHEN** ein Schritt den Platzhalter `{Salatgurke}` enthält und das Gericht für 35 Personen skaliert wird
- **THEN** wird der Platzhalter mit der skalierten Menge (z. B. „1,05 kg Salatgurke") ersetzt statt „0.3g Salatgurke"

### Requirement: Einkaufsliste im App-Format
Die Einkaufsliste im PDF SHALL Mengen im Format der App ausgeben: Menge, dann Packungsbedarf oder Stückäquivalent („8,8 kg · 18 × 500-g-Packung"). Stückäquivalente im PDF SHALL auf ganze Stück aufgerundet werden.

#### Scenario: Packungsbedarf
- **WHEN** eine Zutat 8800 g benötigt und eine 500-g-Packung hinterlegt ist
- **THEN** zeigt die Zeile „8,8 kg · 18 × 500-g-Packung"

#### Scenario: Stückäquivalent aufrunden
- **WHEN** das Stückäquivalent einer Zutat 22,8 Stück beträgt
- **THEN** zeigt die Zeile „≈ 23 Stück" zusammen mit dem Gewicht

#### Scenario: Flüssigkeit
- **WHEN** eine Zutat ein Flüssigkeits-Viskositätsprofil hat und 9100 g bei Dichte 1,0 benötigt
- **THEN** zeigt die Zeile „9,1 l"

### Requirement: Stückzahl und Gewicht immer gemeinsam
Wo sowohl eine Stückzahl als auch ein Gewicht bekannt sind, SHALL das PDF beides zeigen (Rezeptkarten und Einkaufsliste). Ein Gewicht ohne vertrauenswürdige Portionsbasis MUST NOT erfunden werden.

#### Scenario: Rezeptkarte mit Stückportion
- **WHEN** eine Zutat 56 Stück à 60 g benötigt
- **THEN** zeigt die Karte „56 Stück (≈ 3,33 kg)"

#### Scenario: Einkaufsliste mit Packung und Stückzahl
- **WHEN** eine Zutat 5700 g benötigt, ein 250-g-Stück hinterlegt ist und das Stückäquivalent 22,8 beträgt
- **THEN** zeigt die Zeile „5,7 kg · 23 × 250-g-Stück · ≈ 23 Stück"
