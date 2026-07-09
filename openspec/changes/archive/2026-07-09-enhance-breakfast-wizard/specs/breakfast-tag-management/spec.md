## ADDED Requirements

### Requirement: Tag selector in create/edit dialogs
Tags sind in Create- und Edit-Dialogen selektierbar via Checkboxen. Kategorie-basiert: Frühstück-Tags (breakfast-base, breakfast-fat, etc.) separiert von Ernährungs-Tags (vegan, vegetarian, gluten-free, etc.).

#### Scenario: User selects breakfast tags during create
- **WHEN** user öffnet Create-Modal für neue Zutat (Basis)
- **THEN** Dialog zeigt "Tags zur Kennzeichnung" Sektion
- **AND** Breakfast-Tags sind vorgesehen: breakfast-base ✓, breakfast-fat, breakfast-topping, breakfast-drink, breakfast-extra
- **AND** breakfast-base ist je nach Step automatisch vorausgewählt
- **AND** User kann zusätzliche Ernährungs-Tags wählen: vegan, vegetarian, gluten-free, organic, etc.

#### Scenario: User applies multiple tags
- **WHEN** user erstellt Zutat "Veganes Glutenfreies Brot"
- **THEN** User wählt: breakfast-base ✓, gluten-free ✓, vegan ✓
- **AND** Alle Tags werden gespeichert
- **AND** Zutat ist später filterbar nach allen gewählten Tags

### Requirement: Tag selector on detail/edit pages
Tags sind auch auf der Detail-Seite und Edit-Seite editierbar.

#### Scenario: User edits tags on ingredient detail page
- **WHEN** user auf Ingredient-Detail-Seite "Bearbeiten" klickt
- **THEN** öffnet sich Edit-Form
- **AND** Tag-Selector zeigt aktuelle Tags mit Checkboxen
- **AND** User kann Tags hinzufügen/entfernen
- **AND** Änderungen werden gespeichert via "Speichern" Button

### Requirement: Tag suggestions / autocomplete
Tags haben Autocomplete/Suggestions basierend auf existierenden Tags in der Datenbank.

#### Scenario: User starts typing tag name
- **WHEN** user in Tag-Input anfängt zu schreiben (z.B. "veget")
- **THEN** System zeigt Suggestions: vegetarian, vegetable, etc.
- **AND** User kann eine Suggestion klicken oder custom-Tag tippen

### Requirement: Hierarchical tag organization
Tags sind hierarchisch organisiert (Parent-Tag, Sub-Tags). UI zeigt sie strukturiert.

#### Scenario: Tag hierarchy in selector
- **WHEN** user sieht Tag-Selector
- **THEN** Frühstück-Tags sind in einer Gruppe:
  - breakfast-base
  - breakfast-fat
  - breakfast-topping
  - breakfast-drink
  - breakfast-extra
- **AND** Ernährungs-Tags sind in separate Gruppe:
  - vegan
  - vegetarian
  - gluten-free
  - bio/organic

### Requirement: Tag validation
Nur valide Tags aus der Tag-Datenbank können ausgewählt werden. Custom/arbitrary Tags sind nicht erlaubt.

#### Scenario: Invalid tag rejection
- **WHEN** user versucht, ein nicht-existierendes Tag zu speichern
- **THEN** System zeigt Fehler: "Tag 'unknown-tag' existiert nicht"
- **AND** Speichern ist blockiert bis Tag korrigiert ist
