# Recipe Improvements — Merge Delta

Dieses Delta ersetzt die zwei parallelen Verbesserungslisten (Nutri-Improvements + Recipe Hints) durch eine einzige, priorisierte Top-5-Liste mit Current/Threshold/Delta-Darstellung.

## MODIFIED Requirements

### Requirement: Nutri-Score-Verbesserungsvorschläge

The system SHALL expose a unified recipe improvements endpoint that merges Nutri-Score simulation results and configurable RecipeHint evaluations into a single ranked list. Das System MUSS unter der Gesundheits-Analyse bis zu 5 konkrete, priorisierte Vorschläge anzeigen, wie das Rezept verbessert werden kann. Die Vorschläge kombinieren Nutri-Score-Simulation und konfigurierbare RecipeHint-Schwellenwerte zu einem deterministischen Ranking.

#### Scenario: Verbesserungen abrufen

- **WHEN** ein GET-Request an `/api/recipes/{recipe_id}/improvements/` gesendet wird
- **THEN** MUSS die Response ein Objekt mit `items: Improvement[]`, `all_good: bool`, `message: str | null` enthalten
- **THEN** MUSS jedes Improvement-Item die Felder `parameter` (string, z.B. `salt_g`, `sugar_g`, `fat_sat_g`, `fibre_g`, `protein_g`, `energy_kj`), `parameter_label` (deutsche Beschriftung), `current_value` (float), `threshold_value` (float), `delta` (float, `current - threshold` mit Vorzeichen entsprechend `direction`), `unit` (string, z.B. `g`, `kJ`), `direction` (`reduce` | `increase`), `impact_score` (int 0–100), `suggested_ingredients` (Liste der Top-3 beitragenden Zutaten mit `id`, `name`, `contribution_g`), `source` (`nutri_score` | `recipe_hint` | `merged`) und `recommendation_text` (deutsch) enthalten

#### Scenario: Ranking und Limit

- **WHEN** der Server die Improvement-Liste zusammenstellt
- **THEN** MUSS er Kandidaten aus Nutri-Score-Simulation und RecipeHint-Evaluation sammeln
- **THEN** MUSS er Kandidaten mit demselben `parameter`-Key deduplizieren (Merge: höherer `impact_score` gewinnt, Empfehlungstexte werden kombiniert, `source = 'merged'`)
- **THEN** MUSS er die deduplizierten Kandidaten nach `impact_score` absteigend sortieren
- **THEN** DARF er maximal 5 Items zurückgeben

#### Scenario: All-Good-Zustand

- **WHEN** das Rezept Nutri-Score-Klasse A hat UND keine RecipeHint überschritten ist
- **THEN** MUSS die Response `all_good: true` und `items: []` enthalten
- **THEN** MUSS `message` gesetzt sein auf „Dieses Rezept ist in allen bewerteten Dimensionen im grünen Bereich."

#### Scenario: Threshold-Quelle

- **WHEN** für einen Parameter eine RecipeHint mit `min_max='max'` existiert
- **THEN** MUSS `threshold_value` aus `RecipeHint.max_value` übernommen werden, `direction='reduce'`
- **WHEN** für einen Parameter eine RecipeHint mit `min_max='min'` existiert
- **THEN** MUSS `threshold_value` aus `RecipeHint.min_value` übernommen werden, `direction='increase'`
- **WHEN** für einen Parameter keine RecipeHint existiert
- **THEN** MUSS `threshold_value` aus der Nutri-Score-Punktgrenze für eine Klasse besser als die aktuelle Klasse berechnet werden

#### Scenario: Frontend-Darstellung

- **WHEN** die Gesundheits-Analyse-Sektion auf der Rezept-Detailseite geladen wird
- **THEN** MUSS eine einzige Komponente `RecipeImprovements` die Liste als Karten rendern
- **THEN** MUSS jede Karte `current_value`, `threshold_value` und `delta` visuell dargestellt enthalten (z.B. Fortschrittsbalken oder Text „−2,3 g bis Schwellwert")
- **THEN** MUSS jede Karte die Top-3 beitragenden Zutaten als Chips zeigen
- **THEN** MUSS jede Karte den `recommendation_text` anzeigen
- **THEN** DARF keine zweite, separate Liste mit Nutri-Improvements oder Recipe Hints mehr auf der Seite existieren

### Requirement: Recipe hints include improvement text

The system SHALL surface RecipeHint improvement texts exclusively through the unified improvements endpoint. Das System MUSS `RecipeHint.improvement_text` und Schwellenwerte ausschließlich über den gemergten Improvements-Endpoint ausliefern. Ein eigenständiger `/recipe-hints/`-Endpoint existiert nicht mehr.

#### Scenario: RecipeHint-Empfehlung erscheint in Improvements

- **WHEN** eine `RecipeHint` für einen Parameter überschritten ist
- **THEN** MUSS der zugehörige Eintrag in der Improvements-Liste das `improvement_text` der Hint enthalten
- **THEN** MUSS `source` auf `recipe_hint` gesetzt sein (oder `merged`, falls zusätzlich aus Nutri-Score gemergt)

#### Scenario: Kein separater Recipe-Hints-Endpoint

- **WHEN** ein Client versucht, `/api/recipes/{id}/recipe-hints/` aufzurufen
- **THEN** MUSS der Server `404 Not Found` zurückgeben

### Requirement: Klickbare Verbesserungsvorschläge

The system SHALL allow users to open a detail modal for each improvement card that originates from a RecipeHint. Das System MUSS für jede Improvement-Karte, deren `source` `recipe_hint` oder `merged` ist, einen „Details"-Button anbieten, der den bestehenden `HintDetailModal` öffnet und die zugrundeliegende Hint inkl. Referenzwerten und Empfehlungstext anzeigt.

#### Scenario: Details-Modal öffnen

- **WHEN** der Nutzer auf einer Improvement-Karte mit `source` `recipe_hint` oder `merged` den „Details"-Button klickt
- **THEN** MUSS der `HintDetailModal` geöffnet werden
- **THEN** MUSS der Modal die RecipeHint-Details (Parameter, Min/Max-Schwelle, Empfehlung, Referenzwerte) anzeigen

#### Scenario: Kein Details-Button für reine Nutri-Score-Einträge

- **WHEN** eine Improvement-Karte `source === 'nutri_score'` hat (keine zugehörige RecipeHint)
- **THEN** DARF kein „Details"-Button auf der Karte erscheinen
