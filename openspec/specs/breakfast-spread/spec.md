# breakfast-spread Specification

## Purpose
Streichfette (Butter, Margarine) als eigene Buffet-Rolle mit eigenem Wizard-Schritt, Verteilung, Kcal-Berechnung und Leftover-Kalkulation behandeln, getrennt vom übrigen Belag.
## Requirements
### Requirement: Content-Tag breakfast-fat

Das System SHALL Streichfette über den Rollen-Tag `buffet-fat` („Streichfett“) kennzeichnen. Zutaten mit diesem Tag SHALL im Frühstücksassistenten und im Buffet-Builder als Streichfette behandelt werden. Der frühere Tag `breakfast-fat` entfällt.

#### Scenario: Tag existiert nach Migration

- **WHEN** die Migrationen ausgeführt wurden
- **THEN** SHALL ein Tag mit slug `buffet-fat` und name „Streichfett“ existieren

#### Scenario: Tag existiert nach Seed

- **WHEN** die Datenmigration bzw. `seed_buffet_catalog` ausgeführt wurde
- **THEN** SHALL ein Tag mit slug `buffet-fat` und name „Streichfett“ existieren (Nachfolger von „Tag existiert nach Migration“)

#### Scenario: Zutat mit Tag erscheint im Katalog

- **WHEN** eine für den Nutzer sichtbare Zutat den Tag `buffet-fat` hat
- **THEN** SHALL sie im `GET /api/supply/breakfast-catalog/`-Response unter `fat_ingredients` erscheinen, unabhängig von `is_standalone_food`

### Requirement: BreakfastCatalogOut um fat_ingredients erweitert

Das System SHALL im `BreakfastCatalogOut`-Schema das Feld `fat_ingredients: list[FatIngredientOut]` liefern. Der Endpunkt `GET /api/supply/breakfast-catalog/` SHALL als Adapter auf die Buffet-Rollen arbeiten: `base_ingredients` ← `buffet-bread` (nur Zutaten), `fat_ingredients` ← `buffet-fat`, `topping_ingredients` ← `buffet-savory` ∪ `buffet-sweet`, `extra_ingredients` ← `buffet-fresh`, `drink_ingredients`/`drink_recipes` ← `buffet-drink`, `warm_meal_recipes` ← `buffet-dish` (nur Rezepte).

#### Scenario: Katalog enthält Streichfette

- **WHEN** `GET /api/supply/breakfast-catalog/` aufgerufen wird
- **THEN** SHALL `fat_ingredients` alle sichtbaren Zutaten mit Tag `buffet-fat` enthalten (sortiert nach name)
- **AND** SHALL jede Zutat `id`, `name`, `slug`, `energy_kcal`, `price_per_kg` und `portions` (nur aktive Portionen) enthalten

#### Scenario: Katalog enthält breakfast-fat-Zutaten

- **WHEN** `GET /api/supply/breakfast-catalog/` aufgerufen wird
- **THEN** SHALL `fat_ingredients` alle sichtbaren Zutaten mit Rolle `buffet-fat` enthalten (Nachfolger von „Katalog enthält Streichfette“)

#### Scenario: Beläge aus beiden Belag-Rollen

- **WHEN** „Gouda“ die Rolle `buffet-savory` und „Nutella“ die Rolle `buffet-sweet` trägt
- **THEN** SHALL beide in `topping_ingredients` erscheinen

### Requirement: Wizard-Schritt Streichfett
Das System SHALL einen Schritt „Preset wählen“ vor die bestehenden Frühstücksschritte Basis, Streichfett, Belag, Extras, Getränke und Cockpit setzen. Der Frühstückswizard hat damit sieben Schritte. Der Streichfett-Schritt SHALL weiterhin zwischen Basis und Belag liegen und für jedes `buffet-fat`-Ingredient plus „Kein Fett“ einen Share-Slider anzeigen.

#### Scenario: Frühstückspreset ist Schritt 1
- **WHEN** ein Nutzer den Frühstücksassistenten neu öffnet
- **THEN** heißt Schritt 1 „Frühstück wählen“ und zeigt die bestätigten Frühstücksprofile
- **THEN** folgen nach Auswahl die bisherigen Schritte Basis, Streichfett, Belag, Extras, Getränke und Abschluss

#### Scenario: Schritt Streichfett bei vorhandenen Zutaten
- **WHEN** der Katalog `fat_ingredients` enthält
- **THEN** heißt Schritt 3 „Streichfett“ und steht zwischen Basis und Belag

#### Scenario: Schritt Streichfett ohne passende Zutaten
- **WHEN** der Katalog keine `fat_ingredients` enthält
- **THEN** zeigt Schritt 3 den Hinweis „Keine Streichfette verfügbar — lege Zutaten mit dem Tag buffet-fat an“
- **AND** der „Weiter“-Button bleibt aktiv

#### Scenario: Default-Verteilung beim ersten Öffnen
- **WHEN** ein neues Frühstückspreset gewählt wird
- **THEN** bleibt die bestehende Default-Verteilung für Streichfette erhalten: erstes Fett = 50 %, „Kein Fett“ = 50 %, übrige Fette = 0 %

#### Scenario: Schritt angezeigt wenn breakfast-fat-Zutaten existieren

- **WHEN** der Katalog `fat_ingredients` enthält
- **THEN** SHALL Schritt 2 "Streichfett" heißen und zwischen Basis und Belag erscheinen

#### Scenario: Schritt mit Hinweis wenn keine Zutaten existieren

- **WHEN** der Katalog keine `fat_ingredients` enthält
- **THEN** SHALL Schritt 2 den Hinweis "Keine Streichfette verfügbar — lege Zutaten mit dem Tag breakfast-fat an" anzeigen
- **AND** SHALL der "Weiter"-Button aktiv sein

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
Streichfette SHALL als `MealItem`s mit `quantity=gramsPerPerson`, `measuring_unit=g` und `factor=1.0` gespeichert werden. Der Rollen-Tag `buffet-fat` SHALL über die Ingredient-Tags lesbar bleiben. Vom direkten Frühstücksassistenten erzeugte `MealItem`s SHALL mit `is_breakfast_assistant=true` markiert werden, damit sie sicher von manuellen Einträgen unterscheidbar sind. Der direkte Meal-Modus SHALL die Auswahl pro Person und den gewählten Profil-Slug in der regulären Mahlzeit speichern; der Referenzmahlzeiten-Modus SHALL weiterhin ausschließlich die Referenzmahlzeit aktualisieren. Beim erneuten Öffnen des direkten Meal-Modus MUST das Profil sowie die gespeicherte Auswahl und deren Share-Verteilung rekonstruierbar sein.

#### Scenario: Streichfett-Quantity pro Person
- **WHEN** das Frühstück gespeichert wird
- **THEN** erscheint jedes aktive Streichfett als MealItem mit `quantity` gleich Gramm pro Person, Gramm-Einheit und `factor=1.0`
- **THEN** enthält `ingredient_tags` den Rollen-Slug `buffet-fat`

#### Scenario: Direkte Frühstücksmahlzeit speichern
- **GIVEN** der Assistent wurde aus einem Frühstücks-MealSlot geöffnet
- **WHEN** der Nutzer ein Preset konfiguriert und speichert
- **THEN** werden die resultierenden Items der direkten Mahlzeit zugeordnet und die Referenzmahlzeit bleibt unverändert

#### Scenario: Referenzmahlzeit bleibt getrennt
- **GIVEN** der Assistent wurde aus `/meal-plans/{id}/ref-meals/breakfast/wizard` geöffnet
- **WHEN** das Frühstück gespeichert wird
- **THEN** wird weiterhin nur die Frühstücks-Referenzmahlzeit gespeichert und keine reguläre Mahlzeit verändert

#### Scenario: Direkte Frühstücksauswahl wiederherstellen
- **GIVEN** ein direktes Frühstück wurde mit einem Profil und veränderten Shares gespeichert
- **WHEN** der Frühstücksassistent für dieselbe Mahlzeit erneut geöffnet wird
- **THEN** ist der gespeicherte Profilname erkennbar und die bestehende Auswahl sowie rekonstruierbare Share-Verteilung sind gesetzt

### Requirement: Buttersorten-Präzisierung

Butter und Margarine SHALL mit unterschiedlichem Preis und Packungsgröße geführt werden, obwohl sie sich in den Nährwerten nicht unterscheiden (je 717 kcal/100g): Butter 15€/kg in 250g-Packungen, Margarine 8€/kg in 500g-Packungen.

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

### Requirement: Manuelle MealItems beim direkten Frühstücksspeichern
Im direkten Meal-Modus SHALL der Nutzer beim Speichern wählen können, ob manuelle Items außerhalb des Assistenten erhalten bleiben (`preserve`) oder alle bisherigen Items ersetzt werden (`replace`). Erkannte Frühstücks-Assistenten-Items werden beim Ersetzen durch die neue Auswahl ersetzt. Unbekannte manuelle Items SHALL bei `preserve` erhalten bleiben. Der Referenzmahlzeiten-Modus bleibt von dieser Regel unberührt.

#### Scenario: Manuelle Items erhalten
- **GIVEN** eine direkte Mahlzeit enthält Frühstücks-Assistenten-Items und manuelle Einträge
- **WHEN** der Nutzer `preserve` auswählt
- **THEN** werden markierte Assistenten-Items ersetzt und manuelle Einträge beibehalten, auch wenn diese nur einen globalen Buffet-Tag tragen

#### Scenario: Alle Items ersetzen
- **GIVEN** eine direkte Mahlzeit enthält bestehende Einträge
- **WHEN** der Nutzer `replace` auswählt
- **THEN** werden alle bisherigen Einträge durch die Assistenten-Auswahl ersetzt

### Requirement: Frühstücksassistent im normalen MealSlot
Der MealSlot für `meal_type=breakfast` SHALL den bestehenden mehrstufigen Frühstücksassistenten mit Share-Slidern als regulären Einstieg anbieten. Der Ablauf SHALL denselben Wizard-Fortschritt, dieselbe Button-Anordnung und dieselben responsiven Design-Tokens wie der generische Buffet-Wizard verwenden. Die bestehenden Referenzmahlzeiten-Routen SHALL erhalten bleiben.

#### Scenario: Frühstücks-MealSlot öffnet den alten Assistenten
- **GIVEN** eine reguläre Mahlzeit hat `meal_type=breakfast`
- **WHEN** ein Nutzer „Buffet-Assistent“ öffnet
- **THEN** wird der bestehende Frühstücksassistent im direkten Meal-Modus geöffnet
- **THEN** der Spezialassistent für Referenzmahlzeiten bleibt zusätzlich unter seinem bisherigen Pfad erreichbar

#### Scenario: Andere Mahlzeitentypen verwenden den Buffet-Wizard
- **GIVEN** eine reguläre Mahlzeit hat `meal_type` ungleich `breakfast`
- **WHEN** ein Nutzer „Buffet-Assistent“ öffnet
- **THEN** wird der generische, mehrstufige Buffet-Wizard für diesen Mahlzeitentyp geöffnet

### Requirement: Frühstücks-Presets
Schritt 1 SHALL die folgenden fünf Profile als vollständige, vorausgewählte und anschließend änderbare Frühstücksoptionen zeigen: „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“ und „Brot mit Fleisch“. „Freies Buffet“ SHALL als separate, immer verfügbare Option in den Buffet-Wizard wechseln. Die Profile SHALL vorhandene sichtbare Katalog-Items nutzen und SHALL vorab passende Basis-, Belag-, Streichfett-, Extras- und Getränke-Shares setzen.

#### Scenario: Nur Müsli
- **WHEN** ein Nutzer „Nur Müsli“ wählt
- **THEN** werden Müsli-/Haferflocken-Basis, passende Extras und passende Getränke vorausgewählt
- **THEN** kann der Nutzer alle Shares, Mengen und Items in den folgenden Schritten ändern

#### Scenario: Brot und Müsli
- **WHEN** ein Nutzer „Brot und Müsli“ wählt
- **THEN** werden Brot und eine Müsli-/Haferflocken-Auswahl mit passenden Beilagen vorausgewählt
- **THEN** kann der Nutzer alle Shares, Mengen und Items in den folgenden Schritten ändern

#### Scenario: Pflanzlich, vegetarisch oder mit Fleisch
- **WHEN** ein Nutzer eines der Profile „Brot pflanzlich“, „Brot vegetarisch“ oder „Brot mit Fleisch“ wählt
- **THEN** enthält die Vorauswahl nur passende Produkte für das gewählte Profil
- **THEN** bleibt die Auswahl vollständig manuell änderbar; die Profilwahl schreibt keine globalen Tags

#### Scenario: Profil und Free sind getrennt
- **WHEN** der Frühstücksassistent in Schritt 1 geöffnet wird
- **THEN** sind die fünf bestätigten Profile auswählbar und „Freies Buffet“ erscheint als separate Option
- **THEN** zählt „Freies Buffet“ nicht zu den fünf Frühstücksprofilen
