## ADDED Requirements

### Requirement: Normportion-basierte Mahlzeit-Aggregation

Die Aggregations-Services für Mahlzeit-, Tages- und Plan-Scope MUST Nährwerte und Preise in Normportion-Logik berechnen. Der Beitrag eines Rezepts zu einer Mahlzeit MUSS dem Normportionwert multipliziert mit `MealItem.factor` entsprechen. Es DARF KEINE Division durch `Recipe.servings` und KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen (`norm_portions`, `activity_factor`, `reserve_factor`, `override_portions`) in der Regelauswertung erfolgen.

Für gecachte per-100g-Nährwerte MUSS die Umrechnung auf die Normportion `Wert pro 100g × cached_weight_g / 100` lauten. Der Preisbeitrag MUSS `cached_price_total × MealItem.factor` lauten, da `cached_price_total` bereits der Normportionpreis ist.

#### Scenario: Mahlzeitwert aus mehreren Rezepten

- **WHEN** eine Mahlzeit ein Rezept A (protein_g = 10.0 je 100g, cached_weight_g = 300g, factor = 1.0) und ein Rezept B (protein_g = 5.0 je 100g, cached_weight_g = 200g, factor = 0.5) enthält
- **THEN** beträgt der aggregierte Mahlzeit-Eiweißwert `(10.0 × 300/100 × 1.0) + (5.0 × 200/100 × 0.5) = 30.0 + 5.0 = 35.0g`
- **AND** es erfolgt keine Division durch `servings`

#### Scenario: Preis je Normportion mal Faktor

- **WHEN** eine Mahlzeit ein Rezept mit `cached_price_total = 1.20€` und `MealItem.factor = 1.5` enthält
- **THEN** beträgt der Preisbeitrag dieses Rezepts `1.20 × 1.5 = 1.80€`

#### Scenario: Gruppen- und Personen-Skalierung wird ignoriert

- **WHEN** der zugehörige MealPlan `norm_portions = 10`, `activity_factor = 1.5` und `reserve_factor = 1.1` hat
- **THEN** beeinflussen diese Werte die Mahlzeit-, Tages- und Plan-Aggregation für die Regelbewertung NICHT
- **AND** die reale Mengenskalierung bleibt ausschließlich dem Einkaufszettel und den Mengen-/Kosten-Endpunkten vorbehalten

### Requirement: Tages- und Plan-Aggregation in Normportion-Logik

Tages- und Plan-Aggregationen MUST die Normportion-basierten Mahlzeitwerte summieren. Eine zeitliche Mittelung über Tage (Durchschnitt pro Tag) für `scope="meal_event"`-Regeln ist ZULÄSSIG. Eine Division durch reale Personenzahl ist NICHT zulässig. `nutri_class` MUSS als Durchschnitt der vorhandenen Werte aggregiert werden; fehlende oder Null-Werte MÜSSEN ignoriert werden.

#### Scenario: Tagesaggregation summiert Mahlzeiten

- **WHEN** ein Tag drei Mahlzeiten mit aggregierten Eiweißwerten 35.0g, 20.0g und 15.0g enthält
- **THEN** beträgt der Tages-Eiweißwert `70.0g`

#### Scenario: Plan-Tagesdurchschnitt ohne Personen-Division

- **WHEN** eine `scope="meal_event"`-Regel über einen Plan mit 2 Tagen ausgewertet wird und der Gesamt-Energiewert 22.000 kJ beträgt
- **THEN** wertet das System den Tagesdurchschnitt `22.000 / 2 = 11.000 kJ` aus
- **AND** es erfolgt keine zusätzliche Division durch `norm_portions` oder reale Personenzahl
