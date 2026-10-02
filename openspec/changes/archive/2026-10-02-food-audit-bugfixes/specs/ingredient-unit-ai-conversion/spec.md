## MODIFIED Requirements

### Requirement: Direct unit conversion
The review pipeline SHALL convert quantities with directly convertible units (g, kg, ml, l) to grams. Mass units (g, kg) SHALL be converted without any density factor (1 g = 1 g, 1 kg = 1000 g). Volume units (ml, l) SHALL use the ingredient's physical density when explicitly set, otherwise 1 g/ml. The resulting gram amount SHALL be divided by the selected portion's trusted weight to compute the portion count.

#### Scenario: Gram quantity converted directly
- **WHEN** an import yields "200 g Mehl" matched to "Mehl" with a 100 g portion
- **THEN** the review row SHALL suggest quantity=2 portions

#### Scenario: Gram quantity ignores density
- **GIVEN** "Weizenmehl Type 405" has physical density 0.6 and the rank-1 portion "Tasse Mehl" with 100 g
- **WHEN** an import yields "250 g Mehl" matched to that ingredient
- **THEN** the review row SHALL suggest quantity=2.5 portions (250 g ÷ 100 g), not 1.5

#### Scenario: Kilogram quantity ignores density
- **WHEN** an import yields "1 kg Kartoffeln" matched to an ingredient with density 0.7 and a 100 g portion
- **THEN** the review row SHALL suggest quantity=10 portions

#### Scenario: Liter converted via density
- **WHEN** an import yields "1 Liter Orangensaft" matched to "Orangensaft" with density 1.05 and a 200 g portion
- **THEN** the review row SHALL suggest quantity=5 portions (1050 g ÷ 200 g)

#### Scenario: Liter without density uses 1000 g/l
- **WHEN** an import yields "1 Liter Wasser" matched to an ingredient without explicit density
- **THEN** the review row SHALL suggest quantity computed from 1000 g
