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

- [ ] 4.1 Owner entscheidet die unsicheren Fälle; Command lokal und auf Prod mit `--apply` ausführen
- [ ] 4.2 Teilungen durch `recipe.portions` in Planer, PDF, Einkaufsliste, Nährwert-Analyse und Preis pro Portion entfernen
- [ ] 4.3 DB-Constraint `portions = 1` (bzw. Feld entfernen) nach der Prod-Normalisierung
