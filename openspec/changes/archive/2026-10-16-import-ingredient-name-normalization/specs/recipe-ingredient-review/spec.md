## ADDED Requirements

### Requirement: Keine Neu-Vorbelegung bei vorhandenem Treffer
Der Zutaten-Review SHALL keine neue Zutat zum Anlegen vorbelegen, wenn nach der Normalisierung ein Voll- oder Kopf-Treffer oder ein Kandidat oberhalb der Grauzone existiert. „Neue Zutat anlegen“ MUST als auswählbare Option erhalten bleiben.

#### Scenario: Eier
- **WHEN** `große Ei(er), Größe L` importiert wird und `Eier (Größe M)` existiert
- **THEN** ist keine neue Zutat „Ei“ vorbelegt
- **AND** `Eier (Größe M)` erscheint als Vorschlag mit Status „zu prüfen“

#### Scenario: Wirklich unbekannte Zutat
- **WHEN** keine Zutat oberhalb der Grauzone existiert
- **THEN** ist die Neuanlage vorbelegt wie bisher

### Requirement: Zuordnung per Klick bereinigt das Neu-Formular
Wählt der Nutzer eine vorhandene Zutat, SHALL das Formular „Neue Zutat prüfen“ der Zeile ausgeblendet werden.

#### Scenario: Alternative gewählt
- **WHEN** der Nutzer bei einer Zeile eine Alternative auswählt
- **THEN** verschwindet das Formular „Neue Zutat prüfen“
