# recipe-rules-display Specification

## Purpose
TBD - created by archiving change recipe-rules-box. Update Purpose after archive.
## Requirements
### Requirement: Backend liefert alle Rezeptregeln mit Status

Das System MUST einen Endpunkt `GET /api/recipes/{recipe_id}/rules/` bereitstellen, der aktive Regeln mit `scope=recipe` gegen die Werte eines Rezepts auswertet, wenn das Rezept den Typ `warm_meal` oder `cold_meal` hat. Für anwendbare Rezepte MUST der Endpunkt für jede Regel das Ergebnis (`green`, `yellow` oder `red`) zurückgeben, einschließlich der erfüllten (grünen) Regeln.

Für Rezepte mit anderen `recipe_type`-Werten MUST der Endpunkt keine Regeln auswerten und dem Client signalisieren, dass Rezeptregeln für diesen Typ nicht sinnvoll sind. Die Antwort MUST dabei leer bleiben (`items=[]`, Zähler `0`) und SHOULD einen deutschen Hinweis enthalten, dass die Regeln im Planer auf die Mahlzeit angewandt werden.

Die Antwort MUST aggregierte Zähler `green_count`, `yellow_count` und `red_count` enthalten sowie eine Liste `items` mit je `rule_id`, `name`, `parameter`, `status`, `value_per_serving`, `display_value`, `unit`, `threshold`, `threshold_direction` und `tip_text`. Falls das Response-Schema erweitert wird, MUST optionale Felder wie `is_applicable` und `message` in Pydantic und Zod synchron sein.

Nur Regeln mit `is_active=True` MUST berücksichtigt werden.

#### Scenario: Rezept mit gemischten Regelergebnissen

- **WHEN** ein Client `GET /api/recipes/{recipe_id}/rules/` für ein Rezept mit `recipe_type="warm_meal"` oder `recipe_type="cold_meal"` aufruft, dessen Werte einige `scope=recipe`-Regeln erfüllen und andere nicht
- **THEN** liefert das System Status 200 mit allen ausgewerteten Regeln (grün, gelb und rot) und korrekten Zählern, deren Summe der Anzahl der `items` entspricht

#### Scenario: Erfüllte Regel ist enthalten

- **WHEN** ein anwendbares Rezept eine `scope=recipe`-Regel vollständig erfüllt
- **THEN** ist diese Regel mit `status="green"` in `items` enthalten und nicht weggefiltert

#### Scenario: Inaktive Regeln werden ignoriert

- **WHEN** eine `scope=recipe`-Regel `is_active=False` hat
- **THEN** erscheint diese Regel nicht in der Antwort

#### Scenario: Nicht anwendbarer Rezepttyp

- **WHEN** ein Client `GET /api/recipes/{recipe_id}/rules/` für ein Rezept mit `recipe_type="breakfast"`, `"snack"`, `"dessert"`, `"drink"`, `"recipe_part"` oder `"ingredient"` aufruft
- **THEN** liefert das System Status 200 mit `items=[]`, `green_count=0`, `yellow_count=0` und `red_count=0`
- **THEN** signalisiert die Antwort, dass Rezeptregeln für diesen Rezepttyp nicht sinnvoll sind und die Regeln im Planer auf die Mahlzeit angewandt werden

#### Scenario: Unbekanntes Rezept

- **WHEN** ein Client den Endpunkt mit einer nicht existierenden `recipe_id` aufruft
- **THEN** liefert das System Status 404

### Requirement: Werte werden pro Portion bereitgestellt

Der Endpunkt MUST für jede Regel `value_per_serving` als den Wert **einer Portion** des Rezepts liefern.
Wenn ein Rezept für $N$ Portionen angelegt ist (`recipe.portions = N`), MUST die Umrechnung von Nährwerten
`(Wert pro 100g × Gesamtgewicht_g / 100) / max(recipe.portions, 1)` verwenden.
Die Parameter `weight_g` (Gesamtgewicht pro Portion) und `price_total` (Preis pro Portion) MUST ebenfalls durch `max(recipe.portions, 1)` dividiert werden.
Der Parameter `nutri_class` (Qualitätsklasse) MUSS unskaliert bleiben.
Die Statusauswertung MUSS unverändert über `Rule.evaluate()` erfolgen.

#### Scenario: Umrechnung auf Portion bei 1-Portionen-Rezept

- **WHEN** ein Rezept für 1 Portion ein Gesamtgewicht von 350g hat und sein Eiweißwert 8.0g pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `protein_g` dem Portionswert `8.0 × 350 / 100 = 28.0g`

#### Scenario: Umrechnung auf Portion bei Multi-Portionen-Rezept

- **WHEN** ein Rezept für 4 Portionen ein Gesamtgewicht von 1200g hat und sein Energiewert 150 kcal pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `energy_kcal` dem Wert pro Portion `(150 × 1200 / 100) / 4 = 450.0 kcal`
- **AND** dieser Wert (450 kcal) wird gegen die Einzelportions-Regelgrenzen ausgewertet

#### Scenario: Gewicht und Preis pro Portion bei Multi-Portionen-Rezept

- **WHEN** ein Rezept für 4 Portionen ein Gesamtgewicht von 1200g und einen Gesamtpreis von 8,00 EUR hat
- **THEN** beträgt `value_per_serving` für `weight_g` 300g
- **AND** `value_per_serving` für `price_total` beträgt 2,00 EUR

### Requirement: Nutri-Class wird als Buchstabe dargestellt

Für eine Regel mit `parameter="nutri_class"` MUST das System ein `display_value` als Buchstaben (1→A, 2→B, 3→C, 4→D, 5→E) liefern und für solche Regeln keine Einheit ausgeben. Der `nutri_class`-Wert DARF NICHT mit einem Portionsfaktor multipliziert werden.

#### Scenario: Nutri-Class-Regel

- **WHEN** eine `scope=recipe`-Regel den Parameter `nutri_class` auswertet und das Rezept die Nutri-Klasse B hat
- **THEN** enthält das zugehörige `items`-Element `display_value="B"`
- **AND** der ausgewertete Wert ist der unskalierte Rohwert (2)

### Requirement: Ausklappbare Rezeptregeln-Box mit Zähler-Vorschau

Die Rezept-Detailseite (`frontend-food`) MUST für Rezepte mit `recipe_type="warm_meal"` oder `recipe_type="cold_meal"` eine ausklappbare Box "Rezeptregeln" anzeigen, deren eingeklappter Titel eine Zähler-Ampel als Vorschau enthält (Anzahl grüner, gelber und roter Regeln). Im ausgeklappten Zustand MUST die Box jede Regel mit Status-Ampel, Namen, Pro-Portion-Wert und dem relevanten Schwellenwert auflisten.

Bei gelb oder rot bewerteten Regeln MUST zusätzlich der Tipp-Text angezeigt werden. Existieren für anwendbare Rezepte keine aktiven `scope=recipe`-Regeln, MUST die Box ausgeblendet werden.

Für andere Rezepttypen MUST die Rezept-Detailseite statt der Regelbox einen Hinweis anzeigen, dass für diesen Rezepttyp keine Rezeptregeln sinnvoll sind und dass die Regeln im Planer auf die Mahlzeit angewandt werden.

#### Scenario: Eingeklappte Vorschau

- **WHEN** die Box für ein anwendbares Rezept eingeklappt ist und das Rezept 4 grüne, 1 gelbe und 1 rote Regel hat
- **THEN** zeigt der Titel eine Zähler-Ampel mit den Werten 4 (grün), 1 (gelb) und 1 (rot)

#### Scenario: Ausklappen zeigt alle Regeln

- **WHEN** der Nutzer die Box für ein anwendbares Rezept ausklappt
- **THEN** werden alle Regeln mit jeweiliger Status-Ampel, Pro-Portion-Wert und Schwellenwert angezeigt

#### Scenario: Tipp nur bei Nichterfüllung

- **WHEN** eine Regel den Status `yellow` oder `red` hat
- **THEN** wird der zugehörige Tipp-Text angezeigt; bei `green` wird kein Tipp-Text angezeigt

#### Scenario: Keine Regeln vorhanden

- **WHEN** für ein anwendbares Rezept keine aktiven `scope=recipe`-Regeln existieren
- **THEN** wird die Box nicht angezeigt

#### Scenario: Hinweis bei nicht anwendbarem Rezepttyp

- **WHEN** die Rezept-Detailseite ein Rezept mit `recipe_type="breakfast"`, `"snack"`, `"dessert"`, `"drink"`, `"recipe_part"` oder `"ingredient"` anzeigt
- **THEN** zeigt das Frontend einen deutschen Hinweis, dass Rezeptregeln für diesen Typ nicht sinnvoll sind
- **THEN** erklärt der Hinweis, dass die Regeln im Planer auf die Mahlzeit angewandt werden

### Requirement: Portion-based evaluation of recipe rules
The system SHALL evaluate all recipe-scope rules and cockpit meal aggregations on the basis of a single serving.
Nutrient and ingredient contributions from recipes SHALL be normalized by dividing by `max(recipe.portions, 1)`.

#### Scenario: Recipe rule evaluation scales nutrient values per serving
- **WHEN** a recipe configured for 4 servings has a total weight of 1000g and 15.0g protein per 100g (150.0g total)
- **AND** a rule "protein_g >= 30" (scope="recipe") is active
- **THEN** the rule evaluation evaluates the single serving value ($150.0 / 4 = 37.5\text{g}$) against the threshold and returns status "green"

### Requirement: Erweiterte Rezeptregel-Parameter

Das System MUST `scope=recipe`-Regeln für die Parameter `price_total`, `weight_g` und `nutri_class` unterstützen. Diese Parameter MUST zusammen mit bestehenden Nährwertparametern über denselben Rule-Evaluationsmechanismus ausgewertet werden.

#### Scenario: Rezeptpreis-Regel

- **WHEN** eine aktive `scope=recipe`-Regel mit `parameter="price_total"` für ein anwendbares Rezept existiert
- **THEN** wertet das System den Rezeptpreis der Normportion (`cached_price_total`, unskaliert) gegen die Regel aus und liefert `green`, `yellow` oder `red`

#### Scenario: Rezeptgewicht-Regel

- **WHEN** eine aktive `scope=recipe`-Regel mit `parameter="weight_g"` für ein anwendbares Rezept existiert
- **THEN** wertet das System das Rezeptgewicht der Normportion (unskaliert) gegen die Regel aus und liefert `green`, `yellow` oder `red`

#### Scenario: Nutri-Regel

- **WHEN** eine aktive `scope=recipe`-Regel mit `parameter="nutri_class"` für ein anwendbares Rezept existiert
- **THEN** wertet das System die numerische Nutri-Klasse aus und zeigt den Wert als Buchstaben A bis E an
