## MODIFIED Requirements

### Requirement: Referenzierte Portion-Gewichte sind unveränderlich
Das System MUSS verhindern, dass automatisierte Reparaturprozesse `Portion.weight_g` einer referenzierten Portion in place verändern. Eine Reparatur MUSS stattdessen eine neue Portion anlegen und betroffene RecipeItems gezielt umstellen.

#### Scenario: Automatische Reparatur referenzierter Portion
- **WHEN** ein Reparaturjob ein falsches Gewicht einer verwendeten Portion erkennt
- **THEN** bleibt die ursprüngliche Portion mit ihrem Gewicht erhalten
- **THEN** wird eine neue korrigierte Portion angelegt
- **THEN** werden nur die im Audit angegebenen RecipeItems umgestellt

### Requirement: RecipeItem.portion_id ist nur durch expliziten User-Edit oder Repair-Rebind änderbar
Das System MUSS den dedizierten, auditierbaren Reparatur-Rebind als zulässigen automatisierten Ausnahmefall neben dem expliziten Nutzeredit und dem Lösch-Rebind behandeln.

#### Scenario: Auditierter Repair-Rebind
- **WHEN** ein High-Confidence-Reparaturjob einen passenden Replacement-Portion-Datensatz erzeugt
- **THEN** darf er die referenzierten RecipeItems innerhalb einer atomaren Reparaturtransaktion umstellen
- **THEN** MUSS die Änderung im Repair-Audit nachvollziehbar sein
