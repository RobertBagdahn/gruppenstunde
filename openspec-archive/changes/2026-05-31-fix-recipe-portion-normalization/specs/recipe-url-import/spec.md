## MODIFIED Requirements

### Requirement: Import-Flow Portionsvalidierung
Beim Rezept-Import aus URL MUSS der Import-Stepper einen expliziten Validierungsschritt enthalten, in dem der User die erkannte Portionsanzahl bestätigt oder korrigiert. Die Mengen werden automatisch auf 1 Portion normalisiert.

#### Scenario: Import mit servings > 1 zeigt Normalisierungs-Schritt
- **WHEN** ein Rezept per URL importiert wird und die Quelle `servings > 1` zurückgibt
- **THEN** der Stepper SHALL einen Schritt "Portionsmenge prüfen" anzeigen mit der erkannten Portionsanzahl und den Original-Mengen
- **THEN** der User MUSS bestätigen oder die Portionsanzahl korrigieren

#### Scenario: Automatische Normalisierung auf 1 Portion
- **WHEN** der User die Portionsanzahl bestätigt (z.B. `servings=4`)
- **THEN** alle importierten Mengen SHALL durch die Portionsanzahl geteilt und als per-1-Portion gespeichert werden
- **THEN** `servings` SHALL auf `1` gesetzt werden

#### Scenario: Import mit servings=1 überspringt Normalisierung
- **WHEN** ein Rezept per URL importiert wird und die Quelle `servings=1` zurückgibt
- **THEN** der Normalisierungs-Schritt SHALL übersprungen werden

#### Scenario: User kann Portionsanzahl manuell korrigieren
- **WHEN** die erkannte Portionsanzahl falsch ist
- **THEN** der User SHALL die korrekte Anzahl eingeben können
- **THEN** die Mengen SHALL mit dem korrigierten Wert normalisiert werden
