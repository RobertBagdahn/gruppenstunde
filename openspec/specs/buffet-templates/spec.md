# buffet-templates Specification

## Purpose
TBD - created by archiving change buffet-module. Update Purpose after archive.
## Requirements
### Requirement: Buffet-Vorlage als Datenmodell
Das System SHALL ein Modell `BuffetTemplate` bereitstellen mit `name`, `slug` (eindeutig), `description`, `meal_types` (Liste aus `MealTypeChoices`), `is_active`, `sort_order`. Zu jeder Vorlage SHALL es `BuffetTemplateRole`-Einträge geben mit `role` (Tag mit `group="buffet"`), `amount_per_person` (> 0), `unit` (`g` oder `ml`), `enabled_by_default`, `sort_order` sowie optionalen Standardauswahlen `default_ingredients` und `default_recipes`. Je Vorlage MUST jede Rolle höchstens einmal vorkommen.

#### Scenario: Rolle doppelt in Vorlage
- **WHEN** Staff einer Vorlage die Rolle `buffet-savory` ein zweites Mal hinzufügen will
- **THEN** lehnt das System dies mit einem Validierungsfehler ab

#### Scenario: Nur Buffet-Tags als Rolle
- **WHEN** Staff als Rolle einen Tag ohne `group="buffet"` wählt
- **THEN** lehnt das System dies mit einem Validierungsfehler ab

### Requirement: Pflege nur durch Staff
Vorlagen SHALL ausschließlich von Staff-Nutzern über den Django-Admin angelegt und geändert werden. Es MUST keine öffentlichen Schreib-Endpunkte für Vorlagen geben.

#### Scenario: Staff legt Vorlage an
- **WHEN** ein Staff-Nutzer im Admin die Vorlage „Grillabend“ für `dinner` mit Rollen anlegt
- **THEN** steht sie im Builder für Abendessen zur Auswahl

### Requirement: Vorlagen lesen
`GET /api/meal-plans/buffet-templates/` SHALL alle aktiven Vorlagen sortiert nach `sort_order` mit ihren Rollen liefern. Der optionale Parameter `meal_type` MUST auf Vorlagen filtern, deren `meal_types` diesen Typ enthalten. Der Endpunkt SHALL für angemeldete und nicht angemeldete Nutzer lesbar sein; die Liste ist nicht paginiert (erwartet < 50 Einträge).

#### Scenario: Vorlagen für Mittagessen
- **WHEN** `GET /api/meal-plans/buffet-templates/?meal_type=lunch` aufgerufen wird
- **THEN** enthält die Antwort „Belegte Baguettes“ und nicht „Frühstück“

#### Scenario: Inaktive Vorlage
- **WHEN** Staff eine Vorlage auf `is_active=false` setzt
- **THEN** erscheint sie nicht mehr in der Liste

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer die Vorlagen abruft
- **THEN** erhält er dieselbe Liste wie ein angemeldeter Nutzer

### Requirement: Mitgelieferte Vorlagen
Ein idempotenter Command `seed_buffet_templates` SHALL folgende Vorlagen anlegen, sofern der Slug noch nicht existiert (Mengen pro Person):

| Vorlage | Mahlzeiten | Rollen (Standard an) | Rollen (Standard aus) |
|---|---|---|---|
| Frühstück (`breakfast`) | breakfast | Brot 120 g, Streichfett 10 g, Belag herzhaft 40 g, Belag süß 30 g, Gemüse & Obst 80 g, Getränke 250 ml | Müsli & Joghurt 60 g, Gerichte 150 g |
| Belegte Baguettes (`baguettes`) | lunch, dinner | Brot 150 g, Streichfett 10 g, Belag herzhaft 70 g, Soßen & Würze 15 g, Gemüse & Obst 100 g, Getränke 300 ml | Belag süß 20 g |
| Abendbrot (`supper`) | dinner | Brot 130 g, Streichfett 10 g, Belag herzhaft 60 g, Gemüse & Obst 100 g, Getränke 250 ml | Soßen & Würze 10 g, Belag süß 20 g, Gerichte 150 g |

#### Scenario: Seed zweimal ausgeführt
- **WHEN** `uv run python manage.py seed_buffet_templates` zweimal läuft
- **THEN** existiert jede Vorlage genau einmal und von Staff geänderte Werte bleiben erhalten

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

### Requirement: Meal-type-bezogene Wizard-Presets
Der Preset-Schritt SHALL pro `meal_type` höchstens sechs hervorgehobene Varianten anhand der bestehenden Vorlagen zeigen. Varianten dürfen für mehrere MealTypes hervorgehoben sein. Weitere aktive Vorlagen bleiben in „Weitere Vorlagen“ auswählbar. „Freies Buffet“ SHALL unabhängig von Anzahl und MealType als eigene, angeheftete Option verfügbar sein und zählt nicht zu den sechs hervorgehobenen Varianten.

Für `lunch`, `dinner` und `snack` wird keine neue feste Preset-Liste vorausgesetzt: aktive Vorlagen werden nach ihrer konfigurierten Reihenfolge (`sort_order`) angezeigt, bis zu sechs davon hervorgehoben und weitere unter „Weitere Vorlagen“ erreichbar. Die vom Nutzer benannten Frühstücks- und Getränkepresets sind:
- `breakfast`: „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“, „Brot mit Fleisch“.
- `drinks`: „Hausfahrt mit Säften“ und „Lager mit Zitronentee“.

#### Scenario: Bestehende Vorlagen nach Reihenfolge anzeigen
- **WHEN** ein Nutzer den Preset-Schritt für `meal_type=lunch`, `dinner` oder `snack` öffnet
- **THEN** werden vorhandene aktive Vorlagen in ihrer konfigurierten Reihenfolge angezeigt
- **THEN** sind höchstens sechs davon hervorgehoben und „Freies Buffet“ zusätzlich angeheftet
- **THEN** bleiben weitere aktive Vorlagen unter „Weitere Vorlagen“ erreichbar

#### Scenario: Überlappende Vorlagen
- **WHEN** dieselbe aktive Vorlage für mehr als einen Mahlzeitentyp konfiguriert ist
- **THEN** darf sie für jeden dieser Mahlzeitentypen hervorgehoben werden

#### Scenario: Weniger passende Varianten als sechs
- **WHEN** für einen MealType weniger als sechs hervorgehobene Vorlagen vorhanden sind
- **THEN** zeigt der Wizard die vorhandenen Varianten ohne Platzhalterkarten und hält „Freies Buffet“ separat verfügbar

#### Scenario: Free bleibt angeheftet
- **WHEN** die hervorgehobenen Presets nach MealType gefiltert oder sortiert werden
- **THEN** bleibt `free` als separate Option sichtbar und verdrängt keine der meal-type-spezifischen Karten

### Requirement: Frühstücksprofile und Getränkepresets vollständig vorbelegen
Die fünf bestätigten Frühstücksprofile und die zwei Getränkepresets SHALL beim Auswählen eine vollständige, änderbare Ausgangsauswahl mit Standardrollen, Mengen und sichtbaren Zutaten/Rezepte laden. Das Müsli-Profil SHALL Müsli-/Haferflocken-Basis mit passenden Extras und Getränken vorauswählen; die Brotprofile SHALL passende Brot-, Belag-, Streichfett-, Frisch-/Extras- und Getränkekategorien konfigurieren. „Hausfahrt mit Säften“ SHALL vorhandene Säfte nutzen; „Lager mit Zitronentee“ SHALL vorhandene zitronige Tee-/Getränke-Rezepte nutzen. Es MUST NOT automatisch ein neues Produkt oder Rezept erzeugt werden.

#### Scenario: Preset nach Auswahl vollständig vorausgewählt
- **WHEN** ein Nutzer ein Frühstücks- oder Getränkepreset auswählt
- **THEN** werden alle verfügbaren, sichtbaren Standard-Items und Mengen der Preset-Konfiguration geladen
- **THEN** kann der Nutzer jedes vorausgewählte Item, jede Menge und jede Rolle im Wizard ändern

#### Scenario: Vorhandene Favoriten als Startauswahl
- **GIVEN** eine aktivierte Rolle hat keine expliziten Vorlagen-Defaults, aber sichtbare Rollen-Favoriten
- **WHEN** das Preset geladen wird
- **THEN** wird der erste sichtbare Favorit als änderbare Startauswahl markiert

#### Scenario: Unsichtbarer Default
- **GIVEN** eine Vorlage enthält eine Standardzutat, die nach `food_access` für den aktuellen Nutzer nicht sichtbar ist
- **WHEN** das Preset geladen wird
- **THEN** wird diese Zutat nicht angezeigt und nicht gespeichert; andere sichtbare Defaults bleiben erhalten

#### Scenario: Leere Standardauswahlen im Dry-Run prüfen
- **GIVEN** eine bestehende Seed-Vorlage hat bei einer Rolle keine Default-Zutaten und keine Default-Rezepte
- **WHEN** `seed_buffet_templates --dry-run --fill-missing-defaults` ausgeführt wird
- **THEN** werden nur die geplanten Ergänzungen angezeigt und keine Datensätze verändert

#### Scenario: Leere Standardauswahlen ergänzen
- **GIVEN** ein zuvor geprüfter Seed wird mit `--apply --fill-missing-defaults` ausgeführt
- **WHEN** eine bestehende Rolle hat leere Default-Auswahlen
- **THEN** werden nur leere Default-Auswahlen ergänzt; bereits nicht-leere Auswahlen bleiben unverändert

#### Scenario: Hausfahrt verwendet vorhandene Säfte
- **WHEN** „Hausfahrt mit Säften“ gewählt wird
- **THEN** können vorhandene Säfte wie „Saft (Apfel)“, „Saft (Multivitamin)“ und „Saft (Orange)“ vorausgewählt sein

#### Scenario: Lager verwendet vorhandenen Zitronentee
- **WHEN** „Lager mit Zitronentee“ gewählt wird
- **THEN** wird ein vorhandenes zitroniges Getränkerezept, zum Beispiel „Ingwertee mit Zitronen“, vorausgewählt, sofern es für den Nutzer sichtbar ist

### Requirement: Vorlagenänderungen bleiben Staff/Admin vorbehalten
Globale Preset-Namen, MealType-Zuordnungen, Rollen, Mengen und Standard-Items SHALL nur von Staff/Admin geändert werden können. Normale Nutzer dürfen während eines konkreten MealPlan-Wizards die eigene Auswahl und Mengen ändern; solche Änderungen SHALL weder globale Vorlagen noch Rollen-Tags verändern. Ein neuer benutzerdefinierter Preset-Editor im Food-Frontend ist nicht Bestandteil dieses Changes; die vorhandene Admin-Pflege bleibt die Verwaltungsoberfläche.

#### Scenario: Nutzer passt nur seine Mahlzeit an
- **WHEN** ein normaler Nutzer Items oder Shares in einem Preset ändert und die Mahlzeit speichert
- **THEN** ändert sich nur die konkrete MealPlan-Mahlzeit; `BuffetTemplate`, Standard-Items und globale Rollen-Tags bleiben unverändert

#### Scenario: Admin pflegt eine Vorlage
- **WHEN** ein Staff/Admin eine Buffet-Vorlage über die vorhandene Admin-Pflege ändert
- **THEN** werden die aktualisierten Preset-Werte für zukünftige Wizard-Auswahlen bereitgestellt, ohne gespeicherte MealPlan-Mahlzeiten rückwirkend umzuschreiben
