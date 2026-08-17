## MODIFIED Requirements

### Requirement: Cooklang-Import erzeugt korrekte RecipeItems

Bisher: `measuring_unit=None`, `quantity_type="once"` mit Gesamtmenge.
Neu: Korrekte Unit-Zuordnung und `quantity_type="per_person"` mit Pro-Portion-Menge.

#### Scenario: Re-Import bestehender Daten
- **WHEN** `--force` Flag beim Aufruf gesetzt ist
- **THEN** werden vorherige Cooklang-Imports gelöscht und korrekt neu importiert
