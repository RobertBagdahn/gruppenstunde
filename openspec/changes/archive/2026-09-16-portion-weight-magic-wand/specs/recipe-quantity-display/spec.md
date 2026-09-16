## MODIFIED Requirements

### Requirement: Unbekanntes Gewicht
Die Rezeptansicht MUST historische RecipeItems mit unbestätigtem Stückgewicht sichtbar warnen und DARF keinen scheinpräzisen Grammbetrag anzeigen. Neue oder aktualisierte RecipeItems MUST aktive Portionen mit positivem Gewicht referenzieren.

#### Scenario: Historisches RecipeItem mit unbestätigtem Gewicht
- **WHEN** ein historisches RecipeItem eine Stückportion ohne bestätigtes Gewicht verwendet
- **THEN** wird die Stückmenge mit einer sichtbaren Warnung angezeigt
- **THEN** darf kein scheinpräziser Grammbetrag erscheinen
- **THEN** dürfen neue oder aktualisierte RecipeItems keine aktive Portion ohne positives Gewicht referenzieren

#### Scenario: Historische Referenz bleibt lesbar
- **WHEN** ein bestehendes Rezept eine historische ungewichtete Stückportion referenziert
- **THEN** zeigt die Rezeptansicht die fachliche Stückmenge mit einer sichtbaren Reparaturwarnung
- **THEN** zeigt sie keinen berechneten Grammbetrag an

#### Scenario: Neue RecipeItem-Zeile mit ungewichteter Portion
- **WHEN** ein User eine ungewichtete aktive Portion zu einem Rezept hinzufügen oder dafür speichern will
- **THEN** MUSS das Backend die Operation ablehnen
- **THEN** MUSS das Frontend eine gewichtete Portion oder den Portions-Reparaturfluss verlangen
