## ADDED Requirements

### Requirement: PortionPicker in Editor-Zeilen und Hinzufuegen-Dialog

Der `InlineIngredientEditor` SHALL in jeder Zutatenzeile den `PortionPicker` statt des nativen `<select>` rendern, auch wenn die Zutat nur eine Portion besitzt (einzeilig, nicht editierbare Auswahl entfaellt). Der `IngredientQuantityDialog` SHALL den `PortionPicker` statt des shadcn `Select` verwenden. Ueber den eingebetteten Editor gilt dies auch fuer den Rezept-Wizard (`WizardStepIngredients`).

#### Scenario: Mehrere Portionen im Editor
- **WHEN** eine Zutat mehrere Portionen besitzt
- **THEN** rendert die Zeile den `PortionPicker` mit den gruppierten Abschnitten

#### Scenario: Eine Portion im Editor
- **WHEN** eine Zutat nur eine Portion besitzt
- **THEN** zeigt die Zeile weiterhin einen Trigger mit Name und Gewicht (Picker mit einem Eintrag), keinen statischen Text ohne Gewicht

#### Scenario: Hinzufuegen-Dialog
- **WHEN** der `IngredientQuantityDialog` geoeffnet wird
- **THEN** erscheint der `PortionPicker` fuer die Portionsauswahl inklusive Standardmengen-Abschnitt

#### Scenario: Wizard
- **WHEN** der `WizardStepIngredients` aktiv ist
- **THEN** nutzen die Zutatenzeilen denselben `PortionPicker` wie der Inline-Editor
