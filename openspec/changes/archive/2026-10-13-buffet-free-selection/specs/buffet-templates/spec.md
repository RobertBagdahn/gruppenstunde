# Buffet-Vorlagen

## ADDED Requirements

### Requirement: Erweiterte Vorlagen für Buffet-Mahlzeiten
Der idempotente Command `seed_buffet_templates` SHALL standardmäßig als schreibfreier Dry-Run laufen; Datenbankänderungen dürfen nur mit explizitem `--apply` erfolgen und `--dry-run`/`--apply` MUST sich gegenseitig ausschließen. Der Command SHALL zusätzlich zu den bestehenden Slugs folgende Vorlagen anlegen, sofern diese Slugs noch nicht existieren. Er MUST bestehende Datensätze und Staff-Anpassungen unangetastet lassen. Mengen sind pro Person; Einheiten sind g außer bei Getränke- und Suppenrollen in ml. Die Standardrollen sind aktiv, die Rollen in der letzten Spalte starten eingeklappt. Jede Vorlage MUST die Rolle `buffet-drink` enthalten; Rollen pro Vorlage bleiben eindeutig.

| slug | Name | Mahlzeiten | Standardrollen (Menge pro Person) | Eingeklappt (Menge pro Person) |
|---|---|---|---|---|
| `snack-platter` | Snackplatte | snack | `buffet-fresh` 150g, `buffet-dip` 40g, `buffet-cheese` 30g, `buffet-salty-snack` 25g, `buffet-drink` 250ml | `buffet-nuts` 20g, `buffet-bread` 40g |
| `cheese-platter` | Käseplatte | snack | `buffet-cheese` 80g, `buffet-bread` 50g, `buffet-fresh` 80g, `buffet-nuts` 20g, `buffet-dip` 20g, `buffet-drink` 250ml | `buffet-sweet` 15g |
| `salty-snacks` | Salzgebäck & Chips | snack | `buffet-salty-snack` 60g, `buffet-dip` 40g, `buffet-fresh` 80g, `buffet-drink` 300ml | `buffet-nuts` 25g |
| `nachos` | Nachos mit Soßen | snack | `buffet-salty-snack` 60g, `buffet-cheese` 40g, `buffet-dip` 60g, `buffet-topping` 25g, `buffet-drink` 300ml | `buffet-fresh` 50g |
| `sweet-buffet` | Süßes Buffet | snack | `buffet-sweet-snack` 50g, `buffet-fresh` 100g, `buffet-drink` 250ml | `buffet-nuts` 20g, `buffet-cereal` 80g |
| `fruit-nuts` | Obst & Nüsse | snack | `buffet-fresh` 150g, `buffet-nuts` 30g, `buffet-cereal` 100g, `buffet-drink` 250ml | `buffet-sweet-snack` 20g |
| `campfire-snack` | Lagerfeuer-Snack | snack | `buffet-dish` 120g, `buffet-sweet-snack` 30g, `buffet-fresh` 80g, `buffet-drink` 300ml | – |
| `wrap-bar` | Wrap-Bar | lunch, dinner | `buffet-bread` 120g, `buffet-savory` 70g, `buffet-fresh` 100g, `buffet-dip` 40g, `buffet-cheese` 30g, `buffet-drink` 300ml | `buffet-salad` 80g |
| `salad-bar` | Salatbuffet | lunch | `buffet-salad` 150g, `buffet-fresh` 100g, `buffet-bread` 60g, `buffet-cheese` 40g, `buffet-dip` 30g, `buffet-drink` 300ml | `buffet-main` 80g |
| `vesper` | Brotzeit | lunch, dinner | `buffet-bread` 130g, `buffet-fat` 10g, `buffet-savory` 60g, `buffet-cheese` 40g, `buffet-fresh` 100g, `buffet-topping` 20g, `buffet-drink` 250ml | `buffet-sweet` 20g |
| `pasta-bar` | Pasta-Bar | lunch, dinner | `buffet-carb` 120g, `buffet-dish` 150g, `buffet-topping` 15g, `buffet-fresh` 80g, `buffet-drink` 300ml | `buffet-bread` 40g |
| `baked-potato` | Kartoffelbuffet | lunch, dinner | `buffet-carb` 250g, `buffet-dip` 60g, `buffet-cheese` 30g, `buffet-fresh` 100g, `buffet-drink` 300ml | `buffet-main` 80g |
| `soup-bread` | Suppe & Brot | lunch, dinner | `buffet-soup` 350ml, `buffet-bread` 70g, `buffet-topping` 15g, `buffet-drink` 250ml | `buffet-cheese` 30g |
| `rice-curry` | Reis- & Curry-Bar | lunch, dinner | `buffet-carb` 120g, `buffet-dish` 200g, `buffet-fresh` 80g, `buffet-topping` 15g, `buffet-drink` 300ml | – |
| `burger-bar` | Burger- & Hotdog-Bar | lunch, dinner | `buffet-bread` 80g, `buffet-main` 120g, `buffet-fresh` 80g, `buffet-dip` 30g, `buffet-topping` 20g, `buffet-cheese` 20g, `buffet-drink` 300ml | `buffet-carb` 150g |
| `grill` | Grillabend | dinner | `buffet-main` 200g, `buffet-bread` 60g, `buffet-salad` 120g, `buffet-dip` 40g, `buffet-fresh` 80g, `buffet-drink` 400ml | `buffet-carb` 150g |

Bestehende Vorlagen wie `breakfast`, `baguettes` und `supper` bleiben unverändert und behalten ihre bisherigen Mengen. Der bestehende Seed enthält für diese drei Slugs bereits `buffet-drink`; damit widerspricht die Getränke-Anforderung nicht dem Erhalt bestehender Vorlagen. Vorhandene Staff-Datensätze werden unabhängig davon nicht ergänzt oder überschrieben.

#### Scenario: Dry-Run ändert keine Vorlagen
- **GIVEN** zusätzliche Buffet-Vorlagen fehlen
- **WHEN** `uv run python manage.py seed_buffet_templates --dry-run` ausgeführt wird
- **THEN** listet der Command geplante Vorlagen und fehlende Abhängigkeiten auf
- **THEN** bleiben alle Vorlagen und Rollen unverändert

#### Scenario: Seed ergänzt Vorlagen ohne Duplikate
- **WHEN** `uv run python manage.py seed_buffet_templates --apply` zweimal ausgeführt wird
- **THEN** jede zusätzliche Vorlage existiert genau einmal
- **THEN** von Staff geänderte Rollen und Mengen vorhandener Vorlagen bleiben erhalten

#### Scenario: Getränke in jeder erweiterten Vorlage
- **WHEN** ein Nutzer den Katalog für eine der zusätzlichen Vorlagen abruft
- **THEN** enthält die Vorlage die Rolle „Getränke“

#### Scenario: Mehrfachverwendung für Abend und Mittag
- **WHEN** der Nutzer Vorlagen für `dinner` oder `lunch` anfordert
- **THEN** erscheinen die jeweils zugeordneten Vorlagen `wrap-bar`, `pasta-bar` und `baked-potato` für beide Mahlzeitentypen

### Requirement: Universelles Freies Buffet und Getränkebuffet
Der Seed SHALL die Vorlage `free` („Freies Buffet“) für alle Mahlzeitentypen einschließlich `drinks` und die Vorlage `drinks-bar` („Getränkebuffet“) mindestens für `drinks` und `snack` bereitstellen. `free` SHALL alle 19 Buffet-Rollen mit Mengen pro Person enthalten und standardmäßig nur Getränke, Brot, Belag herzhaft und Gemüse & Obst aktivieren; alle übrigen Rollen SHALL eingeklappt sein. Mengen: `buffet-bread` 60g, `buffet-fat` 5g, `buffet-savory` 40g, `buffet-sweet` 15g, `buffet-condiment` 10g, `buffet-fresh` 80g, `buffet-cereal` 50g, `buffet-drink` 250ml, `buffet-dish` 100g, `buffet-cheese` 30g, `buffet-salty-snack` 30g, `buffet-sweet-snack` 20g, `buffet-nuts` 15g, `buffet-dip` 30g, `buffet-salad` 80g, `buffet-carb` 100g, `buffet-main` 120g, `buffet-soup` 250ml und `buffet-topping` 15g. `drinks-bar` SHALL ausschließlich die Rolle `buffet-drink` mit 300ml pro Person enthalten. Jede mitgelieferte Standardvorlage (bestehende und neu hinzugefügte) SHALL die Rolle `buffet-drink` enthalten. Beide Vorlagen folgen derselben idempotenten, nicht überschreibenden Seed-Regel. Die einzelnen Mengenwerte für `free` und `drinks-bar` sind Startvorschläge des Entwurfs; Phase C2 legt nur „sinnvoll vorbelegte Mengen“ bzw. 300 ml für das Getränkebuffet nicht ausdrücklich fest. Diese Werte müssen vor einem Prod-Seed fachlich bestätigt werden und gelten bis dahin nicht als freigegebene Prod-Konfiguration.

#### Scenario: Getränke-Rolle in allen Standardvorlagen
- **WHEN** der Nutzer eine mitgelieferte Standardvorlage abruft, einschließlich `breakfast`, `baguettes` oder `supper`
- **THEN** enthält sie die Rolle `buffet-drink`

#### Scenario: Fallback für jeden Mahlzeitentyp
- **WHEN** ein Nutzer Vorlagen für einen Mahlzeitentyp abruft, für den keine spezifische Vorlage existiert
- **THEN** ist `free` in der Liste verfügbar

#### Scenario: Getränkebuffet im Getränke-Slot
- **WHEN** Vorlagen für `drinks` oder `snack` angefordert werden
- **THEN** ist `drinks-bar` verfügbar und enthält mindestens die Rolle Getränke

#### Scenario: Freies Buffet erhält Staff-Anpassungen
- **WHEN** Staff Mengen oder Rollen der Vorlage `free` ändert und der Seed erneut ausgeführt wird
- **THEN** bleiben diese Änderungen erhalten

### Requirement: Frühstück bleibt eigener Buffet-Modus
Der bestehende Slug `breakfast` SHALL als eigene Frühstücksvorlage und eigener, häufiger Modus erhalten bleiben. Für einen Frühstücks-Slot SHALL `breakfast` gegenüber `free` und sonstigen Vorlagen bevorzugt und standardmäßig vorausgewählt werden. Die Vorlage SHALL nicht durch `free` ersetzt oder mit diesem zusammengelegt werden. Weitere Vorlagen aus anderen Mahlzeittypen bleiben zusätzlich über die unfiltrierte Vorlagenliste wählbar.

#### Scenario: Frühstücksvorlage bleibt vorhanden
- **WHEN** der idempotente Vorlagen-Seed ausgeführt wird
- **THEN** bleibt die vorhandene Vorlage `breakfast` unverändert erhalten

#### Scenario: Frühstück ist der bevorzugte Modus
- **GIVEN** ein Slot hat `meal_type=breakfast` und die aktive Vorlage `breakfast` ist vorhanden
- **WHEN** die Vorlagenliste und der Builder geöffnet werden
- **THEN** wird `breakfast` als eigener Modus und erste Vorauswahl angeboten
- **THEN** erscheint `free` nur als alternative Vorlage und ersetzt das Frühstück nicht

#### Scenario: Vorlagen anderer Mahlzeittypen bleiben auswählbar
- **GIVEN** der Nutzer bearbeitet ein Mittagessen und die Vorlage `cheese-platter` ist für `snack` eingetragen
- **WHEN** die unfiltrierte Vorlagenliste geladen wird
- **THEN** kann der Nutzer `cheese-platter` zusätzlich zu den Mittagessen-Vorlagen wählen
