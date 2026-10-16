## ADDED Requirements

### Requirement: Vorschau zeigt Mengen mit korrekter Einheit
Der Schritt „Vorschau & Speichern“ des Rezept-Wizards SHALL jede Zutat mit Menge und der zur Menge gehörenden Einheit anzeigen. Hat die Zutat eine Portion, MUST der Portionsname die Einheit sein und das Gewicht in Gramm als Sekundäranzeige erscheinen, wenn die Primäranzeige keine Gramm-Einheit ist. Die Vorschau MUST dieselben Werte zeigen wie die Rezept-Detailseite nach dem Speichern.

#### Scenario: Zutat mit Portion
- **WHEN** Spaghetti pro Person als `1` mit Portion „Portion trocken“ (100 g) vorliegt
- **THEN** zeigt die Vorschau „1 Portion trocken“ und „100 g“
- **AND** nicht „1 g“

#### Scenario: Zutat mit Stückportion
- **WHEN** eine Zwiebel `0,31` mit Portion „mittelgroße Zwiebel“ (80 g) hat
- **THEN** zeigt die Vorschau „0,31 mittelgroße Zwiebel“ mit Gewicht „25 g“

#### Scenario: Zutat ohne Portion und ohne Einheit
- **WHEN** eine Zutat weder Portion noch Messeinheit hat
- **THEN** zeigt die Einheitenspalte „—“
- **AND** es wird keine Einheit „Gramm“ geraten

#### Scenario: Gleiche Werte wie auf der Detailseite
- **WHEN** das Rezept gespeichert und die Detailseite geöffnet wird
- **THEN** stimmen Mengen und Einheiten mit der Vorschau überein
