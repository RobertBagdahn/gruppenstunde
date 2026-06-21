## MODIFIED Requirements

### Requirement: Standard-Portion und Menge beim Hinzufügen einer Zutat
Wenn im InlineIngredientEditor eine neue Zutat per Autocomplete hinzugefügt wird, MUST das System automatisch die Portion mit dem höchsten `priority`-Wert aus der API-Antwort vorauswählen und die zugehörige `quantity` auf `1` setzen (nicht auf `0`).

Wenn mehrere Portionen existieren, MUST die mit dem höchsten `priority`-Wert die vorausgewählte sein — unabhängig von `is_default`.

#### Scenario: Zutat mit Stück-Portion höchster Priorität hinzufügen
- **WHEN** der Nutzer "Apfel" per Autocomplete auswählt und der API-Aufruf Portionen `[{id: 5, name: "Stück", priority: 10, weight_g: 150, is_default: true}, {id: 6, name: "100g", priority: 0, weight_g: 100}]` zurückgibt
- **THEN** wird die neue Zeile mit `portion_id: 5`, `quantity: 1`, `measuring_unit_name: "Stück"` vorbefüllt

#### Scenario: Zutat mit Gramm-Portion höchster Priorität hinzufügen
- **WHEN** der Nutzer "Nudeln" auswählt und die höchstpriorisierte Portion `{name: "125g", priority: 8, weight_g: 125}` ist
- **THEN** wird die neue Zeile mit `quantity: 1`, `measuring_unit_name: "g"` vorbefüllt

#### Scenario: Nur eine Portion verfügbar
- **WHEN** eine Zutat genau eine Portion hat
- **THEN** wird diese Portion mit `quantity: 1` vorausgewählt

#### Scenario: Keine Portion gefunden
- **WHEN** der API-Aufruf für Portionen eine leere Liste zurückgibt
- **THEN** zeigt das System einen Toast-Fehler "Keine Portion für diese Zutat gefunden" und fügt die Zutat nicht hinzu
