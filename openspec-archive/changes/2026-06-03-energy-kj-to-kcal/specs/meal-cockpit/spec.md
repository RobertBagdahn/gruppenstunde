## MODIFIED Requirements

### Requirement: Tages- und Plan-Aggregation in Normportion-Logik

Tages- und Plan-Aggregationen MUST die Normportion-basierten Mahlzeitwerte summieren. Eine zeitliche Mittelung über Tage (Durchschnitt pro Tag) für `scope="meal_event"`-Regeln ist ZULÄSSIG. Eine Division durch reale Personenzahl ist NICHT zulässig. `nutri_class` MUSS als Durchschnitt der vorhandenen Werte aggregiert werden; fehlende oder Null-Werte MÜSSEN ignoriert werden. Energie-Werte MUST vor der Auswertung gegen Energie-Regeln von kJ nach kcal konvertiert werden (`/ 4,184`), sodass Wert und Schwellwert in derselben Einheit (kcal) verglichen werden.

#### Scenario: Tagesaggregation summiert Mahlzeiten

- **WHEN** ein Tag drei Mahlzeiten mit aggregierten Eiweißwerten 35.0g, 20.0g und 15.0g enthält
- **THEN** beträgt der Tages-Eiweißwert `70.0g`

#### Scenario: Plan-Tagesdurchschnitt ohne Personen-Division

- **WHEN** eine `scope="meal_event"`-Regel über einen Plan mit 2 Tagen ausgewertet wird und der Gesamt-Energiewert 22.000 kJ beträgt
- **THEN** wertet das System den Tagesdurchschnitt `22.000 / 2 = 11.000 kJ` aus, konvertiert diesen zu `11.000 / 4,184 ≈ 2629 kcal` und wertet ihn gegen die kcal-Energieregel aus
- **AND** es erfolgt keine zusätzliche Division durch `norm_portions` oder reale Personenzahl
