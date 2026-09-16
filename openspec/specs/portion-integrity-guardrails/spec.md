## Purpose
Diese Spezifikation definiert die Integritätsregeln für Portionsdaten: Unveränderlichkeit referenzierter Portion-Gewichte, kontrollierte `portion_id`-Änderungen, `rank=1`-Eindeutigkeit, Auto-Rebind beim Löschen und physikalisch korrekte Basiseinheiten.

## Requirements

### Requirement: Referenzierte Portion-Gewichte sind unveränderlich
Das System MUST verhindern, dass automatisierte Reparaturprozesse `Portion.weight_g` einer referenzierten Portion in place verändern. Eine Reparatur MUST stattdessen eine neue Portion anlegen und betroffene RecipeItems gezielt umstellen.

#### Scenario: Automatische Reparatur referenzierter Portion
- **WHEN** ein Reparaturjob ein falsches Gewicht einer verwendeten Portion erkennt
- **THEN** bleibt die ursprüngliche Portion mit ihrem Gewicht erhalten
- **THEN** wird eine neue korrigierte Portion angelegt
- **THEN** werden nur die im Audit angegebenen RecipeItems umgestellt

### Requirement: RecipeItem.portion_id ist nur durch expliziten User-Edit oder Repair-Rebind änderbar
Das System MUST den dedizierten, auditierbaren Reparatur-Rebind als zulässigen automatisierten Ausnahmefall neben dem expliziten Nutzeredit und dem Lösch-Rebind behandeln.

#### Scenario: Auditierter Repair-Rebind
- **WHEN** ein High-Confidence-Reparaturjob einen passenden Replacement-Portion-Datensatz erzeugt
- **THEN** darf er die referenzierten RecipeItems innerhalb einer atomaren Reparaturtransaktion umstellen
- **THEN** MUST die Änderung im Repair-Audit nachvollziehbar sein

### Requirement: Eindeutige rank=1-Portion pro Zutat
Das System MUST sicherstellen, dass zu jedem Zeitpunkt höchstens eine aktive (`deleted_at IS NULL`) Portion mit `rank=1` pro Zutat existiert. Dies MUST durch einen Datenbank-Constraint erzwungen werden, nicht nur durch Application-Level-Validierung.

#### Scenario: Zweite rank=1-Portion für dieselbe Zutat wird verhindert
- **WHEN** eine zweite aktive Portion mit `rank=1` für eine Zutat angelegt oder eine bestehende Portion auf `rank=1` gesetzt werden soll, während bereits eine aktive `rank=1`-Portion existiert
- **THEN** MUST die Datenbank die Operation mit einem Constraint-Fehler ablehnen

#### Scenario: rank=1 nach Soft-Delete der vorherigen Portion wieder vergebbar
- **WHEN** die bisherige `rank=1`-Portion einer Zutat soft-gelöscht wurde (`deleted_at` gesetzt)
- **THEN** MUST eine andere Portion derselben Zutat auf `rank=1` gesetzt werden können

### Requirement: Auto-Rebind beim Löschen einer referenzierten Portion
Wenn eine Portion gelöscht wird, die noch von mindestens einem `RecipeItem` referenziert wird, MUST das System jedes referenzierende `RecipeItem` automatisch auf die aktuell gültige `rank=1`-Portion derselben Zutat umhängen, bevor die Portion soft-gelöscht wird. Die `quantity` MUST dabei so umgerechnet werden, dass die ursprüngliche Gramm-Menge (`alte_quantity × alte_weight_g`) erhalten bleibt.

#### Scenario: Referenzierte Portion wird gelöscht und Items umgehängt
- **WHEN** eine Portion mit `weight_g = 0.3` gelöscht wird, die von einem RecipeItem mit `quantity = 10` referenziert wird (3g Gesamtmenge), und die Zutat eine aktive `rank=1`-Portion mit `weight_g = 100` besitzt
- **THEN** MUST das RecipeItem nach dem Löschen `portion_id` der neuen `rank=1`-Portion referenzieren
- **THEN** MUST `quantity` auf `0.03` aktualisiert werden (3g / 100g)
- **THEN** MUST die ursprüngliche Portion anschließend `deleted_at` gesetzt bekommen

#### Scenario: Unreferenzierte Portion wird wie bisher gelöscht
- **WHEN** eine Portion gelöscht wird, die von keinem RecipeItem referenziert wird
- **THEN** MUST sie direkt soft-gelöscht werden, ohne Rebind-Schritt

### Requirement: Unveränderliche physikalische Basiseinheiten
Das System MUST sicherstellen, dass Portionen mit der Messeinheit Gramm (`g`, `Gramm`) oder Milliliter (`ml`, `Milliliter`) immer das physikalisch korrekte Einheitsgewicht (`weight_g = 1.0` für Gramm) besitzen. Geschätzte Portionsgewichte dürfen niemals als `weight_g` für die Einheit Gramm eingetragen werden.

#### Scenario: Portion-Resolution für Gramm erzwingt 1g Gewicht
- **WHEN** `_resolve_portion` für eine Zutat mit der Einheit `Gramm` oder `g` aufgerufen wird
- **THEN** MUST die aufgelöste Portion `weight_g = 1.0` (oder `None` für 1g = 1g) haben
- **THEN** DARF keine Portion mit Name `"g (<Gewicht> g)"` und abweichendem `weight_g` neu erzeugt werden

#### Scenario: Portion-Resolution für Milliliter verhindert Phantasiegewichte
- **WHEN** `_resolve_portion` für eine Zutat mit der Einheit `Milliliter` oder `ml` aufgerufen wird
- **THEN** MUST das Portionsgewicht 1.0 g pro ml (oder die physikalische Dichte) betragen
- **THEN** DARF kein willkürliches geschätztes Portionsgewicht (wie 250g pro ml) als `weight_g` gespeichert werden
