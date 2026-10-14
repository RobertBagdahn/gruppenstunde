# recipe-quantity-outlier-checks Specification

## Purpose
TBD - created by archiving change recipe-quantity-outlier-checks. Update Purpose after archive.
## Requirements
### Requirement: Originalmenge beim Teilen speichern
Beim Teilen eines Rezepts durch die Personenzahl der Quelle (`source_servings > 1`) in Import (`import_chefkoch_urls`, `import_cooklang`) und `normalize_recipe_servings` SHALL jede `RecipeItem` ihre ungeteilte Menge in `source_quantity` speichern. `source_quantity` MUST dieselbe Einheit wie `quantity` haben und für Rezepte ohne Teilung leer bleiben.

#### Scenario: Import teilt und merkt sich die Originalmenge
- **GIVEN** eine Quelle für 4 Personen mit „2 Zwiebeln“
- **WHEN** das Rezept importiert wird
- **THEN** speichert die Zeile `quantity = 0.5` und `source_quantity = 2`

#### Scenario: Rezept ohne Quelle-Personenzahl
- **WHEN** ein Rezept manuell für eine Person angelegt wird
- **THEN** bleibt `source_quantity` leer

### Requirement: Ungeteilte Zeilen erkennen
Das System SHALL Rezeptzeilen melden, die beim Teilen vermutlich nicht geteilt wurden. Mit `source_quantity` gilt eine Zeile als ungeteilt, wenn `source_servings > 1` und `quantity == source_quantity`. Ohne `source_quantity` MUST die Heuristik gelten: stückartige Portion mit ganzzahliger Anzahl ≥ 1 und mindestens 60 g, während mindestens zwei andere Stück- oder Maß-Zeilen desselben Rezepts gebrochene Mengen haben. Import und `normalize_recipe_servings` MUST gefundene Zeilen im Bericht ausgeben; nichts wird automatisch geändert.

#### Scenario: Sweet Onion Sauce
- **GIVEN** ein Rezept mit `source_servings = 4`, Zeilen „0,69 EL Öl“, „0,63 Stück Butter“ und „2 mittelgroße Zwiebeln (160 g)“
- **WHEN** die Prüfung läuft
- **THEN** wird die Zwiebel-Zeile als ungeteilt gemeldet

#### Scenario: Natürliche Pro-Person-Portion
- **GIVEN** `source_servings = 4`, eine Zeile „1 Portion trocken (100g)“ Nudeln und gebrochene EL-Mengen
- **WHEN** die Prüfung läuft
- **THEN** wird die Nudel-Zeile nicht gemeldet

#### Scenario: Geteilte Zeile mit Originalmenge
- **GIVEN** `source_servings = 4`, `source_quantity = 2`, `quantity = 0.5`
- **WHEN** die Prüfung läuft
- **THEN** wird die Zeile nicht gemeldet

### Requirement: Mengenstatistik pro Zutat
Das System SHALL pro Zutat Median und 90-%-Wert der Gramm pro Person über alle freigegebenen, nicht gelöschten Rezepte berechnen, je Rezept einmal gezählt, gesamt und je Rezepttyp. Zeilen ohne vertrauenswürdiges Gewicht MUST unberücksichtigt bleiben. Die Berechnung läuft per Command `recalculate_ingredient_quantity_stats` und nach dem Freigeben eines Rezepts für dessen Zutaten.

#### Scenario: Statistik mit Rezepttyp
- **GIVEN** Speisezwiebel kommt in 30 warmen Gerichten (Median 40 g) und 6 Soßen (Median 15 g) vor
- **WHEN** die Statistik berechnet wird
- **THEN** gilt für Soßen der Vergleichswert 15 g und für andere Typen der Gesamtwert

#### Scenario: Zu wenig Stichproben
- **WHEN** eine Zutat in weniger als 5 Rezepten vorkommt
- **THEN** wird für sie keine Ausreißer-Bewertung erzeugt

### Requirement: Auffällig hohe Mengen markieren
Eine Rezeptzeile SHALL als auffällig gelten, wenn ihre Gramm pro Person größer sind als `max(3 × Median, 1,5 × 90-%-Wert)` und mindestens 20 g über dem Median liegen; ab `6 × Median` mit Stufe `danger`, sonst `warning`. `RecipeItemOut.quantity_outlier` MUST Art, Stufe, Gramm pro Person, Median, 90-%-Wert, Stichprobenzahl und eine deutsche Meldung enthalten. Rezept-Detail und Editor SHALL den Hinweis an der Zeile zeigen, aber nur für Nutzer mit `can_edit`. Speichern wird nie verhindert.

#### Scenario: Zwiebel im Burger
- **GIVEN** Speisezwiebel hat bei warmen Gerichten Median 25 g und 90-%-Wert 60 g
- **WHEN** ein Burger 80 g Zwiebel pro Person enthält
- **THEN** ist die Zeile nicht auffällig (80 g < 90 g)
- **WHEN** ein Burger 160 g Zwiebel pro Person enthält
- **THEN** hat die Zeile `severity = "danger"` und die Meldung „160 g pro Person – üblich sind 25 g“

#### Scenario: Kleinstmengen
- **GIVEN** Salz hat Median 1 g
- **WHEN** ein Rezept 5 g Salz pro Person enthält
- **THEN** ist die Zeile nicht auffällig, weil die Differenz unter 20 g liegt

#### Scenario: Leser ohne Bearbeitungsrecht
- **WHEN** ein nicht angemeldeter Nutzer oder ein Nutzer ohne `can_edit` ein Rezept mit auffälliger Zeile ansieht
- **THEN** zeigt die Rezept-Ansicht keinen Hinweis

### Requirement: Plan-Check-Regel „Auffällige Zutatenmenge“
Der Plan-Check SHALL für jede Mahlzeit Rezept- und Zutatenzeilen mit ihrer effektiven Menge pro Person (inklusive `factor` und `MealItemOverride`) nach derselben Regel bewerten und je Mahlzeit und Zutat höchstens einen Alert vom Typ `quantity_outlier` erzeugen (Severity `warning`). Der Alert MUST Mahlzeit, Rezept, Zutat, Menge pro Person und üblichen Wert nennen; seine Aktion „Mengen prüfen“ SHALL zu `/meal-plans/{id}/shopping?sub=quantities&q=<Zutat>` führen.

#### Scenario: Ungeteilte Zwiebel im Plan
- **GIVEN** eine Mahlzeit enthält die Sweet Onion Sauce mit 160 g Zwiebel pro Person
- **WHEN** der Plan-Check läuft
- **THEN** erscheint ein Alert „Auffällige Menge: Speisezwiebel“ mit „Sa, 10.10. · Mittagessen · Sweet Onion Sauce: 160 g pro Person – üblich sind 15 g.“ und der Aktion „Mengen prüfen“

#### Scenario: Override beseitigt den Alert
- **WHEN** der Planer die Zwiebel in dieser Mahlzeit per Mengen-Ansicht auf 0,25 Stück (20 g) setzt
- **THEN** erscheint beim nächsten Plan-Check kein Alert mehr für diese Zeile

#### Scenario: Plan ohne Zugriff
- **WHEN** ein Nutzer ohne Zugriff den Plan-Check abruft
- **THEN** antwortet das System wie bisher mit 404

### Requirement: Datenqualitäts-Listen
Der Datenqualitäts-Bereich SHALL für Staff-Nutzer vier paginierte Listen bereitstellen (`page`, `page_size` 10/20/50, Standard 20):
- „Auffällige Mengen“ (Rezepte): auffällige Zeilen, filterbar nach Stufe, sortiert nach Faktor zum Median;
- „Ungeteilte Zeilen“ (Rezepte);
- „Stückgewichte“ (Zutaten): stückartige oder `1 Stück (<n>g)`-Portionen mit Import-Standardgewicht 150 g, nicht bestätigt, in mindestens einem Rezept oder Mahlzeit-Eintrag verwendet, sortiert nach Verwendung;
- „Alias-Konflikte“ (Zutaten): Zutatname entspricht Alias einer anderen Zutat oder zwei Zutaten tragen denselben Alias, mit Aktionen „Zusammenführen“ (Vorschau und vorhandener Merge-Service) und „Kein Duplikat“.

#### Scenario: Eisbergsalat
- **GIVEN** Eisbergsalat hat die Portion „1 Stück (150g)“ mit `weight_status = imported`, verwendet in 8 Rezepten
- **WHEN** ein Staff-Nutzer die Liste „Stückgewichte“ öffnet
- **THEN** erscheint Eisbergsalat mit 8 Rezepten

#### Scenario: Zwiebel und Speisezwiebel
- **GIVEN** die Zutat „Zwiebel“ existiert und „Speisezwiebel“ hat den Alias „Zwiebel“
- **WHEN** ein Staff-Nutzer die Liste „Alias-Konflikte“ öffnet
- **THEN** erscheint das Paar mit den Verwendungszahlen beider Zutaten

#### Scenario: Kein Staff
- **WHEN** ein angemeldeter Nutzer ohne Staff-Recht einen der Endpunkte aufruft
- **THEN** antwortet das System mit 403
- **WHEN** ein nicht angemeldeter Client einen der Endpunkte aufruft
- **THEN** antwortet das System mit 401

### Requirement: Bericht per Command
Das Command `check_recipe_quantities` SHALL auffällige Mengen, ungeteilte Zeilen, verdächtige Stückgewichte und Alias-Konflikte als Bericht ausgeben, ohne Daten zu ändern, und optional mit `--csv <datei>` exportieren.

#### Scenario: Bericht auf Prod
- **WHEN** das Command gegen Prod läuft
- **THEN** werden die vier Abschnitte mit Anzahl und Einträgen ausgegeben und keine Daten geändert
