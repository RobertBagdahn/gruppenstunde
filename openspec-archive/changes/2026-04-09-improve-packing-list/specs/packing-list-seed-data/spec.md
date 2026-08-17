## ADDED Requirements

### Requirement: Extended seed data with "do not bring" items
The seed command SHALL include "Nicht mitbringen" items in relevant template packing lists. Each template that is appropriate SHALL contain a category or items marked as `is_do_not_bring=True`.

#### Scenario: Seed command creates "do not bring" items
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** at least the following templates SHALL include "Nicht mitbringen" items:
  - Sommerlager: "Handy (nur ausgeschaltet im Rucksack erlaubt)", "Geld", "eigene Süßigkeiten", "Spielkonsolen", "Schmuck und Wertgegenstände"
  - Zeltlager-Wochenende: "Handy", "Geld", "eigene Süßigkeiten"
  - Großfahrt: "Handy (nur ausgeschaltet im Rucksack)", "Geld", "Schmuck", "elektronische Geräte"
- **THEN** "Nicht mitbringen" items SHALL have `is_do_not_bring=True`

### Requirement: Extended seed data with more categories and items
The seed command SHALL include additional categories and items to provide more comprehensive template packing lists.

#### Scenario: Additional categories in seed data
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** templates SHALL include the following additional categories where appropriate:
  - "Dokumente" (Krankenversicherungskarte, Impfpass, Teilnehmerbogen, ggf. Reisepass)
  - "Verpflegung" (Trinkflasche, Brotdose, Besteck für unterwegs)
  - "Sonstiges" (Taschengeld falls erlaubt, Regenschirm, Mülltüten, Sonnencreme, Insektenschutz)

#### Scenario: More items per existing category
- **WHEN** the `seed_packing_lists` management command is executed
- **THEN** existing categories SHALL be enriched with additional relevant items:
  - "Kleidung": Badehose/Badeanzug, Mütze/Hut, Halstuch, Gürtel
  - "Schlafen": Kissen, Ohrenstöpsel, Kuscheltier
  - "Hygiene": Haarbürste, Lippenpflege, Taschentücher, Handdesinfektion
  - "Ausrüstung": Kompass, Taschenmesser (ab geeignetem Alter), Seilstücke, Erste-Hilfe-Set

#### Scenario: Seed command idempotency
- **WHEN** the `seed_packing_lists` command is run with `--clear`
- **THEN** existing seeded packing lists SHALL be deleted before re-creation
- **THEN** the command SHALL complete without errors
