## Requirements

### Requirement: Stückzahl-Äquivalente in der Einkaufsliste

Die Einkaufsliste SHALL für Zutaten mit einer Stück-Portion (`rank=1`, Nicht-Gramm-Einheit) die Gramm-Menge automatisch in Stückzahl umrechnen und anzeigen.

#### Scenario: Zutat mit Stück-Portion (rank=1)

- **WHEN** die Einkaufsliste eine Zutat enthält deren `rank=1`-Portion eine Stück-Einheit ist (z.B. „1 Scheibe = 50g")
- **THEN** wird angezeigt: `Vollkornbrot: 1.300g (≈ 26 Scheiben)`
- **THEN** die Stückzahl wird aus `Gesamtgramm ÷ weight_g der rank=1-Portion` berechnet

#### Scenario: Zutat ohne Stück-Portion

- **WHEN** die Einkaufsliste eine Zutat enthält die nur Gramm-Portionen hat
- **THEN** wird nur die Gramm-Menge angezeigt (kein Stückzahl-Äquivalent)

#### Scenario: Stückzahl auf sinnvolle Dezimalstellen gerundet

- **WHEN** die Stückzahl nicht ganzzahlig ist
- **THEN** wird auf eine Dezimalstelle gerundet (z.B. „≈ 2.5 Stück")
- **WHEN** die Stückzahl sehr nah an einer ganzen Zahl liegt (±0.05)
- **THEN** wird als ganze Zahl angezeigt (z.B. „≈ 3 Stück")
