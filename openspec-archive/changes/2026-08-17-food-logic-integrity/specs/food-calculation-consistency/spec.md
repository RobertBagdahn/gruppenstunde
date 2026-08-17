## ADDED Requirements

### Requirement: Gemeinsamer aktiver Berechnungskontext

Kosten, Nährwerte, Einkaufsliste und Kochplan SHALL denselben normalisierten Kontext aktiver
RecipeItems und MealItems verwenden. Er enthält bereits aktive Portionen, Faktoren,
`effective_portions`, Ausschlüsse und Mengen-Overrides.

#### Scenario: Identische Item-Regeln in allen Ausgaben

- **WHEN** ein Item ausgeschlossen oder per `quantity_override` geändert wird
- **THEN** verwenden alle vier Ausgabepfade dieselbe resultierende Menge beziehungsweise lassen
  das Item vollständig weg

### Requirement: Ungültige Rezeptportionen

Rezepte mit `portions <= 0` oder `None` SHALL aus diesen Berechnungen ausgeschlossen und mit
Rezept-ID und Titel protokolliert werden. Eine stille Normierung auf `1` ist unzulässig.

#### Scenario: Ungültige Rezeptportion
- **WHEN** ein Rezept `portions <= 0` oder `None` hat
- **THEN** wird es übersprungen und mit ID und Titel protokolliert

### Requirement: Soft-gelöschte Portionen

Portionen und Packungen mit `deleted_at` SHALL weder berechnet noch als Fallback ausgewählt
werden. Eine fehlende aktive Zuordnung wird kontrolliert als unvollständig ausgegeben.

#### Scenario: Soft-gelöschte Portion
- **WHEN** nur eine Portion mit `deleted_at` referenziert wird
- **THEN** wird sie nicht verwendet und die Zuordnung als unvollständig markiert
