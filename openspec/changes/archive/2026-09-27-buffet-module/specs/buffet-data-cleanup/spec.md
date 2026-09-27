## ADDED Requirements

### Requirement: Freigegebene Zuordnungstabelle als einzige Quelle
Die Datenmigration SHALL ausschließlich die in `design.md` („Zuordnungstabelle“) freigegebene Tabelle umsetzen. Die Tabelle MUST im Code als deklarative Datenstruktur (`supply/data/buffet_role_mapping.py`) vorliegen, mit Aktionen `keep` (Rolle setzen), `merge_into` (Dublette zusammenführen), `untag` (Rolle entfernen, Datensatz bleibt), `add` (bestehenden Datensatz mit Rolle versehen) und `create` (fehlende Zutat anlegen). Einträge MUST über ID **und** erwarteten Namen adressiert werden; weicht der Name ab, MUST der Eintrag übersprungen und gemeldet werden.

#### Scenario: Abweichender Name auf Prod
- **WHEN** die Tabelle ID 139 als „Brötchen“ erwartet, die Datenbank unter ID 139 aber einen anderen Namen hat
- **THEN** überspringt der Befehl den Eintrag und gibt „übersprungen: ID 139 erwartet ‚Brötchen‘, gefunden ‚…‘“ aus

### Requirement: Migrationsbefehl mit Dry-Run
Der Command `migrate_buffet_roles` SHALL die Tabelle anwenden und MUST `--dry-run` unterstützen. Im Dry-Run MUST jede geplante Änderung ausgegeben und nichts geschrieben werden. Ohne Dry-Run MUST der Befehl in einer Transaktion laufen und am Ende eine Zusammenfassung (Anzahl je Aktion, übersprungene Einträge) ausgeben. Der Befehl MUST idempotent sein.

#### Scenario: Dry-Run auf Prod
- **WHEN** `uv run python manage.py migrate_buffet_roles --dry-run` ausgeführt wird
- **THEN** listet er alle Aktionen und die Datenbank bleibt unverändert

#### Scenario: Zweiter Lauf
- **WHEN** der Befehl nach erfolgreichem Lauf erneut ausgeführt wird
- **THEN** meldet er 0 Änderungen

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
