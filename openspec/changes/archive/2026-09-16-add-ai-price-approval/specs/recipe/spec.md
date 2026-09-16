## ADDED Requirements

### Requirement: Rezeptpreis-Abdeckung
Rezeptkosten SHALL bekannte Preise als Teilbetrag berechnen und zusätzlich Gesamtanzahl, bepreiste Anzahl, fehlende Anzahl und Preisabdeckung ausgeben.

#### Scenario: Teilweise bepreistes Rezept
- **WHEN** 7 von 9 aktiven Rezeptzutaten einen bestätigten positiven Preis besitzen
- **THEN** SHALL die API den bekannten Teilbetrag und `7/9` Preisabdeckung liefern
- **THEN** SHALL der Food-Client einen Hinweis auf die fehlenden Preise anzeigen

#### Scenario: Kein Preis
- **WHEN** keine aktive Rezeptzutat einen positiven Preis besitzt
- **THEN** SHALL der Preisbetrag null/unknown bleiben und der Client `Keine Preise` anzeigen
