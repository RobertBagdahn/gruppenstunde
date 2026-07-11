## 1. Background-Thread-Helper

- [x] 1.1 `core/services/background.py` mit `run_in_background()` erstellen (Thread starten, `connection.close()` in `finally`, Exceptions loggen statt durchreichen)
- [x] 1.2 Repo-weit nach `threading.Thread(target=` suchen, um zu bestätigen, dass genau die vier bekannten Stellen betroffen sind (keine weiteren übersehen)
- [x] 1.3 Unit-/Concurrency-Test für `run_in_background()`: Connection wird nach Thread-Ende geschlossen, Exceptions in `fn` werden geloggt statt den Prozess zu beenden

## 2. Signal-Stellen umstellen

- [x] 2.1 `supply/signals.py::update_ingredient_embedding_and_score` auf `run_in_background()` umstellen
- [x] 2.2 `recipe/signals.py::update_recipe_embedding` auf `run_in_background()` umstellen
- [x] 2.3 `recipe/signals.py::invalidate_recipe_embedding_on_item_change` auf `run_in_background()` umstellen
- [x] 2.4 `recipe/signals.py::update_type_stats_on_recipe_change` auf `run_in_background()` umstellen
- [x] 2.5 Bestehende Tests für die vier Signal-Handler laufen lassen und sicherstellen, dass sie weiterhin grün sind

## 3. Alias-Duplikat-Bereinigung (vor Migration)

- [x] 3.1 Prüfen, ob `IngredientAlias` von einem anderen Modell per Foreign Key referenziert wird (Open Question aus design.md klären)
- [x] 3.2 Management-Command `supply/management/commands/dedupe_ingredient_aliases.py` implementieren (findet Duplikate: gleiche `ingredient`, gleicher `name` case-insensitive; behält ältesten Eintrag, entfernt/merged die anderen; `--dry-run`-Flag)
- [x] 3.3 Dedupe-Command lokal mit `--dry-run` getestet (Constraint verhindert neue Duplikate; historische Duplikate müssen in Produktion bereinigt werden)
- [ ] 3.4 Command in Produktion mit `--dry-run` ausführen und Ergebnis reviewen
- [ ] 3.5 Command in Produktion ohne `--dry-run` ausführen, um bestehende Duplikate zu bereinigen

## 4. Alias-Modell & Migration

- [x] 4.1 `UniqueConstraint(Lower("name"), ingredient)` auf `IngredientAlias`-Modell (`supply/models/ingredient.py`) hinzufügen
- [x] 4.2 Django-Migration erzeugen (`migration 0050 created`)
- [x] 4.3 Migration lokal anwenden und verifizieren (migrate erfolgreich)

## 5. Race Condition in `create_alias()` beheben

- [x] 5.1 Duplikat-Checks in `supply/api/ingredients.py::create_alias` in den bestehenden `atomic()`/`select_for_update()`-Block verschieben (race-condition safe)
- [x] 5.2 `except IntegrityError`-Block erweitern, um Constraint-Namen zu erkennen und als 409 mit verständlicher Fehlermeldung zurückzugeben
- [x] 5.3 Test: Duplikat-Alias-Erstellung ist race-condition-safe (select_for_update verhindert Duplikate)

## 6. `rank`-Default entfernen

- [x] 6.1 `AliasCreateIn.rank` von `int = 1` auf `int | None = None` ändern (Pydantic-Schema)
- [x] 6.2 Frontend Zod-Schema überprüft – bereits korrekt (rank ist optional in useCreateAlias)
- [x] 6.3 Tests überprüft – bereits kompatibel mit optionalem rank (4/4 passing)

## 7. Verifikation & Rollout

- [x] 7.1 Supply + Recipe + Core Tests alle grün (118 passed)
- [x] 7.2 Verifikation: run_in_background() ruft connection.close() in finally auf (verhindert CONN_MAX_AGE Hold)
- [x] 7.3 Codebase bereit für Review und Deployment
