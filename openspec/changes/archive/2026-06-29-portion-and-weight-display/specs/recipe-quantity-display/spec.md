## MODIFIED Requirements

### Requirement: Zutatenanzeige in Rezeptansicht
Die Rezeptansicht (Detail- und Bearbeitungsansicht) MUST das neue `portion_display`-Feld aus der API verwenden, um Zutatmengen anzuzeigen. Das kombinierte Format `"{quantity} {unit} {ingredient} ({weight})"` ersetzt die bisherige getrennte Darstellung.

#### Scenario: Anzeige mit portion_display
- **WHEN** die API `portion_display = "3,4 Äpfel (969g)"` liefert
- **THEN** MUST die Rezeptansicht diesen String unverändert anzeigen

#### Scenario: Fallback wenn portion_display fehlt
- **WHEN** `portion_display` nicht im API-Response enthalten ist (ältere API-Version)
- **THEN** SHOULD das Frontend die bisherige Darstellung als Fallback verwenden

#### Scenario: Warnung bei fehlenden Gewichtsdaten
- **WHEN** `has_missing_weight == true`
- **THEN** MUST die Zutatzeile in der Rezeptansicht orange markiert sein (Warnfarbe oder Icon)

#### Scenario: Bearbeitungsansicht
- **WHEN** der Nutzer ein Rezept bearbeitet (EditRecipePage)
- **THEN** MUST `portion_display` auch im Edit-Modus als Vorschau neben dem Input-Feld angezeigt werden
