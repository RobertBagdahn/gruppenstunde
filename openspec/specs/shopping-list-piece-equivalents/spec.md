# shopping-list-piece-equivalents Specification

## Purpose

Rechnet Gramm-Mengen in der Einkaufsliste in Stückzahlen der Standard-Portion um (z. B. „≈ 26 Scheiben“), damit beim Einkauf in natürlichen Einheiten gedacht werden kann.
## Requirements
### Requirement: Stückzahl-Äquivalente in der Einkaufsliste

Die Einkaufsliste SHALL für Zutaten mit einer Stück-Portion (`rank=1`, Nicht-Gramm-Einheit) die Gramm-Menge automatisch in Stückzahl umrechnen und anzeigen. Die API MUST die Stückzahl als Zahl (`piece_equivalent.count`) und den Portionsnamen getrennt liefern; die UI formatiert mit deutschem Komma.

#### Scenario: Zutat mit Stück-Portion (rank=1)

- **WHEN** die Einkaufsliste eine Zutat enthält, deren `rank=1`-Portion eine Stück-Einheit ist (z. B. „1 Scheibe = 50 g“)
- **THEN** wird angezeigt: `Vollkornbrot: 1,3 kg · ≈ 26 Scheiben`
- **THEN** die Stückzahl wird aus `Gesamtgramm ÷ weight_g der rank=1-Portion` berechnet

#### Scenario: Zutat ohne Stück-Portion

- **WHEN** die Einkaufsliste eine Zutat enthält, die nur Gramm-Portionen hat
- **THEN** wird nur die Gramm-Menge angezeigt und `piece_equivalent` ist `null`

#### Scenario: Stückzahl auf sinnvolle Dezimalstellen gerundet

- **WHEN** die Stückzahl nicht ganzzahlig ist
- **THEN** wird auf eine Dezimalstelle gerundet und mit Komma angezeigt (z. B. „≈ 2,5 Stück“)
- **WHEN** die Stückzahl sehr nah an einer ganzen Zahl liegt (±0,05)
- **THEN** wird sie als ganze Zahl angezeigt (z. B. „≈ 3 Stück“)
