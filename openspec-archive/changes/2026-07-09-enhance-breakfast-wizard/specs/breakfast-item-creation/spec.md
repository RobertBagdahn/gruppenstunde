## ADDED Requirements

### Requirement: Create buttons in each wizard step
Jeder Wizard-Step (Basis, Fett, Belag, Extras, Getränke) hat einen "+ Neue [Item-Typ] erstellen" Button. Beim Klick öffnet sich ein Modal-Dialog zum Erstellen einer neuen Zutat oder eines neuen Rezepts.

#### Scenario: User clicks create button in Basis step
- **WHEN** user in Step 1 (Basis) auf "+ Neue Basis erstellen" klickt
- **THEN** öffnet sich ein Modal-Dialog
- **AND** Modal zeigt Formular: Name, Beschreibung, Nährwerte (optional), Tags, Visibility
- **AND** Wizard bleibt im Hintergrund sichtbar (nicht blockiert)

#### Scenario: User creates ingredient and sees it immediately
- **WHEN** user füllt Formular aus und klickt "Erstellen"
- **THEN** Modal schliesst sich
- **AND** neue Zutat wird in der Basis-Liste angezeigt
- **AND** neue Zutat ist auswahlbar im Wizard
- **AND** Toast-Nachricht bestätigt: "Basis 'Glutenfreies Brot' erstellt"

#### Scenario: User cancels create dialog
- **WHEN** user klickt "Abbrechen" oder ESC im Modal
- **THEN** Modal schliesst sich ohne zu speichern
- **AND** Wizard-State bleibt unverändert

### Requirement: Create buttons for recipes in drinks step
Step 5 (Getränke) hat zusätzlich einen "+ Neues Getränk-Rezept erstellen" Button für Rezepte.

#### Scenario: User creates recipe in drinks step
- **WHEN** user auf "+ Neues Getränk-Rezept erstellen" klickt
- **THEN** öffnet sich Modal mit Recipe-Form: Name, Beschreibung, Zutaten (minimal), Tags
- **AND** recipe_type ist automatisch auf "drink" gesetzt

### Requirement: Create buttons for extras in extras step
Step 4 (Extras) hat einen "+ Neues Extra erstellen" Button zum Hinzufügen eigener Extras (z.B. "Vegane Marmelade").

#### Scenario: User creates extra ingredient
- **WHEN** user auf "+ Neues Extra erstellen" klickt
- **THEN** öffnet sich Modal mit Ingredient-Form
- **AND** Tag "breakfast-extra" ist automatisch vorausgewählt
- **AND** Beschreibung Optional (Extras sind meist simple Items)

### Requirement: Created items are immediately usable in wizard
Neu erstellte Items sind direkt im Wizard nutzbar, ohne Seite neuladen zu müssen.

#### Scenario: Newly created item appears and can be selected
- **WHEN** user erstellt eine neue Zutat via Modal
- **THEN** Item erscheint sofort in der Liste
- **AND** User kann es direkt im Wizard auswählen
- **AND** Kein Page-Refresh nötig

### Requirement: Newly created items are user-owned and private by default
Neu erstellte Items gehören dem aktuellen User und sind privat für die aktuelle Gruppe.

#### Scenario: Created item visibility
- **WHEN** user erstellt Zutat "Glutenfreies Brot" im Wizard (MealPlan: Wölflinge Hütte)
- **THEN** Zutat hat owner=current_user
- **AND** visibility=private
- **AND** Zutat ist nur sichtbar für: User selbst + andere Users der Gruppe (via MealPlan)
- **AND** Andere Gruppen sehen die Zutat nicht (solange nicht geteilt)
