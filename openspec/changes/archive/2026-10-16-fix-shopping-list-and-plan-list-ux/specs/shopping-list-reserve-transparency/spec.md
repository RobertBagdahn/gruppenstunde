## ADDED Requirements

### Requirement: Reserve in der Anzeigeeinheit der Menge
Die Einkaufsliste SHALL den Packungsrest („Reserve“) in derselben Einheitenart wie die Menge anzeigen: Millilitern bei Mengen in ml, sonst Gramm. Ist keine Umrechnung möglich, MUST die Reserve-Zeile entfallen, statt eine falsche Einheit zu zeigen.

#### Scenario: Olivenöl in ml
- **WHEN** die Menge „22 ml“ in einer 815-ml-Flasche angezeigt wird
- **THEN** lautet die Reserve „+ 793 ml Reserve“
- **AND** nicht „+ 730 g Reserve“

#### Scenario: Dichte fehlt
- **WHEN** die Menge in ml steht und die Zutat keine Dichte hat
- **THEN** wird keine Reserve angezeigt

### Requirement: Menge und Reserve ergeben die Packungsgröße
Die angezeigte Menge zuzüglich der angezeigten Reserve SHALL der Packungsgröße entsprechen. Die Reserve MUST aus der angezeigten (gerundeten) Menge berechnet werden.

#### Scenario: Zwiebel im 1-kg-Netz
- **WHEN** die angezeigte Menge „75 g“ in einem 1-kg-Netz beträgt
- **THEN** lautet die Reserve „+ 925 g Reserve“

#### Scenario: Parmesan im 200-g-Stück
- **WHEN** die angezeigte Menge „140 g“ in einem 200-g-Stück beträgt
- **THEN** lautet die Reserve „+ 60 g Reserve“
