## MODIFIED Requirements

### Requirement: Stück-zu-Gramm-Anzeige mit Multiplikationszeichen

Die Anzeige einer Rezeptzutat mit Stückeinheit (z.B. Zwiebel: 1 Stück = 40g) SHALL das korrekte Multiplikationszeichen (×) verwenden. Das Gleichheitszeichen (=) als Operator ist verboten.

#### Scenario: Halbe Stückzahl mit Gramm-Äquivalent

- **WHEN** eine Rezeptzutat „0,5 Stück Zwiebel (40g pro Stück)" angezeigt wird
- **THEN** wird dargestellt: `0,5 × 40g = 20g`
- **THEN** wird NICHT dargestellt: `0,5 = 40g` oder `0,5 = 20g`

#### Scenario: Ganze Stückzahl

- **WHEN** eine Rezeptzutat „2 Stück Zwiebel (40g pro Stück)" angezeigt wird
- **THEN** wird dargestellt: `2 × 40g = 80g`

#### Scenario: Gramm-Berechnung korrekt

- **WHEN** 0,5 Stück einer Zutat mit 40g pro Stück angezeigt wird
- **THEN** ist das angezeigte Gramm-Äquivalent 20g (0,5 × 40g)
- **THEN** wird NICHT ein falscher Wert angezeigt

### Requirement: Preis-Bezugseinheit eindeutig beschriftet

Das Preiseingabe-Feld für Zutaten SHALL eindeutig als „Preis pro kg" beschriftet sein.

#### Scenario: Preis-Label im Zutat-Formular

- **WHEN** ein Nutzer eine Zutat anlegt oder bearbeitet
- **THEN** ist das Preisfeld mit „Preis pro kg" beschriftet
- **THEN** gibt es keinen Zweifel ob der Preis pro 100g oder pro kg gilt

### Requirement: Nährwertanalyse ausschließlich pro 100g auf Rezeptdetailseite

Alle Gesundheitsanalysen und Einordnungsbalken auf der Rezeptdetailseite SHALL ausschließlich pro-100g-Werte verwenden. Absolute Werte werden in der Analyse nicht gezeigt. Dies ist konsistent mit dem Nutri-Score der ebenfalls pro 100g bewertet.

#### Scenario: Einordnungsbalken nach Portionsänderung

- **WHEN** der Nutzer die Portionszahl auf 4 ändert
- **THEN** ändern sich die Einordnungsbalken (Protein-Ranking, Preis-Ranking etc.) NICHT
- **THEN** bleiben alle Analysen auf pro-100g-Basis

#### Scenario: Gesundheits-Score pro 100g

- **WHEN** der Gesundheits-Score eines Rezepts angezeigt wird
- **THEN** basiert er auf dem Nährwertprofil pro 100g
- **THEN** ist die Basis „pro 100g" sichtbar beschriftet
