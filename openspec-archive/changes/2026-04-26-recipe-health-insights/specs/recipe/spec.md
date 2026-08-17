# Recipe Health Insights Delta

Dieses Delta ergänzt die Gesundheits-Sektion um positive Eigenschafts-Badges und macht die Zutaten-Beiträge zu einzelnen Nährwert-Parametern sichtbar. Beide Features werden ohne neuen API-Endpoint realisiert, indem die bestehende Nutrition-Breakdown-Response erweitert wird.

## ADDED Requirements

### Requirement: Positive Health-Badges auf Rezept-Detailseite

The system SHALL compute and display positive health traits for each recipe based on hardcoded DGE-/EU-claim thresholds and render them as green chips in the health section. Das System MUSS für jedes Rezept auf Basis der gecachten per-100g-Nährwerte eine Liste positiver Eigenschaften berechnen und diese auf der Rezept-Detailseite als grüne Chips in der Gesundheits-Sektion darstellen.

#### Scenario: Trait-Berechnung

- **WHEN** der Server den Nutrition-Breakdown für ein Rezept zusammenstellt
- **THEN** MUSS er eine Liste `positive_traits: string[]` zurückgeben, die null oder mehr der folgenden Enum-Keys enthält: `high_fiber`, `high_protein`, `low_salt`, `low_sat_fat`, `low_sugar`, `balanced`
- **THEN** MUSS `high_fiber` aktiv sein, wenn Ballaststoffgehalt pro 100g ≥ 6 g
- **THEN** MUSS `high_protein` aktiv sein, wenn Protein ≥ 20 % der Energie liefert
- **THEN** MUSS `low_salt` aktiv sein, wenn Salzgehalt pro 100g ≤ 0,3 g
- **THEN** MUSS `low_sat_fat` aktiv sein, wenn gesättigte Fettsäuren pro 100g ≤ 1,5 g
- **THEN** MUSS `low_sugar` aktiv sein, wenn Zucker pro 100g ≤ 5 g
- **THEN** MUSS `balanced` aktiv sein, wenn Nutri-Score-Punkte im Bereich [−1, +4] liegen

#### Scenario: Badges im Frontend

- **WHEN** die Gesundheits-Sektion der Rezept-Detailseite gerendert wird und `positive_traits` nicht leer ist
- **THEN** MUSS eine Chip-Reihe oberhalb der Improvements-Liste angezeigt werden
- **THEN** MUSS jeder Chip Icon, deutsche Bezeichnung und grüne Akzentfarbe (Emerald-Palette) haben

#### Scenario: Keine Badges bei leerer Liste

- **WHEN** `positive_traits` leer ist
- **THEN** DARF keine Chip-Reihe und keine leere Überschrift gerendert werden

### Requirement: Zutaten-Contribution-Panel im Nutrition-Breakdown

The system SHALL expose per-ingredient contribution data for key nutritional parameters and render them in expandable panels under the nutrition breakdown. Das System MUSS pro RecipeItem dessen Beitrag zu zentralen Nährwert-Parametern ausweisen und im Frontend eine expandierbare Aufschlüsselung pro Parameter anbieten, die die Top-beitragenden Zutaten zeigt.

#### Scenario: Contributions im API-Response

- **WHEN** der Client `GET /api/recipes/{id}/nutrition-breakdown/` aufruft
- **THEN** MUSS jedes `RecipeItemNutritionOut` ein Feld `contributions: ContributionOut[]` enthalten
- **THEN** MUSS jede `ContributionOut` die Felder `parameter` (enum: `energy`, `protein`, `fat`, `sat_fat`, `carbs`, `sugar`, `salt`, `fiber`), `absolute` (float), `percent_of_recipe` (float 0–100) enthalten
- **THEN** MUSS `absolute` in der Einheit des jeweiligen Parameters angegeben sein (g für Nährstoffe, kJ für Energie)
- **THEN** MUSS `percent_of_recipe` den prozentualen Anteil des Items am Rezept-Gesamtwert für diesen Parameter angeben

#### Scenario: Panel rendert Top-5 pro Parameter

- **WHEN** ein Nutzer im Nutrition-Breakdown einen Parameter-Block expandiert
- **THEN** MUSS eine Liste der 5 am meisten beitragenden Zutaten (absteigend nach `percent_of_recipe`) gerendert werden
- **THEN** MUSS jede Zeile Zutat-Name, `absolute`-Wert mit Einheit, `percent_of_recipe` und einen kleinen horizontalen Balken enthalten
- **THEN** MUSS bei mehr als 5 beitragenden Zutaten ein Button „+N weitere anzeigen" den Rest einblenden

#### Scenario: Panel rendert nichts bei null-Werten

- **WHEN** alle Zutaten eines Rezepts `percent_of_recipe = 0` für einen Parameter haben (z.B. zuckerfreies Rezept)
- **THEN** MUSS die expandierte Liste eine neutrale Nachricht zeigen („Keine Zutat trägt Zucker bei")

## MODIFIED Requirements

### Requirement: Extended nutrition breakdown with DGE coverage

The `RecipeNutritionBreakdownOut` SHALL include aggregate DGE coverage data, a `positive_traits` array, and per-item contribution data. The `RecipeNutritionBreakdownOut` MUSS enthalten:

- Aggregierte DGE-Abdeckung pro Makronährstoff und Mikronährstoff (unverändert gegenüber bestehender Spec)
- **Neu**: `positive_traits: list[str]` (Enum-Keys der positiven Eigenschaften; leer wenn keine zutreffen)
- `items: list[RecipeItemNutritionOut]` mit 25 Mikronährstoff-Feldern pro Item (unverändert) **und** neuem Feld `contributions: list[ContributionOut]`

Das Schema `ContributionOut` MUSS die Felder `parameter` (enum), `absolute` (float), `percent_of_recipe` (float 0–100) haben.

#### Scenario: Nutrition breakdown with positive traits

- **WHEN** ein Rezept mit Ballaststoffgehalt ≥ 6 g/100g angefragt wird
- **THEN** MUSS das Response `positive_traits` den Eintrag `high_fiber` enthalten

#### Scenario: Nutrition breakdown with contributions

- **WHEN** ein Rezept mit drei Zutaten (Nudeln, Tomatensoße, Käse) angefragt wird
- **THEN** MUSS jedes Item in `items` ein `contributions`-Array enthalten
- **THEN** MUSS die Summe aller `percent_of_recipe` über alle Items für denselben Parameter zwischen 99 und 101 liegen (Rundungs-Toleranz)
- **THEN** MUSS `absolute` konsistent mit dem bereits berechneten Einzelwert des Items für den Parameter sein

#### Scenario: Nutrition breakdown with micronutrients (unchanged)

- **WHEN** ein Client die Breakdown-Response empfängt
- **THEN** MUSS jedes Item die 25 Mikronährstoff-Felder (Vitamine und Mineralstoffe) wie in der bestehenden Spec definiert enthalten
