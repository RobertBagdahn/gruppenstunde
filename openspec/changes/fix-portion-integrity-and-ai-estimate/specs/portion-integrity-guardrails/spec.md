## ADDED Requirements

### Requirement: Referenzierte Portion-Gewichte sind unveränderlich
Das System MUSS verhindern, dass `Portion.weight_g` einer Portion verändert wird, die bereits von mindestens einem `RecipeItem` referenziert wird. Ein Änderungsversuch MUSS stattdessen zur Anlage einer neuen Portion führen; die bestehende Portion bleibt mit ihrem ursprünglichen `weight_g` unverändert bestehen.

#### Scenario: weight_g-Änderung an referenzierter Portion wird umgeleitet
- **WHEN** ein Prozess (Management-Command, API, Admin) versucht, `weight_g` einer Portion zu ändern, die von mindestens einem `RecipeItem` referenziert wird
- **THEN** MUSS eine neue Portion mit dem gewünschten `weight_g` angelegt werden
- **THEN** MUSS die ursprüngliche Portion mit unverändertem `weight_g` erhalten bleiben

#### Scenario: weight_g-Änderung an unreferenzierter Portion bleibt erlaubt
- **WHEN** `weight_g` einer Portion geändert wird, die von keinem `RecipeItem` referenziert wird
- **THEN** MUSS die Änderung direkt übernommen werden

### Requirement: RecipeItem.portion_id ist nur durch expliziten User-Edit änderbar
Das System MUSS verhindern, dass automatisierte Prozesse (Migrationen, Management-Commands, Hintergrund-Jobs) `RecipeItem.portion_id` direkt verändern. Erlaubt sind ausschließlich: (a) der explizite Portion-Wechsel durch den Nutzer im Rezept-Editor, und (b) die dedizierte Rebind-Funktion für den Fall einer gelöschten Portion (siehe Requirement „Auto-Rebind beim Löschen einer referenzierten Portion").

#### Scenario: Automatisierter Prozess versucht direkten portion_id-Schreibzugriff
- **WHEN** ein automatisierter Prozess versucht, `RecipeItem.portion_id` außerhalb der dedizierten Rebind-Funktion zu setzen
- **THEN** MUSS die Operation verweigert oder auf die Rebind-Funktion umgeleitet werden

#### Scenario: Manueller Portion-Wechsel im Editor bleibt erlaubt
- **WHEN** ein Nutzer im `InlineIngredientEditor` über das Portion-Dropdown eine andere Portion für ein RecipeItem wählt
- **THEN** MUSS `portion_id` auf die gewählte Portion aktualisiert werden
- **THEN** MUSS `quantity` so umgerechnet werden, dass die zuvor angezeigte Gramm-Menge erhalten bleibt

### Requirement: Eindeutige rank=1-Portion pro Zutat
Das System MUSS sicherstellen, dass zu jedem Zeitpunkt höchstens eine aktive (`deleted_at IS NULL`) Portion mit `rank=1` pro Zutat existiert. Dies MUSS durch einen Datenbank-Constraint erzwungen werden, nicht nur durch Application-Level-Validierung.

#### Scenario: Zweite rank=1-Portion für dieselbe Zutat wird verhindert
- **WHEN** eine zweite aktive Portion mit `rank=1` für eine Zutat angelegt oder eine bestehende Portion auf `rank=1` gesetzt werden soll, während bereits eine aktive `rank=1`-Portion existiert
- **THEN** MUSS die Datenbank die Operation mit einem Constraint-Fehler ablehnen

#### Scenario: rank=1 nach Soft-Delete der vorherigen Portion wieder vergebbar
- **WHEN** die bisherige `rank=1`-Portion einer Zutat soft-gelöscht wurde (`deleted_at` gesetzt)
- **THEN** MUSS eine andere Portion derselben Zutat auf `rank=1` gesetzt werden können

### Requirement: Auto-Rebind beim Löschen einer referenzierten Portion
Wenn eine Portion gelöscht wird, die noch von mindestens einem `RecipeItem` referenziert wird, MUSS das System jedes referenzierende `RecipeItem` automatisch auf die aktuell gültige `rank=1`-Portion derselben Zutat umhängen, bevor die Portion soft-gelöscht wird. Die `quantity` MUSS dabei so umgerechnet werden, dass die ursprüngliche Gramm-Menge (`alte_quantity × alte_weight_g`) erhalten bleibt.

#### Scenario: Referenzierte Portion wird gelöscht und Items umgehängt
- **WHEN** eine Portion mit `weight_g = 0.3` gelöscht wird, die von einem RecipeItem mit `quantity = 10` referenziert wird (3g Gesamtmenge), und die Zutat eine aktive `rank=1`-Portion mit `weight_g = 100` besitzt
- **THEN** MUSS das RecipeItem nach dem Löschen `portion_id` der neuen `rank=1`-Portion referenzieren
- **THEN** MUSS `quantity` auf `0.03` aktualisiert werden (3g / 100g)
- **THEN** MUSS die ursprüngliche Portion anschließend `deleted_at` gesetzt bekommen

#### Scenario: Unreferenzierte Portion wird wie bisher gelöscht
- **WHEN** eine Portion gelöscht wird, die von keinem RecipeItem referenziert wird
- **THEN** MUSS sie direkt soft-gelöscht werden, ohne Rebind-Schritt
