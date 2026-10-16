# buffet-data-cleanup Specification

## Purpose
Anforderungen an buffet data cleanup: Freigegebene Zuordnungstabelle als einzige Quelle; Dubletten über zentrale Merge-Services; Alte Frühstücks-Tags entfernen.
## Requirements
### Requirement: Freigegebene Zuordnungstabelle als einzige Quelle
Die Datenmigration SHALL ausschließlich die für den jeweiligen Lauf geprüfte Zuordnungstabelle anwenden. Die Tabelle MUST im Code als deklarative Datenstruktur (`supply/data/buffet_role_mapping.py`) vorliegen, mit Aktionen `keep` (Rolle beibehalten), `add` (bestehende Rolle hinzufügen), `merge_into` (Dublette überführen), `untag` (Rolle entfernen, Datensatz bleibt) und `create` (fehlende, fachlich geprüfte Zutat oder Rezept anlegen). `create` MUST einen Item-Typ und die jeweils nötigen Pflichtdaten enthalten; Ingredient-Erstellungen umfassen insbesondere Name, erwarteten Namen, Rolle, Nährwerte, Retail-Section und Portionen. AI-Vorschläge allein erfüllen keine Freigabe- oder Verifizierungsvoraussetzung. Bestehende Einträge MUST über ID und erwarteten Namen adressiert sein; weicht der Name ab, MUST der Eintrag übersprungen und gemeldet werden. Noch nicht existierende `create`-Einträge MUST über Item-Typ, erwarteten Namen und vorgeschlagenen Slug identifiziert werden; vor dem Anlegen MUST geprüft werden, dass kein aktiver Eintrag mit gleichem normalisierten Namen oder Slug existiert. `retail_section`, `is_standalone_food` und Rezepttyp dürfen Kandidaten zur manuellen Auswahl liefern, aber die Migration MUST keine Rollen automatisch allein aus diesen Merkmalen ableiten. Ähnlichkeitsberichte MUST Vorschläge sein; Merge-Ziel und vollständiges Mapping bedürfen menschlicher Prüfung.

#### Scenario: Abweichender Name auf Prod
- **WHEN** die Tabelle ID 139 als „Brötchen“ erwartet, die Datenbank unter ID 139 aber einen anderen Namen hat
- **THEN** überspringt der Befehl den Eintrag und gibt „übersprungen: ID 139 erwartet ‚Brötchen‘, gefunden ‚…‘“ aus

#### Scenario: Retail-Section nur als Kandidatenquelle
- **GIVEN** eine Zutat in der Retail-Section „Knabberartikel“ trägt keinen Buffet-Rollen-Tag
- **WHEN** der Kandidatenbericht ausgeführt wird
- **THEN** wird die Zutat als möglicher Kandidat ausgewiesen, aber keine Zuordnung ohne bestätigten Mapping-Eintrag vorgenommen

#### Scenario: Dubletten-Kandidaten ohne automatische Merge-Entscheidung
- **GIVEN** mehrere Zutaten haben ähnliche normalisierte Namen
- **WHEN** der Dublettenbericht ausgeführt wird
- **THEN** zeigt er Kandidaten und mögliche Zielnamen an, führt aber keinen Merge ohne bestätigte `merge_into`-Aktion aus

### Requirement: Dubletten über zentrale Merge-Services
Zusammenführungen (`merge_into`) MUST nur zwischen System-Zutaten (`owner=None`) bzw. System-Rezepten erfolgen und MUST die Merge-Services verwenden, die dieselbe Logik wie die Admin-Merge-Endpunkte nutzen (`supply/services/ingredient_merge.py`, `recipe/services/recipe_merge.py`). Referenzen (RecipeItems, MealItems, Portionen, Tags) MUST auf das Ziel umgehängt werden; das Ziel MUST fehlende Nährwerte aus der Quelle übernehmen, wenn es selbst keine hat.

#### Scenario: Brötchen zusammenführen
- **WHEN** „Brötchen (ganzes)“ (7333) in „Brötchen“ (139) zusammengeführt wird
- **THEN** zeigen alle Referenzen auf 139, 139 übernimmt `energy_kcal=265` (vorher 0), und 7333 ist entfernt

#### Scenario: Rezept-Dublette Tschai
- **WHEN** „Tschai einfach/günstig“ 155 und 215 in 153 zusammengeführt werden
- **THEN** existiert nur noch Rezept 153 mit Rolle `buffet-drink`, Verweise aus Mahlzeiten zeigen auf 153

### Requirement: Alte Frühstücks-Tags entfernen
Nach erfolgreicher Umsetzung MUST der Befehl die Tags `breakfast-base`, `breakfast-fat`, `breakfast-topping`, `breakfast-extra`, `breakfast-drink` und `breakfast-warm-meal` löschen, sofern keine Zutat und kein Rezept sie noch trägt; andernfalls MUST er die verbleibenden Träger auflisten und die Tags behalten.

#### Scenario: Vollständige Migration
- **WHEN** alle Träger der alten Tags umgezogen sind
- **THEN** existiert kein Tag mit Slug-Präfix `breakfast-` mehr

### Requirement: Vollständigkeitsbericht für Katalog-Einträge
Ziel ist, dass jede Zutat mit Rollen-Tag `energy_kcal` gesetzt hat und `verified` ist. Der Befehl MUST den Status nie selbst ändern. Er MUST nach der Migration jede Zutat mit Rollen-Tag, die `energy_kcal` nicht gesetzt hat oder nicht `verified` ist, in der Zusammenfassung unter „manuell prüfen“ ausgeben, jeweils mit Grund („Nährwerte fehlen“, „Entwurf“). Die Verifizierung erfolgt ausschließlich über den Staff-Weg bzw. `set_ingredient_status` aus `ingredient-status` (Change `ingredient-status-visibility-unification`). Die Prüfung MUST zur Laufzeit erfolgen, nicht anhand der Status-Spalte der Tabelle, weil `verify_ingredients_in_approved_recipes` vorher Entwürfe verifiziert haben kann.

#### Scenario: Margarine ohne Nährwerte
- **WHEN** „Margarine“ (1875) nach der Migration noch `energy_kcal=None` hat (Status egal)
- **THEN** listet die Zusammenfassung „Margarine: Nährwerte fehlen – manuell prüfen“
- **THEN** ändert der Befehl weder Status noch Visibility

#### Scenario: Bereits verifiziert durch Vorgänger-Change
- **GIVEN** `verify_ingredients_in_approved_recipes --apply` hat „Mayonnaise“ (6674) bereits verifiziert und sie hat kcal
- **WHEN** `migrate_buffet_roles` läuft
- **THEN** erscheint „Mayonnaise“ nicht in der Liste „manuell prüfen“

### Requirement: Migrationsbefehl mit Dry-Run und expliziter Prod-Freigabe
Der Command `migrate_buffet_roles` SHALL `--dry-run` unterstützen und MUST standardmäßig ohne schreibende Änderungen laufen. Änderungen dürfen ausschließlich mit dem expliziten Flag `--apply` angewendet werden; `--dry-run` und `--apply` MUST sich gegenseitig ausschließen. Im Dry-Run MUST jede geplante Änderung einschließlich Ziel, erwarteter und gefundener Namen ausgegeben und nichts geschrieben werden. Mit `--apply` MUST der Command in einer Transaktion laufen und eine Zusammenfassung (Anzahl je Aktion, übersprungene Einträge, Qualitätswarnungen) ausgeben. Der Command MUST idempotent sein. Jeder Lauf auf Prod MUST zuerst als Dry-Run geprüft werden; ein Apply auf Prod SHALL ausschließlich nach separater expliziter Freigabe gemäß `docs/prod-runbook.md` erfolgen und MUST durch diesen Change, Tests oder Deploy nicht automatisch ausgelöst werden. Der Mapping-Test in der Staff-Datenqualitätsmaske MUST denselben Prüf-/Preview-Service verwenden wie der Command-Dry-Run und MUST ebenfalls schreibfrei sein.

#### Scenario: Dry-Run auf Prod
- **WHEN** `uv run python manage.py migrate_buffet_roles --dry-run` ausgeführt wird
- **THEN** listet der Command alle geplanten Aktionen und Qualitätswarnungen auf
- **THEN** bleibt die Datenbank unverändert

#### Scenario: Apply erfordert explizites Flag und zweiter Lauf ist idempotent
- **WHEN** der Befehl nach einem freigegebenen Apply mit `--apply` erneut ausgeführt wird
- **THEN** meldet er 0 Änderungen
- **WHEN** der Befehl ohne `--apply` aufgerufen wird
- **THEN** bleibt die Datenbank unverändert

#### Scenario: Prod-Änderung ohne Freigabe
- **WHEN** kein dokumentiertes Apply-Okay für den dargestellten Dry-Run vorliegt
- **THEN** wird kein Prod-Apply ausgeführt

#### Scenario: Masken-Test verändert keine Daten
- **WHEN** Staff einen Mapping-Test aus der Datenqualitätsmaske startet
- **THEN** erhält Staff dieselben wesentlichen Validierungs- und Referenzhinweise wie beim Command-Dry-Run
- **THEN** bleiben Ingredient-, Recipe-, Tag- und Statusdaten unverändert

#### Scenario: Zweiter Lauf
- **WHEN** der Befehl nach erfolgreichem Lauf erneut ausgeführt wird
- **THEN** meldet er 0 Änderungen

### Requirement: Kandidaten- und Vollständigkeitsbericht
Ein Bericht SHALL Zutaten nach `retail_section`, `is_standalone_food` und aktuellem Rollen-Tag sowie Rezepte nach `recipe_type` auswerten. Er SHALL Dublettenverdacht, vorhandene nicht getaggte Kandidaten, fehlende Zielkandidaten und Datensätze mit fehlenden kcal oder nicht verifiziertem Status getrennt ausweisen. Der Bericht SHALL keine Daten verändern. Die Seed-/Mapping-Implementierung SHALL nur die nach Vergleich mit der Zielumgebung fachlich bestätigten Namen, IDs, Aktionen und Rollen enthalten.

#### Scenario: Bericht ist lesend
- **WHEN** der Kandidaten- und Vollständigkeitsbericht auf einer Datenbank ausgeführt wird
- **THEN** gruppiert er Katalogkandidaten, Dubletten und Qualitätsprobleme
- **THEN** verändert er weder Zutaten, Rezepte, Tags noch Status

#### Scenario: Unvollständiges Item
- **GIVEN** eine Zutat mit Buffet-Rolle hat fehlende kcal oder ist nicht verifiziert
- **WHEN** der Bericht ausgeführt wird
- **THEN** erscheint sie mit dem konkreten Grund als manuell zu prüfen
