## MODIFIED Requirements

### Requirement: The preview includes complete contextual suggestions
The preview service SHALL provide the AI with the available ingredient name, description, aliases, current portions, packages, nutrition, categories, physical properties and bounded recipe-usage context. The response SHALL identify existing sources and new proposed portions separately. The service SHALL normalize accepted unit aliases before returning operations and SHALL preserve valid partial results instead of requiring an arbitrary minimum count.

#### Scenario: Ingredient with existing data is analyzed
- **WHEN** the editor requests a preview for an ingredient with portions, packages and recipe usages
- **THEN** the AI request SHALL include those relevant context fields
- **THEN** the response SHALL contain structured operations with canonical measuring units and proposed positive weights where determinable

#### Scenario: Only a small number of valid suggestions is returned
- **WHEN** the AI returns fewer than four distinct but complete suggestions
- **THEN** the preview SHALL return those valid suggestions
- **THEN** it SHALL not replace them with an empty result solely because the count is below four

### Requirement: New typical portions are individually selectable
The AI MAY return additional typical portions. Each new portion SHALL be independently selectable in the preview and SHALL be unselected by default, except that an explicitly selected replacement of an incomplete existing source remains selected for safety.

#### Scenario: AI suggests Stück and Packung
- **WHEN** the AI proposes new `Stück` and `Packung` portions with valid weights
- **THEN** the dialog SHALL render two independent selectable suggestions with canonical unit labels
- **THEN** applying the preview SHALL create only the selected suggestions

### Requirement: Portions and packages are presented as separate operation groups
The shared magic-wand dialog SHALL show portion operations and package operations in separate groups while using one preview token and one atomic apply action. Package operations SHALL be persisted as `Package` records, never as `Portion` records.

#### Scenario: AI suggests Stück and Packung
- **WHEN** the preview contains a `Stück` operation and a `package` operation
- **THEN** the dialog SHALL render `Stück` under `Portionen`
- **THEN** the dialog SHALL render the package under `Packungen`
- **THEN** applying the selected operations SHALL create the correct model type for each operation

### Requirement: Apply rejects invalid operations atomically
The apply endpoint SHALL reject missing or foreign source IDs, duplicate packages, stale preview tokens and invalid weights with a client error. No portion or package change SHALL remain after rejection.

#### Scenario: Selected operation references no source
- **WHEN** a delete or replacement operation references a missing source portion
- **THEN** the endpoint SHALL return HTTP 422
- **THEN** no operation in the request SHALL be persisted
