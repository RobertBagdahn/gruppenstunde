# Buffet-Katalogsuche

## ADDED Requirements

### Requirement: Sichtbare Buffet-Items rollenübergreifend suchen
`GET /api/supply/buffet-catalog/search/` SHALL eine begrenzte Liste passender, für den aktuellen Nutzer sichtbarer Zutaten und Rezepte liefern. Query-Parameter: `q` (Standard leer), erforderliches `role` (Rollen-Slug als Ranking-/Sektion-Kontext, kein Tag-Zwang) und erforderliches `meal_type` (Wert aus `MealTypeChoices`); `kind` (`all|ingredient|recipe`, Standard `all`); optionales `recipe_type` (Wert aus `RecipeTypeChoices`); `include_non_standalone` (Standard `false`); `exclude_alcohol` (Standard `false`); `limit` (Standard 30, serverseitig maximal 50). Die Antwort SHALL `kind`, `id`, `name`, `energy_kcal_per_100g`, `price_per_kg`, `weight_per_serving_g` (nur Rezept), `recipe_type` (nur Rezept), `is_favorite` und `role_slugs` enthalten. `is_favorite` ist wahr, wenn das Item den übergebenen Rollen-Tag trägt, außer wenn das Item als alkoholisch erkannt wird; alkoholische Produkte DÜRFEN unabhängig von vorhandenen Tags NICHT als Favoriten erscheinen. Der Rollenparameter ordnet Favoriten und Nicht-Standalone-Filter ein; er DARF andere sichtbare Suchtreffer NICHT aus der Vollsuche ausschließen. Die Suche SHALL Namen und IngredientAliases ohne Beachtung von Groß-/Kleinschreibung und Umlaut-Schreibvarianten abgleichen; Prefix-Treffer SHALL vor bloßen Teiltreffern erscheinen. `q` mit weniger als zwei Zeichen SHALL eine leere Ergebnisliste liefern. Leere/kurze Eingaben DÜRFEN keine unbeschränkte Katalogliste auslösen. Standardmäßig SHALL die Suche Zutaten ohne `is_standalone_food` ausschließen, außer diese tragen die gewählte Favoritenrolle; `include_non_standalone=true` schließt auch diese ein. `recipe_type` SHALL Rezepttreffer auf den ausgewählten Rezepttyp einschränken. Ohne diesen expliziten Filter SHALL die Suchrangfolge passende Rezepttypen je `meal_type` bevorzugen: `breakfast` → `breakfast`, `cold_meal`; `snack` → `snack`, `dessert`, `cold_meal`; `lunch` → `cold_meal`, `warm_meal`; `dinner` → `warm_meal`, `cold_meal`; `drinks` → `drink`. Die Rangfolge SHALL Favoriten zuerst, danach standalone essbare Zutaten, danach passende Rezepte und zuletzt übrige zulässige Treffer gruppieren. `exclude_alcohol=true` SHALL Zutaten aus der Retail-Section „Alkoholische Getränke“ und vom bestehenden Alkohol-Erkenner (`is_alcoholic`) erkannte Zutaten ausblenden; ebenfalls SHALL Rezepte ausgeblendet werden, die solche Zutaten enthalten. Standardmäßig bleibt dieser Filter ausgeschaltet. Der Alkoholfilter ist unabhängig vom Nicht-Standalone-Filter; die allgemeinen Standalone-Regeln gelten weiterhin. Die Suche DARF keine Inhalte ausgeben, die für den Aufrufer gemäß `content.services.food_access` unsichtbar sind.

#### Scenario: Rollen-Favoriten und Rezepttypen werden nach Mahlzeitkontext sortiert
- **GIVEN** sichtbare Zutaten und Rezepte mit dem Suchbegriff, darunter Favoriten der Rolle `buffet-fresh` sowie Rezepte der Typen `snack`, `dessert` und `warm_meal`
- **WHEN** ein Nutzer mit `role=buffet-fresh` und `meal_type=snack` sucht
- **THEN** erscheinen Favoriten zuerst und sind mit `is_favorite=true` markiert
- **THEN** folgen standalone essbare Zutaten, danach passende `snack`-/`dessert`-Rezepte und danach übrige Treffer

#### Scenario: Alias- und Prefix-Suche
- **GIVEN** die Zutat „Cocktailtomaten“ besitzt einen passenden Alias
- **WHEN** der Nutzer nach einer passenden Namens- oder Aliasvariante sucht
- **THEN** wird die Zutat gefunden, und Prefix-Treffer stehen vor bloßen Teiltreffern

#### Scenario: Nicht-Standalone-Zutat standardmäßig verborgen
- **GIVEN** eine sichtbare Zutat ohne den Rollen-Tag der aktuellen Rolle und `is_standalone_food=false`
- **WHEN** die Suche mit `include_non_standalone=false` aufgerufen wird
- **THEN** ist diese Zutat nicht im Ergebnis
- **WHEN** dieselbe Suche mit `include_non_standalone=true` aufgerufen wird
- **THEN** kann diese Zutat im Ergebnis enthalten sein

#### Scenario: Alkoholfilter startet ausgeschaltet
- **GIVEN** die Suche findet eine standalone Zutat aus „Alkoholische Getränke“ und ein Rezept mit dieser Zutat
- **WHEN** die Suche mit dem Standard `exclude_alcohol=false` aufgerufen wird
- **THEN** können beide passenden Items erscheinen und das alkoholische Item ist niemals als Rollen-Favorit markiert
- **WHEN** dieselbe Suche mit `exclude_alcohol=true` aufgerufen wird
- **THEN** erscheinen weder die alkoholische Zutat noch das Rezept im Ergebnis

#### Scenario: Alkohol bleibt vom Standalone-Filter getrennt
- **GIVEN** eine alkoholische Zutat ist nicht standalone und trägt nicht die aktuelle Rollen-Favoritenrolle
- **WHEN** nur `exclude_alcohol=false` gesetzt ist und `include_non_standalone=false` bleibt
- **THEN** bleibt die Zutat wegen des Nicht-Standalone-Filters verborgen
- **WHEN** der Nutzer `include_non_standalone=true` setzt und `exclude_alcohol=false` beibehält
- **THEN** kann die Zutat gefunden werden

#### Scenario: Mahlzeittyp Frühstück bleibt eigenständig
- **GIVEN** es existieren passende Rezepte vom Typ `breakfast`, `cold_meal` und `snack`
- **WHEN** die Suche mit `meal_type=breakfast` ausgeführt wird
- **THEN** werden `breakfast`-Rezepte vor `cold_meal` und `snack`-Rezepten gereiht
- **THEN** wird der Mahlzeittyp `breakfast` unverändert an die API übergeben

#### Scenario: Suche startet erst ab zwei Zeichen
- **WHEN** `q` leer oder kürzer als zwei Zeichen ist
- **THEN** liefert die API eine leere Trefferliste und keinen gesamten Katalog

#### Scenario: Item-Art und Rezepttyp filtern
- **GIVEN** Zutaten und Rezepte verschiedener Typen passen zum Suchbegriff
- **WHEN** die Suche mit `kind=recipe&recipe_type=drink` ausgeführt wird
- **THEN** enthält sie ausschließlich passende Rezepte vom Typ `drink`

#### Scenario: Unsichtbares privates Item
- **GIVEN** eine private Zutat gehört einem anderen Nutzer und ist für den Aufrufer nicht sichtbar
- **WHEN** der Aufrufer die Zutatensuche nach ihrem Namen ausführt
- **THEN** enthält die Antwort weder die Zutat noch deren private Metadaten

#### Scenario: Ergebnislimit
- **WHEN** mehr passende Items als das konfigurierte Limit existieren oder der Client ein überhöhtes `limit` sendet
- **THEN** liefert die API höchstens das serverseitige Maximal-Limit und eine stabile Reihenfolge

### Requirement: Öffentlicher lesender Zugriff folgt der Food-Sichtbarkeit
Der Suchendpunkt SHALL wie der Buffet-Katalog lesbar sein, auch ohne Anmeldung; authentifizierte Nutzer erhalten zusätzlich genau die privaten oder geteilten Inhalte, die ihnen die bestehende Food-Access-Policy freigibt. Der Endpunkt SHALL keine schreibende Aktion ausführen.

#### Scenario: Anonymer Nutzer
- **WHEN** ein nicht angemeldeter Nutzer die Suche aufruft
- **THEN** erhält er nur öffentlich sichtbare Zutaten und Rezepte

#### Scenario: Besitzer findet eigenes Item
- **GIVEN** ein angemeldeter Nutzer besitzt eine private Zutat, die nach Food-Access-Policy sichtbar ist
- **WHEN** der Nutzer nach dieser Zutat sucht
- **THEN** kann die Zutat im Ergebnis erscheinen und ihre eigene Auswahl wird im Frontend als solche erkennbar
