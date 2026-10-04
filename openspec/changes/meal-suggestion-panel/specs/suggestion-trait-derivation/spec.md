## ADDED Requirements

### Requirement: Derived traits
Das System SHALL für Rezepte und Zutaten die Merkmale süß/herzhaft (Zuckeranteil je 100 g), Vorbereitung, kinderfreundlich, Kochquelle und frisch/haltbar aus vorhandenen Feldern ableiten und fehlende Merkmale als Tags ergänzen. `child_score` mit Platzhalterwert `1` SHALL nicht als Kinderfreundlichkeits-Signal gelten.

#### Scenario: Sweet recipe
- **WHEN** ein Rezept mehr als 10 g Zucker je 100 g hat
- **THEN** gilt es als „süß“

#### Scenario: Placeholder child score
- **WHEN** eine Zutat `child_score=1` ohne weitere Signale hat
- **THEN** ist ihre Kinderfreundlichkeit „unbekannt“

### Requirement: Unknown handling
Unbekannte Merkmale SHALL nicht ausschließen und leicht abwerten. Bei strengem Filter SHALL nur ein bekannter passender Wert zählen.

#### Scenario: Strict filter
- **WHEN** „nur kinderfreundlich“ aktiv ist
- **THEN** erscheinen keine Kandidaten mit unbekanntem Wert

### Requirement: Standalone food backfill
Ein Management-Command SHALL `is_standalone_food` für Zutaten der Warengruppen Obst, Gemüse, Wasser & Erfrischungsgetränke und Milch & Pflanzendrinks setzen. Das Command SHALL standardmäßig im Dry-run laufen und eine Review-Liste ausgeben.

#### Scenario: Dry run
- **WHEN** das Command ohne `--apply` läuft
- **THEN** wird nichts geändert und die Kandidatenliste ausgegeben

#### Scenario: Apply
- **WHEN** das Command mit `--apply` läuft
- **THEN** werden die Kandidaten als Einzelzutaten markiert
