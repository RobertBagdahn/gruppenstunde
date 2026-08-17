## ADDED Requirements

### Requirement: Prominenter CTA-Button im leeren Mahlzeiten-Slot
Ein leerer MealSlot (items.length === 0, nicht is_external, canEdit true) MUSS einen prominenten "Rezept wählen"-Button anzeigen, der den RecipeSearchDialog öffnet.

#### Scenario: Leerer MealSlot zeigt CTA
- **WHEN** ein MealSlot keine Items hat, nicht external ist und canEdit true ist
- **THEN** ein großer Button "🔍 Rezept oder Zutat wählen" wird im Slot-Body gerendert

#### Scenario: MealSlot mit Items zeigt keinen CTA
- **WHEN** ein MealSlot bereits Items zugewiesen hat
- **THEN** der CTA-Button wird nicht angezeigt; bestehende + und Sliders-Buttons bleiben

#### Scenario: Externer MealSlot zeigt keinen CTA
- **WHEN** ein MealSlot is_external true hat
- **THEN** der CTA-Button wird nicht angezeigt

### Requirement: Leerer-Status als Klickfläche
Der Hinweis-Text "Noch kein Rezept zugeordnet" in einem leeren MealSlot MUSS anklickbar sein und den RecipeSearchDialog öffnen.

#### Scenario: Klick auf leeren Hinweis
- **WHEN** User auf "Noch kein Rezept zugeordnet" klickt
- **THEN** der RecipeSearchDialog öffnet sich

### Requirement: Rezept-vorschlagen-Button
Ein leerer MealSlot MUSS einen "Rezept vorschlagen"-Button zeigen, der ein zufälliges filterkonformes Rezept aus den Top-20 Ergebnissen abruft und den RecipePreviewDialog öffnet.

#### Scenario: Zufalls-Vorschlag
- **WHEN** User auf "Rezept vorschlagen" klickt
- **THEN** ein zufälliges Rezept aus den Top-20 passenden Ergebnissen wird abgerufen und der RecipePreviewDialog geöffnet

#### Scenario: Nutzer bestätigt Vorschlag
- **WHEN** User im PreviewDialog auf "Hinzufügen" klickt
- **THEN** das Rezept wird dem Meal hinzugefügt und der Dialog schließt sich

#### Scenario: Nutzer lehnt Vorschlag ab
- **WHEN** User im PreviewDialog auf "Abbrechen" klickt
- **THEN** das Rezept wird nicht hinzugefügt und der Dialog schließt sich

#### Scenario: Keine passenden Rezepte
- **WHEN** keine Rezepte die aktuellen Filter (Diät, Kategorie) erfüllen
- **THEN** der Button zeigt "Keine passenden Rezepte" und ist deaktiviert

### Requirement: Verbesserte Inline-Suchergebnisse
Die Inline-Such-Ergebnisliste im MealSlot MUSS für jeden Vorschlag anzeigen: Ampel-Farbpunkt (recipe_badge), Preis pro Portion, und Verwendungshäufigkeit.

#### Scenario: Inline-Ergebnis mit Ampel und Preis
- **WHEN** Suchergebnisse in der Inline-Suche angezeigt werden
- **THEN** jedes Ergebnis zeigt farbigen Punkt (grün/gelb/rot), Preis ("X,XX €"), und Verwendungszähler ("12×")

#### Scenario: Inline-Ergebnis ohne Preis
- **WHEN** ein Rezept keinen Preis hat (price_per_serving null)
- **THEN** "—" wird anstelle des Preises angezeigt
