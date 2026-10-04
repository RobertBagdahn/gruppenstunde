## ADDED Requirements

### Requirement: Suggestion panel with 16 cards
Der Button „Was passt hier?“ SHALL ein Vorschlags-Panel öffnen, das bis zu 16 bildlose Karten in 4 Richtungen mit je bis zu 4 Karten zeigt. Jede Karte SHALL Name, Typ-Chip (Rezept/Zutat), Grund und Preis pro Person enthalten.

#### Scenario: Panel opens with suggestions
- **WHEN** ein angemeldeter Nutzer in einem leeren Snack-Slot „Was passt hier?“ klickt
- **THEN** zeigt das Panel 4 Richtungen mit je bis zu 4 Karten und keinem Bild
- **THEN** enthält das Panel einen Knopf „Assistent starten“

#### Scenario: Unauthenticated access
- **WHEN** ein nicht angemeldeter Nutzer den Panel-Endpoint aufruft
- **THEN** antwortet das System mit 401

### Requirement: Directions per meal type
Das System SHALL Richtungen je Meal-Typ definieren: Frühstück = Brot & Aufstrich, Müsli & Brei, Warm, Obst & Joghurt; Snack = Obst & Gemüse, Süß, Herzhaft, Selbstgemacht; Getränke = Kalt, Warm, Selbstgemischt, Fertiggetränk; Mittag/Abend = Klassiker, Vegetarisch/Vegan, One-Pot/Lagerfeuer, Schnell & günstig. Bei Mittag/Abend SHALL zusätzlich eine Richtung „Nachtisch“ verfügbar sein. Abendessen SHALL kalte Gerichte höher gewichten, Mittagessen warme.

#### Scenario: Drinks directions
- **WHEN** das Panel für einen Getränke-Slot geöffnet wird
- **THEN** heißen die Richtungen Kalt, Warm, Selbstgemischt und Fertiggetränk

#### Scenario: Dessert direction
- **WHEN** das Panel für ein Mittagessen geöffnet wird und „Mit Nachtisch“ gewählt ist
- **THEN** erscheint die Richtung Nachtisch zusätzlich zu den vier Hauptrichtungen

### Requirement: Recipes and single ingredients
Snack- und Getränke-Vorschläge SHALL Rezepte und Einzelzutaten (`is_standalone_food`) mit einem Zielanteil von etwa 50/50 mischen. Frühstück, Mittag und Abend SHALL nur Rezepte vorschlagen. Fehlt eine Seite, SHALL die andere auffüllen.

#### Scenario: Snack mix
- **WHEN** für einen Snack genug Rezepte und Zutaten existieren
- **THEN** enthalten die 16 Karten Rezepte und Zutaten in etwa gleicher Zahl

#### Scenario: Not enough ingredients
- **WHEN** nur 2 passende Einzelzutaten existieren
- **THEN** füllen Rezepte die übrigen Plätze

### Requirement: Duplicate exclusion
Das System SHALL für Mittag/Abend Rezepte ausschließen, die in einem Menüplan desselben Events bereits vorkommen (ohne Event: im eigenen Plan). Für Frühstück SHALL nur der gleiche Kalendertag ausschließen. Snacks und Getränke SHALL nicht ausgeschlossen werden, außer sie stehen schon im selben Slot.

#### Scenario: No second main dish
- **WHEN** ein Rezept in einem Menüplan des Events als Abendessen eingeplant ist
- **THEN** erscheint es in keinem Mittag-/Abend-Panel des Events

#### Scenario: Apple on consecutive days
- **WHEN** „Apfel“ am Tag 1 als Snack geplant ist
- **THEN** darf „Apfel“ am Tag 2 als Snack vorgeschlagen werden

#### Scenario: Same ingredient in same slot
- **WHEN** „Apfel“ bereits im Snack-Slot liegt
- **THEN** erscheint „Apfel“ nicht noch einmal für diesen Slot

### Requirement: Similarity via embeddings
Das System SHALL vorhandene pgvector-Embeddings verwenden, um Kandidaten, die geplanten Hauptmahlzeiten ähneln, weich abzuwerten, und um innerhalb einer Richtung unterschiedliche Karten zu wählen. Fehlende Embeddings SHALL nicht zum Ausschluss führen.

#### Scenario: Similar pasta dishes
- **WHEN** ein Nudelgericht am Vortag geplant ist
- **THEN** rangieren weitere Nudelgerichte hinter unähnlichen Kandidaten ähnlicher Qualität

### Requirement: Select with undo
Ein Klick auf eine Karte SHALL Rezept oder Zutat direkt in den Slot übernehmen und ein Rückgängig anbieten; das Panel SHALL geöffnet bleiben.

#### Scenario: Add and undo
- **WHEN** der Nutzer eine Karte anklickt und danach „Rückgängig“ wählt
- **THEN** wird der Eintrag entfernt und das Panel bleibt offen

### Requirement: Relaxing and reshuffle
Liefern Filter weniger als 16 Karten, SHALL das System weiche Kriterien beginnend beim schwächsten lockern und dies im Response ausweisen. Harte Kriterien (Allergien/Ernährungsformen, Kochquelle) SHALL nie gelockert werden. Ein Button „Neu mischen“ SHALL eine neue Auswahl mit neuem Seed liefern.

#### Scenario: Relaxed filter notice
- **WHEN** „kinderfreundlich“ nur 6 Treffer ergibt
- **THEN** wird das Kriterium gelockert und ein Hinweis angezeigt

#### Scenario: Hard criterion kept
- **WHEN** „glutenfrei“ aktiv ist und zu wenige Treffer existieren
- **THEN** bleibt „glutenfrei“ aktiv und es werden weniger Karten gezeigt

### Requirement: Rule-based engine with optional AI re-rank
Die Berechnung SHALL regelbasiert aus der Datenbank erfolgen. Gemini darf Kandidaten optional umsortieren; ohne verfügbares KI-Budget SHALL das System ohne KI antworten.

#### Scenario: AI unavailable
- **WHEN** das KI-Budget erschöpft ist
- **THEN** liefert das Panel dennoch Vorschläge mit `ai_used=false`
