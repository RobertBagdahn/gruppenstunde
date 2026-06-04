## MODIFIED Requirements

### Requirement: Shopping-Service defensive Normalisierung
Der Shopping-Service SHALL bei der Mengenberechnung den `scaling`-Faktor als `meal_plan.scaling_factor = norm_portions × reserve_factor` verwenden (ohne Aktivitäts-/PAL-Faktor) und defensiv durch `recipe.servings` teilen, um korrekte Einkaufsmengen zu gewährleisten auch wenn ein Rezept `servings != 1` hat.

#### Scenario: Einkaufsliste aus Essensplan mit normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=1` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 1` ergeben, wobei `scaling = norm_portions × reserve_factor`

#### Scenario: Einkaufsliste aus Essensplan mit nicht-normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=4` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 4` ergeben, wobei `scaling = norm_portions × reserve_factor`

#### Scenario: Einkaufsmenge enthält keinen PAL-Faktor
- **WHEN** ein Essensplan `norm_portions = 18` und `reserve_factor = 1.2` hat und ein Rezept (`servings=1`, `factor=1`) `300 g` einer Zutat pro Portion enthält
- **THEN** die aggregierte Einkaufsmenge dieser Zutat SHALL `300 × 18 × 1.2 = 6480 g` betragen (kein zusätzlicher Aktivitätsfaktor)

#### Scenario: Einkaufsliste aus einzelnem Rezept
- **WHEN** eine Einkaufsliste direkt aus einem Rezept generiert wird
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * servings / recipe.servings` ergeben
