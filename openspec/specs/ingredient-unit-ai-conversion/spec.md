# ingredient-unit-ai-conversion Specification

## Purpose
Umrechnung importierter Mengenangaben mit Einheit (Dose, Glas, Tasse, Liter, …) in Gramm und daraus in Portionsanzahlen für die Rezept-Zutatenprüfung.

## Requirements

### Requirement: Direct unit conversion
The review pipeline SHALL convert quantities with directly convertible units (g, kg, ml, l) to grams. For liters SHALL the conversion use the ingredient's physical density when explicitly set, otherwise 1000 g/l. The resulting gram amount SHALL be divided by the selected portion's trusted weight to compute the portion count.

#### Scenario: Gram quantity converted directly
- **WHEN** an import yields "200 g Mehl" matched to "Mehl" with a 100 g portion
- **THEN** the review row SHALL suggest quantity=2 portions

#### Scenario: Liter converted via density
- **WHEN** an import yields "1 Liter Orangensaft" matched to "Orangensaft" with density 1.05 and a 200 g portion
- **THEN** the review row SHALL suggest quantity=5 portions (1050 g ÷ 200 g)

#### Scenario: Liter without density uses 1000 g/l
- **WHEN** an import yields "1 Liter Wasser" matched to an ingredient without explicit density
- **THEN** the review row SHALL suggest quantity computed from 1000 g

### Requirement: AI-assisted conversion for unknown units
When the parsed unit is not directly convertible (Dose, Glas, Tasse, Becher, Packung, Handvoll, …), the system SHALL call Gemini to estimate the typical gram weight per unit for the matched ingredient. The estimate SHALL be converted to a portion count by dividing through the selected portion's trusted weight. If Gemini fails or returns no plausible value, the row SHALL fall back to quantity 1 and the user SHALL adjust the quantity in the dialog.

#### Scenario: Gemini estimates unit weight
- **WHEN** an import yields "1 Dose Ananas" matched to "Ananasstücke (Dose)" with a 150 g portion
- **THEN** Gemini SHALL estimate ~350 g per Dose and the review row SHALL suggest quantity=2 portions

#### Scenario: Gemini unavailable falls back to 1
- **WHEN** the unit is unknown and Gemini returns no usable estimate
- **THEN** the review row SHALL keep quantity=1 and remain fully editable in the quantity dialog

#### Scenario: Conversion respects portion weight
- **WHEN** a converted gram amount is divided by a portion weight
- **THEN** the result SHALL be rounded to two decimals and SHALL be > 0

### Requirement: Quantity suggestion in review rows
The review service SHALL populate `quantity` and `suggested_quantity` for grey-zone and matched rows whenever a quantity and unit were parsed and a trusted portion weight exists. Rows without parsable quantity SHALL keep `quantity=null` and rely on the quantity dialog.

#### Scenario: Grey-zone row gets quantity
- **WHEN** the matcher returns `needs_review` for "1 Liter Orangensaft" with candidates and a trusted portion
- **THEN** the row SHALL carry a computed `quantity` suggestion based on the conversion

#### Scenario: No quantity stays null
- **WHEN** an import yields an ingredient name without any parsable quantity
- **THEN** the review row SHALL keep `quantity=null` and SHALL require the quantity dialog before confirmation
