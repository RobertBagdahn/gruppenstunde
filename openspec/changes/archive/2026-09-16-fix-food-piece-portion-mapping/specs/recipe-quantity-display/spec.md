## MODIFIED Requirements

### Requirement: Originaleinheit anzeigen
Zutaten auf der Rezept-Detailseite SHALL die fachliche Portion beziehungsweise den Portionsnamen anzeigen. Der technische Grammbetrag SHALL zusätzlich angezeigt werden, wenn er vorhanden ist.

#### Scenario: Stückportion mit bestätigtem Gewicht
- **WHEN** ein RecipeItem `2 kleine Zwiebeln` mit `weight_g=80` pro Portion verwendet
- **THEN** wird `2 kleine Zwiebeln (160 g)` angezeigt

#### Scenario: Unbekanntes Gewicht
- **WHEN** ein RecipeItem eine Stückportion ohne bestätigtes Gewicht verwendet
- **THEN** wird die Stückmenge mit einer sichtbaren Warnung angezeigt
- **THEN** darf kein scheinpräziser Grammbetrag erscheinen

### Requirement: Zutatenanzeige in Rezeptansicht
Die Rezeptansicht SHALL die Portionsdarstellung aus der API verwenden und darf die fachliche Stück-/Größenbezeichnung nicht durch `Gramm` ersetzen.

#### Scenario: Größenvarianten
- **WHEN** ein Rezept `30 kleine Brötchen` und `20 große Brötchen` enthält
- **THEN** bleiben beide Portionsnamen in der Anzeige unterscheidbar
