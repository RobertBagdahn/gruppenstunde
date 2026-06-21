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

Der Endpunkt MUST für jede Regel `value_per_serving` als den Wert **einer Normportion** des Rezepts liefern. Da jedes Rezept genau eine Normportion repräsentiert (`Recipe.servings` wird stets als `1` behandelt), MUSS die Umrechnung von Nährwerten `Wert pro 100g × Gesamtgewicht_g / 100` verwenden. Es DARF KEINE Division durch `servings` und KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen erfolgen. Die Parameter `weight_g` (Gesamtgewicht der Normportion) und `nutri_class` (Qualitätsklasse) MÜSSEN unskaliert bleiben. Die Statusauswertung MUSS unverändert über `Rule.evaluate()` erfolgen.

#### Scenario: Umrechnung auf Normportion

- **WHEN** ein Rezept ein Gesamtgewicht von 350g hat und sein Eiweißwert 8.0g pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `protein_g` dem Normportionwert `8.0 × 350 / 100 = 28.0g`
- **AND** es erfolgt keine Division durch `servings`

#### Scenario: Gewicht bleibt unskaliert

- **WHEN** eine `scope=recipe`-Regel den Parameter `weight_g` auswertet und das Rezept ein Gesamtgewicht von 350g hat
- **THEN** entspricht `value_per_serving` dem Gesamtgewicht der Normportion (350g)

#### Scenario: Servings-Wert hat keinen Einfluss

- **WHEN** ein Rezept fälschlicherweise `servings > 1` gespeichert hätte
- **THEN** wertet das System die Regeln dennoch auf Basis einer Normportion aus und liefert dieselben `value_per_serving`-Werte wie bei `servings = 1`

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
The system SHALL evaluate all recipe-scope rules on the basis of a single Normportion. Since every recipe represents exactly one Normportion, `Recipe.servings` is always treated as `1` and there SHALL be no division by `servings`. Nutrient values SHALL be scaled to the Normportion using `value per 100g × total_weight_g / 100`, while `nutri_class` and `weight_g` MUST remain unscaled.

#### Scenario: Recipe rule evaluation scales nutrient values to the Normportion
- **WHEN** a recipe has a total weight of 1000g
- **AND** the recipe's protein content is 15.0g per 100g (150.0g for the Normportion)
- **AND** a rule "protein_g >= 30" (scope="recipe") is active
- **THEN** the rule evaluation SHALL evaluate the Normportion value (15.0 × 1000 / 100 = 150.0g) against the threshold and return status "green"
- **AND** there SHALL be no division by `servings`

#### Scenario: Recipe rule evaluation does not scale nutri_class or weight_g
- **WHEN** a recipe has a total weight of 800g
- **AND** the recipe's cached nutri_class is 2 (B)
- **AND** a rule "nutri_class <= 2" (scope="recipe") is active
- **THEN** the rule evaluation SHALL evaluate the raw nutri_class value (2) and return status "green"
- **AND** the display_value SHALL be correctly mapped to "B"
- **AND** a `weight_g` rule SHALL evaluate the unscaled total weight (800g)

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

