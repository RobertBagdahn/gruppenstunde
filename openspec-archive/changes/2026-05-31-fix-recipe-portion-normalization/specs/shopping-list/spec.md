## MODIFIED Requirements

### Requirement: Shopping-Service defensive Normalisierung
Der Shopping-Service SHALL bei der Mengenberechnung defensiv durch `recipe.servings` teilen, um korrekte Einkaufsmengen zu gewährleisten auch wenn ein Rezept `servings != 1` hat.

#### Scenario: Einkaufsliste aus Essensplan mit normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=1` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 1` ergeben (keine Änderung)

#### Scenario: Einkaufsliste aus Essensplan mit nicht-normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=4` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 4` ergeben

#### Scenario: Einkaufsliste aus einzelnem Rezept
- **WHEN** eine Einkaufsliste direkt aus einem Rezept generiert wird
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * servings / recipe.servings` ergeben
