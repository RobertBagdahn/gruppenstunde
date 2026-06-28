## ADDED Requirements

### Requirement: Allergen/NutritionalTag-Informationen im Kochplan

Das System SHALL pro CookingScheduleItem die nutritional_tags des Rezepts und pro CookingScheduleIngredient die nutritional_tags der Zutat zurückgeben.

Das System SHALL pro CookingScheduleDay eine aggregierte Liste `day_nutritional_tags` zurückgeben, die alle NutritionalTags enthält, die an diesem Tag in irgendeinem Rezept oder Zutat vorkommen.

#### Scenario: Rezept mit NutritionalTags

- **WHEN** ein Rezept im Kochplan die NutritionalTags `Nüsse` und `Laktose` hat
- **THEN** enthält der CookingScheduleItem `nutritional_tags` mit `[{name: "Nüsse"}, {name: "Laktose"}]`

#### Scenario: Zutat mit NutritionalTags

- **WHEN** eine Zutat im Kochplan den Tag `Gluten` hat
- **THEN** enthält der CookingScheduleIngredient `nutritional_tags` mit `[{name: "Gluten"}]`

#### Scenario: Tages-Aggregation

- **WHEN** an einem Tag Rezepte mit `Nüsse` und `Laktose` vorkommen
- **THEN** enthält `day_nutritional_tags` beide Tags (dedupliziert)

### Requirement: Allergen-Scan-Integration im Frontend

Das Frontend SHALL auf der Kochplan-Seite Allergen-Badges pro Rezept anzeigen. In der Druckansicht SHALL zusätzlich eine Tages-Zusammenfassung aller Allergene erscheinen.

#### Scenario: Rezept-Badge in der interaktiven Ansicht

- **WHEN** ein Rezept NutritionalTags enthält
- **THEN** zeigt die Kochplan-Seite farbige Badges mit den Tag-Namen neben dem Rezepttitel

#### Scenario: Tages-Warnzone in der Druckansicht

- **WHEN** ein Tag Rezepte mit Allergenen enthält
- **THEN** zeigt die Druckansicht oberhalb der Rezepte des Tages eine Warnbox mit allen Allergenen dieses Tages
