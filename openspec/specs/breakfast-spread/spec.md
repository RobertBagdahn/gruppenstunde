# breakfast-spread Specification

## ADDED Requirements

### Requirement: Content-Tag breakfast-fat

Das System SHALL einen Content-Tag mit slug `breakfast-fat` bereitstellen. Zutaten mit diesem Tag SHALL im Frühstücksassistenten als Streichfette behandelt werden.

#### Scenario: Tag existiert nach Seed

- **WHEN** das Seed-Kommando `seed_breakfast_catalog` ausgeführt wird
- **THEN** SHALL ein Tag mit slug `breakfast-fat` und name `breakfast-fat` existieren

#### Scenario: Zutat mit Tag erscheint im Katalog

- **WHEN** eine Zutat den Tag `breakfast-fat` hat und `is_standalone_food=true` ist
- **THEN** SHALL sie im `GET /breakfast-catalog/`-Response unter `fat_ingredients` erscheinen

### Requirement: BreakfastCatalogOut um fat_ingredients erweitert

Das System SHALL das `BreakfastCatalogOut`-Schema um das Feld `fat_ingredients: list[FatIngredientOut]` erweitern.

#### Scenario: Katalog enthält breakfast-fat-Zutaten

- **WHEN** `GET /breakfast-catalog/` aufgerufen wird
- **THEN** SHALL `fat_ingredients` alle Zutaten mit Tag `breakfast-fat` und `is_standalone_food=true` enthalten (sortiert nach name)
- **AND** SHALL jede Zutat `id`, `name`, `slug`, `energy_kcal`, `price_per_kg` und `portions` enthalten

### Requirement: Wizard-Schritt Streichfett

Das System SHALL einen neuen Schritt "Streichfett" zwischen Basis (Schritt 1) und Belag (Schritt 3) im Frühstücks-Wizard anzeigen. Der Wizard hat damit 6 Schritte.

#### Scenario: Schritt angezeigt wenn breakfast-fat-Zutaten existieren

- **WHEN** der Katalog `fat_ingredients` enthält
- **THEN** SHALL Schritt 2 "Streichfett" heißen und zwischen Basis und Belag erscheinen

#### Scenario: Schritt mit Hinweis wenn keine Zutaten existieren

- **WHEN** der Katalog keine `fat_ingredients` enthält
- **THEN** SHALL Schritt 2 den Hinweis "Keine Streichfette verfügbar — lege Zutaten mit dem Tag breakfast-fat an" anzeigen
- **AND** SHALL der "Weiter"-Button aktiv sein

#### Scenario: Default-Verteilung beim ersten Öffnen

- **WHEN** der Wizard neu geöffnet wird (kein gespeicherter Zustand)
- **THEN** SHALL die Verteilung sein: erstes breakfast-fat-Ingredient (Margarine) = 50%, "Kein Fett" = 50%, restliche Fette = 0%

### Requirement: Streichfett-Verteilung mit Share-Slidern

Der Streichfett-Schritt SHALL für jedes `breakfast-fat`-Ingredient plus "Kein Fett" einen Share-Slider (0-100%, rebalanced) anzeigen. Die Summe MUSS 100% betragen.

#### Scenario: Slider-Rebalance

- **WHEN** der Nutzer einen Streichfett-Slider verändert
- **THEN** SHALL das System die übrigen ungesperrten Slider so anpassen, dass die Summe 100% bleibt (Largest Remainder Method)

#### Scenario: "Kein Fett" hat 0 kcal

- **WHEN** der Streichfett-Schritt rendert
- **THEN** SHALL "Kein Fett" mit 0 kcal/100g und 0€/kg angezeigt werden
- **AND** SHALL "Kein Fett" immer als letzter Eintrag erscheinen

### Requirement: Streichfett-Kcal im Kcal-Fluss

Das System SHALL die Streichfett-Kcal vor dem Belag aus dem verteilbaren Budget abziehen. Streichfett-Kcal wird berechnet als `sharePercent × FAT_GRAMS_PER_PERSON × (energyKcal100g / 100)`.

#### Scenario: Streichfett reduziert Belag-Budget

- **WHEN** distributableKcal = 500, breadKcal = 300, butterKcal = 40
- **THEN** SHALL remainingForBelag = 500 - 300 - 40 = 160 sein
- **AND** SHALL der Belag nur noch 160 kcal zur Verfügung haben

#### Scenario: Kein Streichfett → kein Abzug

- **WHEN** "Kein Fett" = 100%
- **THEN** SHALL butterKcal = 0 sein
- **AND** SHALL distributableKcal unverändert an Brot + Belag gehen

#### Scenario: Mehrere Streichfette werden summiert

- **WHEN** Butter = 50% (717 kcal/100g) und Margarine = 30% (717 kcal/100g)
- **THEN** SHALL butterKcal = 0.5 × 8g × 7.17 + 0.3 × 8g × 7.17 = 45.9 kcal sein

### Requirement: Cockpit-Sektion Streichfett

Der StepCockpit SHALL eine eigene Sektion "Streichfett" zwischen Brot und Belag anzeigen, mit Zeilen pro Fett sowie Gesamt-Gramm und kcal.

#### Scenario: Streichfett-Sektion im Cockpit

- **WHEN** Streichfette ausgewählt sind (butterKcal > 0)
- **THEN** SHALL das Cockpit eine Sektion "Streichfett" mit jeder aktiven Fett-Zutat anzeigen
- **AND** SHALL die Sektion Gramm/Person, kcal/Person und den prozentualen Anteil enthalten
- **AND** SHALL eine Gesamt-Zeile "Streichfett gesamt" mit summierten Werten erscheinen

### Requirement: Leftover-Kalkulation für Streichfette

Das System SHALL Streichfette in der Leftover-Berechnung unterstützen — analog zu Belag-Leftovers, aber als separater Block.

#### Scenario: Leftover-Endpunkt für Streichfette

- **WHEN** der Nutzer den Assistenten speichert
- **THEN** SHALL für jedes aktive Streichfett mit `packages_needed` und `leftover_g` berechnet werden
- **AND** SHALL die Packungsgröße aus der Portion "Packung (Xg)" stammen

### Requirement: Speicherung als MealItems

Streichfette SHALL als MealItems mit `quantity = gramsPerPerson`, `measuring_unit = g`, `factor = 1.0` gespeichert werden. Der Tag `breakfast-fat` wird automatisch über `ingredient_tags` (resolve aus Ingredient-Tags) an das MealItem gehängt.

#### Scenario: Streichfett-Quantity pro Person

- **WHEN** das Frühstück gespeichert wird
- **THEN** SHALL jedes aktive Streichfett als MealItem mit quantity = Gramm pro Person erscheinen
- **AND** SHALL `ingredient_tags` den slug `breakfast-fat` enthalten

### Requirement: Buttersorten-Präzisierung

Butter und Margarine unterscheiden sich nicht in ihren Nährwerten (je 717 kcal/100g) aber im Preis (Butter 15€/kg, Margarine 8€/kg) und in der Packungsgröße (Butter 250g, Margarine 500g).

#### Scenario: Butter-Preis und Packung

- **WHEN** Butter im Katalog geladen wird
- **THEN** SHALL `price_per_kg = 15.0` und Packung "Packung (250g)" sein

#### Scenario: Margarine-Preis und Packung

- **WHEN** Margarine im Katalog geladen wird
- **THEN** SHALL `price_per_kg = 8.0` und Packung "Packung (500g)" sein

### Requirement: Grammzahl 8g pro Person fix

Das Streichfett SHALL mit 8g pro Person berechnet werden — fest, nicht durch den Nutzer konfigurierbar. Referenzportion ist "Belag knapp".

#### Scenario: Kein Intensity-Selector

- **WHEN** der Streichfett-Schritt angezeigt wird
- **THEN** SHALL es keinen Intensity-Button (Knapp/Normal/Üppig) für Streichfette geben
- **AND** SHALL immer 8g pro Person verwendet werden

### Requirement: Warme-Gerichte-Butter ist getrennt

Die Butter in warmen Gerichten (Rührei, Pfannkuchen, Omelett) SHALL über die RecipeItems des jeweiligen Rezepts berechnet werden — unabhängig vom Streichfett-Schritt. Die Beträge SHALL in der Einkaufsliste addiert werden.

#### Scenario: Keine Doppelberechnung

- **WHEN** Rührei (mit 5g Butter als RecipeItem) UND Streichfett "Butter 50%" ausgewählt sind
- **THEN** SHALL die Butter aus Rührei NICHT vom Streichfett-Budget abgezogen werden
- **AND** SHALL die Einkaufsliste beide Butter-Mengen enthalten (getrennt oder addiert)
