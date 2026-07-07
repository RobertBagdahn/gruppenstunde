## Why

Auf Produktion sind keine Basis-Zutaten (Brot etc.) im Frühstücksassistenten verfügbar. Ursache: Drei unabhängige Lücken im System:

1. **Seed nie auf Prod gelaufen** — `seed_breakfast_catalog` erzeugt 6 Basis-Zutaten (Bauernbrot, Toastbrot, etc.) und taggt sie mit `breakfast-base`, wurde aber nie auf Produktion ausgeführt.
2. **Export vergisst `tags` M2M** — `export_prod_data.py` exportiert das `tags`-Feld nicht für `Ingredient` (nur `nutritional_tags`), sodass selbst eine korrekt getaggte Prod-DB nach Import lokal keine Tags hat.
3. **Vorhandene Brot-Zutaten nicht getaggt** — Die generischen Ingredients (Brot PK 138, Brötchen PK 139, etc.) haben keine `breakfast-base`-Tags.

## What Changes

1. **Export-Skript reparieren** — `tags` zur M2M-Feldliste von `Ingredient` in `export_prod_data.py` hinzufügen (wie bei `Recipe` bereits der Fall).
2. **Seed-Befehl auf Prod ausführen** — `seed_breakfast_catalog` auf Produktion laufen lassen (erzeugt alle Frühstücksdaten inkl. Basis-Zutaten).
3. **Granulare Seed-Erweiterung** — Bestehende generische Brot-Zutaten (Brot, Brötchen, Toast etc.) automatisch mit `breakfast-base` taggen (entweder im Seed-Befehl oder eigener Migration).

## Capabilities

### New Capabilities

- _(none — reine Bugfixes und Betriebsänderungen)_

### Modified Capabilities

- `seed-data`: Anforderung präzisieren, dass `seed_breakfast_catalog` auch auf Produktion ausgeführt werden muss (nicht nur lokal). Erweiterung bestehender Scenario: Seed-Befehl taggt auch existierende generische Brot-Zutaten mit `breakfast-base`.
- `import-prod-data` (neu, falls bisher nicht existent): Anforderung für korrekten Export/Import von M2M-Feldern dokumentieren.

## Impact

- `backend/bin/export_prod_data.py` — eine Feld-Ergänzung
- `backend/supply/management/commands/seed_breakfast_catalog.py` — optionale Erweiterung zum Nachtaggen existierender Zutaten
- Produktion — einmaliger Seed-Befehl via Cloud Run Shell
- `backend/data/food/supply_ingredient.json` — nach Export-Neugenerierung enthalten die Ingredient-Fixtures auch Tags
