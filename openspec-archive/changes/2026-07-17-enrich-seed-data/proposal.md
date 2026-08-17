## Why

Die aktuellen Seed-Daten in `backend/data/food/` enthalten 5.743 Zutaten mit erheblichen Qualitätsmängeln: 43 generische Ein-Wort-Namen ohne Nährwerte (z.B. "Salz", "Butter", "Mehl"), 90,6% der Portionen haben sinnlose rank-1-Werte (weight_g ≤ 1,0g), 585 Zutaten fehlen Nährwerte (darunter Grundnahrungsmittel wie Butter, Eier, Öl), und nur 2,2% der Zutaten haben Aliase. Das macht die App für Benutzer unbrauchbar — Rezepte zeigen falsche Nährwerte, Portionsauswahl ist kaputt, und die Suche findet generische Begriffe nicht.

Ziel: Ein Django Management Command (`enrich_seeds`), das alle Fixtures in eine temporäre SQLite-DB importiert, die Daten via ORM anreichert, und über `dumpdata` saubere Fixtures exportiert. Danach gibt es keine Datenfehler mehr.

## What Changes

- **BREAKING**: ~43 Zutaten werden umbenannt (generischer Name → konkreter Name), neue Slugs
- **BREAKING**: Alle 148 bestehenden Aliase werden gelöscht und komplett neu aus der Knowledge Base generiert
- **BREAKING**: ~5.200 Müll-Portionen werden gelöscht, RecipeItem-Referenzen auf neue rank-1-Portionen umgebogen
- **BREAKING**: `seed_generic_terms.py` und `seed_plural_aliases.py` werden durch die neue KB-generierte Alias-Erzeugung ersetzt
- Neue `IngredientSpec` Knowledge Base mit ~500 kuratierten Zutaten (Daten aus bestehenden REWE-Fixtures extrahiert)
- ~70-90 generische Ein-Wort-Begriffe werden als `is_generic=True` Aliase auf ALLE passenden konkreten Zutaten verteilt (1:N)
- Fehlende Nährwerte werden ergänzt: REWE-Daten → BLS → KI-Schätzung mit Range-Validation
- Alle 5.743 Zutaten erhalten neu berechnete Embeddings (via Gemini text-embedding API)
- Recipe-Caches aller 362 Rezepte werden mit der echten `recalculate_recipe_cache()` neu berechnet
- Nutri-Scores für alle Zutaten werden berechnet und in Fixtures gespeichert
- REWE-Produkte (5.002 mit `nan_art_id_rewe`) bleiben als eigene Zutaten erhalten und erhalten Aliase zu kuratierten Einträgen
- Kuratierte Zutaten erhalten Status `verified`, alle anderen bleiben unverändert
- Summarischer Enrichment-Report mit Zahlen (wieviele umbenannt, Nährwerte ergänzt, etc.)
- Idempotent: Heuristik erkennt bereits verarbeitete Zutaten (Name nicht generisch + Nährwerte > 0 + sinnvolle Portion)
- Verschiedene strukturelle Fixes: `physical_viscosity` korrekt setzen, `physical_density` wo verfügbar

## Capabilities

### New Capabilities

- `seed-data-enrichment`: Datenqualitäts-Pipeline für Seed-Fixtures — importiert, reichert an, validiert und exportiert alle Food-Daten über eine temporäre SQLite-DB mit vollem Django ORM-Zugriff

### Modified Capabilities

- `seed-data`: Die Seed-Daten selbst werden komplett ersetzt (alle `backend/data/food/*.json` Dateien)
- `ingredient-database`: Anforderung dass alle Zutaten vollständige Nährwerte, Preise und sinnvolle Portionen haben
- `ingredient-generic-aliases`: Generische Aliase werden von 6 auf ~70-90 erweitert, 1:N-Mapping statt 1:1
- `ingredient-name-validation`: Generische Namen als Ingredient-Namen sind nicht mehr erlaubt
- `ingredient-portion-redesign`: Rank-1-Portionen müssen sinnvolle Gewichte haben, Müll-Portionen werden entfernt

## Impact

- **Backend**: Neues Management Command `enrich_seeds` in `core/management/commands/`, neues KB-Modul `supply/data/ingredient_specs.py`
- **Daten**: Alle `backend/data/food/*.json` und `backend/data/food/supply_ingredient_embeddings.json` werden überschrieben
- **Bestehende Commands**: `seed_generic_terms.py` und `seed_plural_aliases.py` werden obsolet (Aliase kommen jetzt aus dem Fixture)
- **Keine Model-Änderungen**: Alle Änderungen sind Daten-Only, keine Migration nötig
- **Keine API-Änderungen**: Alle Endpunkte bleiben unverändert
- **Keine Frontend-Änderungen**: Das Frontend profitiert automatisch von korrekten Daten
- **Kosten**: ~$0,23 für Gemini API-Calls (Embeddings + Matching-Fallback)
