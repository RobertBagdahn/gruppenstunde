## Why

Das Frühstückssystem (Wizard, Catalog, Einkaufsliste) ist im Backend vollständig implementiert, aber auf Produktion funktionsunfähig. Der Deploy-Prozess ruft nur `seed_all --if-empty` auf – dieses erstellt aber weder die `content.Tag`-Einträge (`breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`), noch die Basis-/Belag-Zutaten, noch die Drink-Rezepte, noch die warmen Frühstücksrezepte. Der `GET /breakfast-catalog/` Endpoint liefert auf Prod leere Ergebnisse.

Zusätzlich existieren Datenkonflikte zwischen den beiden Seed-Quellen:
- `seed_all.py` und `seed_breakfast_catalog.py` legen 9 Zutaten mit abweichenden Nährwerten an (Butter, Honig, Nutella, Marmelade, Erdnussbutter, Leberwurst, Avocado, Hummus, Kaffee)
- `seed_drink_recipes.py` ist ein Legacy-Subset von `seed_breakfast_catalog.py` mit teils abweichenden Nährwerten
- Warme Frühstücksrezepte (`seed_breakfast_recipes.py`) sind nicht mit dem Tag `breakfast-warm-meal` versehen

Dieser Change bereinigt diese Inkonsistenzen, integriert alle Breakfast-Seed-Commands in `seed_all`, und stellt die vollständige Frühstücksdatenbasis auf Produktion bereit.

## What Changes

- **seed_all.py** wird erweitert, sodass es `seed_breakfast_catalog` und `seed_breakfast_seed_recipes` intern aufruft
- **9 Ingredient-Duplikate** werden aufgelöst: Die Nährwerte aus `seed_breakfast_catalog.py` (spezifisch fürs Frühstück mit korrekten Portionsgewichten) werden als Quelle definiert, die generischen Werte aus `seed_all.py` bleiben für Nicht-Frühstücks-Kontexte erhalten
- **Warme Rezepte** (Rührei, Pfannkuchen) erhalten den Tag `breakfast-warm-meal`
- **`seed_drink_recipes.py`** wird als Legacy-Code markiert und von `seed_all` nicht mehr aufgerufen (die 8 Drink-Rezepte aus `seed_breakfast_catalog` sind vollständiger)
- **Deploy-Skill** wird aktualisiert: Phase 7 führt nach `seed_all` auch `seed_breakfast_catalog` und ggf. `seed_breakfast_recipes` aus (oder `seed_all` ruft sie intern auf → ein Befehl)
- **Cloud SQL Proxy** wird genutzt, um per `uv run python manage.py ...` auf Prod zu seeden
- **Zero-to-Breakfast-Test** auf Prod zur Verifikation

## Capabilities

### New Capabilities
- `breakfast-prod-seed`: Vollständiges Befüllen der Produktionsdatenbank mit allen Frühstücksdaten (Tags, Basis-Zutaten, Belag-Zutaten, Drink-Rezepte, warme Rezepte) inklusive Idempotenz und Datenkonflikt-Auflösung

### Modified Capabilities
- `seed-data`: `seed_all` MUSS `seed_breakfast_catalog` und `seed_breakfast_recipes` integrieren — entweder durch internen Aufruf oder durch Inlining der Daten
- `breakfast-wizard`: Sicherstellen, dass die Specs mit den endgültigen Nährwerten aus `seed_breakfast_catalog` übereinstimmen
- `breakfast-seed-data`: Wird abgelöst durch `breakfast-prod-seed` — die alten 13 Zutaten sind nun im vollen Catalog aufgegangen
- `breakfast-seed-recipes`: Wird abgelöst durch die Integration in `seed_all` — warme Rezepte werden korrekt getaggt

## Impact

- **`backend/core/management/commands/seed_all.py`** — Integration der Breakfast-Seed-Aufrufe
- **`backend/supply/management/commands/seed_breakfast_catalog.py`** — ggf. Anpassung der Nährwerte für overlap-ingredients
- **`backend/recipe/management/commands/seed_breakfast_recipes.py`** — Tag `breakfast-warm-meal` hinzufügen
- **`backend/recipe/management/commands/seed_drink_recipes.py`** — als Legacy markieren, aus `seed_all` entfernen
- **`.opencode/skills/deploy/SKILL.md`** — Phase 7 aktualisieren (oder Hinweis, dass `seed_all` jetzt alles abdeckt)
- **Datenbank-Migration** — keine neuen Models, aber ggf. Data-Migration zur Bereinigung bestehender Duplikate auf Prod
- **`openspec/specs/breakfast-seed-data/spec.md`** — kann archiviert werden (abgelöst)
- **`openspec/specs/breakfast-seed-recipes/spec.md`** — kann archiviert werden (abgelöst)
