## ADDED Requirements

### Requirement: Normportion-basierte Suggestion-Auswertung

Der Suggestion-Service MUST alle Nährwert-, Preis-, Gewicht- und Nutri-Regeln auf Mahlzeit-, Tages- und Plan-Ebene anhand von Normportion-Aggregaten auswerten. Die der Regelbewertung zugrunde liegenden Werte MÜSSEN in Normportion-Logik berechnet sein (Rezept-Normportionwert × `MealItem.factor`, summiert je Scope). Es DARF KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen in die Regelbewertung einfließen.

#### Scenario: Mahlzeitregel nutzt Normportion-Aggregat

- **WHEN** eine `scope="meal"`-Regel `protein_g >= 30` für eine Mahlzeit ausgewertet wird, deren Normportion-Aggregat 35.0g Eiweiß beträgt
- **THEN** wertet der Service den Wert 35.0g aus und erzeugt eine grüne Bewertung

#### Scenario: Keine Personen-Skalierung in der Bewertung

- **WHEN** Vorschläge für einen MealPlan mit `norm_portions = 10` angefordert werden
- **THEN** verwenden die Regelbewertungen ausschließlich Normportion-Aggregate
- **AND** die Werte werden NICHT mit `norm_portions`, `activity_factor` oder `reserve_factor` multipliziert

#### Scenario: Tagesregel summiert Mahlzeiten in Normportion-Logik

- **WHEN** eine `scope="day"`-Regel für einen Tag mit drei Mahlzeiten ausgewertet wird
- **THEN** basiert die Bewertung auf der Summe der Normportion-Mahlzeitwerte des Tages
