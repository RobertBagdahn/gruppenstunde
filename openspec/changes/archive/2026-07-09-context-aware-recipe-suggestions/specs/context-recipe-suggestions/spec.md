# context-recipe-suggestions Specification

## ADDED Requirements

### Requirement: Kontext-Prompt für Gemini

Das System SHALL den Gemini-Prompt um folgende Kontext-Informationen anreichern, bevor die Kandidaten zur Auswahl gestellt werden.

#### Scenario: Prompt enthält Event-Kontext

- **WHEN** der MealPlan mit einem Event verknüpft ist
- **THEN** enthält der Prompt: Event-Titel, Event-Beschreibung, Event-Datum (start_date, end_date), Event-Tags, Event-Ort
- **WHEN** der MealPlan kein Event hat
- **THEN** enthält der Prompt nur die MealPlan-Daten

#### Scenario: Prompt enthält MealPlan-Kontext

- **WHEN** ein User Vorschläge anfordert
- **THEN** enthält der Prompt: MealPlan-Titel, MealPlan-Beschreibung, alle MealPlan-Tags, Zeitraum (start_datetime bis end_datetime)

#### Scenario: Prompt enthält den aktuellen Essensplan

- **WHEN** ein User Vorschläge anfordert
- **THEN** enthält der Prompt eine Übersicht aller bereits geplanten Mahlzeiten, strukturiert nach Tag und Mahlzeit
- **THEN** jede Mahlzeit enthält: Tag-Nummer, meal_type (breakfast/lunch/dinner/snack), Rezept-Titel (falls vorhanden)
- **THEN** wiederholte Rezepte oder Zutaten sind explizit sichtbar

#### Scenario: Prompt enthält Kandidaten-Liste

- **WHEN** ein User Vorschläge anfordert
- **THEN** werden die Top 30 Kandidaten (nach algorithmischem Scoring) an Gemini übergeben
- **THEN** jeder Kandidat enthält: id, title, recipe_type, Kurzbeschreibung, estimated_time_minutes, difficulty, price_per_serving, usage_count
- **THEN** die Kandidaten sind gemischt (nicht nach recipe_type gruppiert)

#### Scenario: Gemini-Rückfall bei Fehler

- **WHEN** Gemini nicht erreichbar ist oder ein invalides JSON zurückgibt
- **THEN** wird auf das rein algorithmische Scoring + Kategorisierung zurückgefallen
- **THEN** das Response-Feld `ai_enhanced` ist false

### Requirement: Kandidaten-Vorauswahl auf Top 30

Das System SHALL nach den harten Filtern (Status, Meal-Type, Nutritional Tags) und dem algorithmischen Scoring die Top 30 Kandidaten auswählen, bevor Gemini die finale Auswahl trifft.

#### Scenario: Mehr als 30 Kandidaten

- **WHEN** nach harten Filtern und Scoring mehr als 30 Rezepte verfügbar sind
- **THEN** werden die Top 30 nach Gesamt-Score ausgewählt
- **THEN** die Auswahl ist gemischt (keine recipe_type-Quoten)

#### Scenario: Weniger als 30 Kandidaten

- **WHEN** nach harten Filtern weniger als 30 Rezepte übrig sind
- **THEN** werden alle verfügbaren Rezepte an Gemini übergeben
- **THEN** Gemini wählt aus der kleineren Menge

## MODIFIED Requirements

### Requirement: KI-Kontext-Vorschläge (Standard)

Das System SHALL KI-Kontext-Vorschläge als Standard verwenden (statt optionalem KI-Reranking der Top 15). Gemini SHALL den vollen Kontext plus Top 30 Kandidaten erhalten.

#### Scenario: Gemini Enhancement aktiv (Default)

- **WHEN** der Query-Parameter `context_enhance` (default true) gesetzt ist oder fehlt
- **THEN** werden Event-Kontext, MealPlan-Kontext und der gesamte Essensplan in den Prompt eingefügt
- **THEN** werden die Top 30 Scoring-Ergebnisse an Gemini gesendet
- **THEN** Gemini returned 9 Rezepte mit Kategorisierung (top_picks, variety, discovery) und reason_text
- **THEN** das Response-Feld `ai_enhanced` ist true

#### Scenario: Gemini Enhancement deaktiviert

- **WHEN** `context_enhance=false` gesetzt ist
- **THEN** werden rein algorithmische Vorschläge geliefert (5 Scoring-Dimensionen, Top 9, Kategorisierung wie bisher)
- **THEN** das Response-Feld `ai_enhanced` ist false

#### Scenario: Gemini-Fehler (Fallback)

- **WHEN** `context_enhance=true` (oder default), aber Gemini nicht erreichbar ist
- **THEN** wird auf das rein algorithmische Scoring zurückgefallen
- **THEN** das Response-Feld `ai_enhanced` ist false
