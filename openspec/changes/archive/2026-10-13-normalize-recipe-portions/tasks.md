## 1. Audit

- [x] 1.1 Read-only-Audit aller Rezepte mit `portions>1` (Gewicht, Typ, Einordnung alt/neu, eigenes Urteil) nach `/tmp/recipe-portions-audit.csv` und `/tmp/recipe-portions-audit.md`
- [x] 1.2 Abweichung 89 vs. 88 Rezepte klären

## 2. Normalisierungs-Command

- [x] 2.1 Typabhängige Einordnung mit „review“ für unklare Fälle
- [x] 2.2 `--ids`, `--treat-as-total`, `--treat-as-per-person`, Schreiben nur mit `--apply`
- [x] 2.3 Alle Rezeptzeilen inkl. Austausch-Alternativen teilen, `source_servings` setzen, Cache neu berechnen
- [x] 2.4 Tests mit SQLite-Fixtures

## 3. Schutz vor neuen Altdaten

- [x] 3.1 Pydantic-Validatoren für `portions` in Create/Update (422 bei `!= 1`)
- [x] 3.2 `portions` im Admin schreibgeschützt
- [x] 3.3 Chefkoch-Import speichert `source_servings`
- [x] 3.4 Frontend-Food-Payload-Typen auf `portions?: 1`
- [x] 3.5 API-, Admin- und Import-Tests

## 4. Folgearbeiten (eigene Changes)

- [x] 4.1 Unsichere Fälle von Robert entschieden; Command auf Prod ausgeführt (siehe `docs/prod-runbook.md` Abschnitt 10, 11.10.2026).
- [x] 4.2 Teilungen durch `recipe.portions` geprüft: Planer, PDF, Einkaufsliste und Nährwert-Analyse rechnen mit Mengen pro Person; übrig sind nur KI-Prompts und der Import-Normalisierer.
- [x] 4.3 DB-Constraint `recipe_portions_one` (`portions = 1`) existiert (`recipe/models/recipe.py`).
