## MODIFIED Requirements

### Requirement: Auto-create Ingredient on Cooklang import
When the Cooklang import encounters an ingredient name not found in the database, it SHALL create a new Ingredient record with `status=draft` and a default Portion with `weight_g=1.0`.

#### Scenario: Unknown ingredient in .cook file
- **WHEN** `import_cooklang` parses `@veganer Quark{100%g}` and no Ingredient with name "veganer Quark" exists
- **THEN** a new Ingredient is created with `name="veganer Quark"`, `slug="veganer-quark"`, `status="draft"`, and a Portion with `measuring_unit=Gramm`, `weight_g=1.0`

#### Scenario: Known ingredient in .cook file
- **WHEN** `import_cooklang` parses `@Salz{1%Prise}` and Ingredient "Salz" already exists
- **THEN** the existing Ingredient is used, no new record created
