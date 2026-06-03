## ADDED Requirements

### Requirement: Backend liefert alle Rezeptregeln mit Status

Das System MUSS einen Endpunkt `GET /api/recipes/{recipe_id}/rules/` bereitstellen, der **alle** aktiven Regeln mit `scope=recipe` gegen die Nährwerte eines Rezepts auswertet und für jede Regel das Ergebnis (`green`, `yellow` oder `red`) zurückgibt — einschließlich der erfüllten (grünen) Regeln.

Die Antwort MUSS aggregierte Zähler `green_count`, `yellow_count` und `red_count` enthalten sowie eine Liste `items` mit je `rule_id`, `name`, `parameter`, `status`, `value_per_serving`, `display_value`, `unit`, `threshold`, `threshold_direction` und `tip_text`.

Nur Regeln mit `is_active=True` MÜSSEN berücksichtigt werden.

#### Scenario: Rezept mit gemischten Regelergebnissen

- **WHEN** ein Client `GET /api/recipes/{recipe_id}/rules/` für ein Rezept aufruft, dessen Nährwerte einige `scope=recipe`-Regeln erfüllen und andere nicht
- **THEN** liefert das System Status 200 mit allen ausgewerteten Regeln (grün, gelb und rot) und korrekten Zählern, deren Summe der Anzahl der `items` entspricht

#### Scenario: Erfüllte Regel ist enthalten

- **WHEN** ein Rezept eine `scope=recipe`-Regel vollständig erfüllt
- **THEN** ist diese Regel mit `status="green"` in `items` enthalten und nicht weggefiltert

#### Scenario: Inaktive Regeln werden ignoriert

- **WHEN** eine `scope=recipe`-Regel `is_active=False` hat
- **THEN** erscheint diese Regel nicht in der Antwort

#### Scenario: Unbekanntes Rezept

- **WHEN** ein Client den Endpunkt mit einer nicht existierenden `recipe_id` aufruft
- **THEN** liefert das System Status 404

### Requirement: Werte werden pro Portion bereitgestellt

Der Endpunkt MUSS für jede Regel `value_per_serving` als den auf eine Portion umgerechneten Nährwert liefern (`Wert pro 100g × Gesamtgewicht_g / 100 / servings`). Die Statusauswertung MUSS unverändert über `Rule.evaluate()` erfolgen.

#### Scenario: Umrechnung auf Portion

- **WHEN** ein Rezept ein Gesamtgewicht und eine Portionszahl `servings` besitzt
- **THEN** entspricht `value_per_serving` dem Nährwert geteilt durch die Anzahl der Portionen

### Requirement: Nutri-Class wird als Buchstabe dargestellt

Für eine Regel mit `parameter="nutri_class"` MUSS das System ein `display_value` als Buchstaben (1→A, 2→B, 3→C, 4→D, 5→E) liefern und für solche Regeln keine Einheit ausgeben.

#### Scenario: Nutri-Class-Regel

- **WHEN** eine `scope=recipe`-Regel den Parameter `nutri_class` auswertet und das Rezept die Nutri-Klasse B hat
- **THEN** enthält das zugehörige `items`-Element `display_value="B"`

### Requirement: Ausklappbare Rezeptregeln-Box mit Zähler-Vorschau

Die Rezept-Detailseite (`frontend-food`) MUSS eine ausklappbare Box "Rezeptregeln" anzeigen, deren eingeklappter Titel eine Zähler-Ampel als Vorschau enthält (Anzahl grüner, gelber und roter Regeln). Im ausgeklappten Zustand MUSS die Box jede Regel mit Status-Ampel, Namen, Pro-Portion-Wert und dem relevanten Schwellenwert auflisten.

Bei gelb oder rot bewerteten Regeln MUSS zusätzlich der Tipp-Text angezeigt werden. Existieren keine `scope=recipe`-Regeln, MUSS die Box ausgeblendet werden.

#### Scenario: Eingeklappte Vorschau

- **WHEN** die Box eingeklappt ist und das Rezept 4 grüne, 1 gelbe und 1 rote Regel hat
- **THEN** zeigt der Titel eine Zähler-Ampel mit den Werten 4 (grün), 1 (gelb) und 1 (rot)

#### Scenario: Ausklappen zeigt alle Regeln

- **WHEN** der Nutzer die Box ausklappt
- **THEN** werden alle Regeln mit jeweiliger Status-Ampel, Pro-Portion-Wert und Schwellenwert angezeigt

#### Scenario: Tipp nur bei Nichterfüllung

- **WHEN** eine Regel den Status `yellow` oder `red` hat
- **THEN** wird der zugehörige Tipp-Text angezeigt; bei `green` wird kein Tipp-Text angezeigt

#### Scenario: Keine Regeln vorhanden

- **WHEN** für ein Rezept keine aktiven `scope=recipe`-Regeln existieren
- **THEN** wird die Box nicht angezeigt
