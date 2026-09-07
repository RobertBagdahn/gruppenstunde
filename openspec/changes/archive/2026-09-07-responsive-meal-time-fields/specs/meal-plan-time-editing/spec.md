## MODIFIED Requirements

### Requirement: Default-Zeiten aus dem Plan beim Anlegen

Beim Anlegen einer neuen Mahlzeit SHALL `handleAddMealType` die plan-spezifischen
`meal_default_times` bevorzugen und nur bei deren Fehlen auf die hardcodierten
Standard-Zeiten zurückfallen. Die Bearbeitungsfelder für diese plan-spezifischen
Standardzeiten SHALL in Wizard und Einstellungen responsiv und ohne horizontales
Scrollen dargestellt werden.

#### Scenario: Plan-Default-Zeit wird verwendet
- **WHEN** der Plan `meal_default_times` für breakfast = ["07:00", "08:00"] definiert und der Nutzer ein neues Frühstück anlegt
- **THEN** die neue Mahlzeit SHALL 07:00–08:00 als Zeit erhalten (nicht den hardcodierten Default)

#### Scenario: Plan-Default-Zeit wird mobil vollständig angezeigt
- **WHEN** ein Nutzer die plan-spezifischen Standardzeiten bei einer viewport width from 320px through 639px bearbeitet
- **THEN** SHALL jeder Start- und Endwert vollständig sichtbar sein, ohne horizontales Scrollen zu erfordern
