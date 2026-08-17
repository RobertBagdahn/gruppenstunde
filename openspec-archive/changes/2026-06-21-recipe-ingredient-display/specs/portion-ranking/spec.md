## MODIFIED Requirements

### Requirement: Primäre Anzeigeauswahl nach Priority-Feld
Die Auswahl der "primären" Portion für die Anzeige in `IngredientList` MUST explizit nach dem `priority`-Feld des `Portion`-Modells erfolgen: Die Portion mit dem höchsten `priority`-Wert, die eine bekannte `weight_g > 0` hat und keine Gramm-Basiseinheit ist, wird als primäre Anzeigeeinheit gewählt.

Gramm-Portionen (Einheit `g`, `Gramm`, `kg`, `Kilogramm`, `ml`, `Milliliter`, `l`, `Liter`) MUST als Gramm-Basiseinheiten klassifiziert werden und dürfen nicht als nicht-Gramm-Primäranzeige gewählt werden.

#### Scenario: Mehrere Portionen mit unterschiedlichen Prioritäten
- **WHEN** ein Ingredient die Portionen `[{name: "Stück", priority: 10}, {name: "EL", priority: 5}, {name: "100g", priority: 0}]` hat
- **THEN** wird `Stück` (priority: 10) als Primäranzeige gewählt

#### Scenario: Alle Portionen sind Gramm-basiert
- **WHEN** ein Ingredient nur Gramm-basierte Portionen hat (z.B. Salz mit nur `g`-Portionen)
- **THEN** wird Gramm als einzige Anzeige verwendet, keine nicht-Gramm-Primäranzeige

#### Scenario: Portion ohne weight_g wird übersprungen
- **WHEN** die höchstpriorisierte Portion `weight_g: null` hat
- **THEN** wird die nächste Portion mit bekanntem `weight_g > 0` verwendet
