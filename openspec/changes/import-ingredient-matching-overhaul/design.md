## Context

Der Import läuft über `preview_recipe_ingredients` (`backend/recipe/services/ingredient_review_service.py`): `import_from_url` → `parse_recipe_html` (`backend/recipe/services/import_service.py`, JSON-LD, Chefkoch-Microdata, Microdata) → `_merge_ingredient_sources` mit Gemini-Mengen → `IngredientMatcher.match` (`backend/recipe/services/ingredient_matcher.py`) → `UnitGramConverter.convert_to_portion` (`backend/recipe/services/unit_gram_conversion.py`). Der Benchmark (`backend/recipe/tests/test_chefkoch_import_matching_e2e.py`, Baseline 61/11/64/42 %) zeigt die Fehlerquellen in `ingredient-matching-benchmark-2026-10-14.md`.

Heute weichen Test und Produktion ab: Stufe 2 nutzt in Postgres `pg_trgm`, in SQLite Levenshtein; Stufe 3 (pgvector) ist in SQLite aus und in der lokalen DB haben nur 38 von 5.748 Zutaten ein Embedding.

## Goals / Non-Goals

**Goals:**
- Benchmark-Ziele: richtige Zutat ≥ 90 %, still falsch ≤ 3 %, Menge ≥ 85 %, ohne Nacharbeit ≥ 75 % (ohne KI gemessen).
- Gleiches Matching-Verhalten auf SQLite und Postgres.
- Neue Zutat aus jeder offenen Zeile per Knopfdruck, vollständig überschreibbar.

**Non-Goals:**
- Katalog-Dubletten zusammenführen (nur als Bericht; Merge bleibt in `ingredient-merge-ui`).
- Andere Rezeptseiten als Chefkoch bekommen keinen eigenen Tabellenparser (JSON-LD bleibt).
- Kein automatisches Bestätigen durch KI.

## Decisions

### D1 Strukturierte Zeile statt String
Neues Modul `backend/recipe/services/ingredient_line.py` mit `ParsedLine` (Pydantic): `source_line`, `quantity: float | None`, `unit: str`, `quantity_kind: "exact" | "range" | "to_taste" | "none"`, `size: "small" | "medium" | "large" | None`, `name`, `specifiers: list[str]`, `note`, `query` (Suchanfrage = Spezifizierer + Name in natürlicher Reihenfolge). `parse_line(text)` und `parse_cells(amount_cell, name, properties)` (Chefkoch-Tabelle). `split_compound(line, is_known)` teilt `X und Y`. `ImportedIngredient` (`import_service.py`) erhält `parsed: ParsedLine`; `_parse_ingredient_string` wird durch `parse_line` ersetzt. `ingredient_name_normalization.py` und Teile von `ingredient_parser.py` gehen darin auf.
- Alternative: Regex-Erweiterung in `_parse_ingredient_string` – verworfen, weil Spezifizierer, Größe und „n. B.“ dort keinen Platz haben.
- Spezifizierer vs. Zusatz: kuratierte Wortlisten (`backend/recipe/data/ingredient_line_vocabulary.py`) plus Regel „Klammerinhalt, der selbst eine Katalog-Zutat ist (Trockenhefe, Weißweinessig), ersetzt den Namen“.

### D2 Chefkoch-Tabelle
`_parse_chefkoch_table(soup)` liest `tr.ds-ingredients-table__tr`: erste Zelle Menge/Einheit, `.ds-ingredients-table__ingredient-name`, `.ds-ingredients-table__ingredient-properties`. Wird für chefkoch.de vor JSON-LD-Zutaten verwendet; Metadaten weiter aus JSON-LD. Ohne JSON-LD liefert der Tabellenparser Titel (`h1`) und Zutaten.

### D3 In-Memory-Matching-Engine
`backend/recipe/services/matching_index.py`: `MatchingIndex` hält je matchbarer Zutat und Alias normalisierte Token (Kleinschreibung, Umlaut-Faltung nur für Vergleich, Snowball-Stemming via vorhandenem `term_normalization`, Bindestriche/Komposita gegen die Katalog-Wortliste zerlegt), Kopfnomen und Merkmale. Score = 0,5 × gewichteter Token-Jaccard (Kopfnomen doppelt) + 0,3 × Zeichen-Trigramm + 0,2 × Kopfnomen-Gleichheit; Konfliktmerkmal → Score × 0,3 und nie Auto-Match. Index wird pro Prozess gecacht und über `post_save`/`post_delete` von `Ingredient`/`IngredientAlias` invalidiert (Versionszähler im Django-Cache, damit mehrere Gunicorn-Worker konsistent bleiben). Die nutzerabhängige Sichtbarkeit wird als ID-Filter auf das Ergebnis angewendet.
- Alternative: pg_trgm behalten – verworfen, SQLite-Tests würden Prod nicht abbilden. ~6k Einträge sind im Speicher unkritisch (< 5 MB).
- `pg_trgm`-Stufe und Levenshtein-Fallback entfallen.

### D4 Stufenfolge
1. gelernte Zuordnung mit ≥ 2 bestätigenden Personen, 2. exakter Name/Alias (verifiziert vor Entwurf), 3. gelernte Zuordnung mit 1 Bestätigung (Vorschlag), 4. Index: „strong“ (Kern bedeckt, gleiches Kopfnomen, harte Spezifizierer vorhanden, kein Konflikt, keine Zusatzwörter) → gewählt; „generic“ (nur über Zutatennamen, nicht Aliase) → vorausgewählt „zu prüfen“; sonst Grauzone, 5. Embedding (Postgres) nur wenn der Index nichts findet, 6. KI-Rerank pro Rezept für offene Zeilen mit Kandidaten (nur angemeldet, ein Call, Vorschlag), 7. offen + „Zutat anlegen“.
- Abweichung: Kein Embedding-Rerank pro Zeile (je Zeile ein Embedding-Call); diese Lücke deckt der KI-Rerank mit einem Call pro Rezept. Backfill über vorhandenen `food_data_offensive --steps embeddings`.

### D5 Daten-Model (Migrationen in `supply`)
- `Ingredient.exclude_from_matching = BooleanField(default=False)`.
- Neues Model `LearnedIngredientMapping(query_key: str unique, ingredient: FK, confirmations: int, confirmed_by: M2M User, updated_at)` in `supply/models/`; geschrieben in der finalen Persistenz des Reviews (`backend/recipe/api/items.py`), nie in der Vorschau.
- Datenmigrations-Commands (kein Migrations-RunPython, damit Prod-Rollout steuerbar bleibt): `split_combined_seasoning_items` (Rezeptzeilen „Salz und Pfeffer“ → je 1 Prise `Jodsalz` und `gemahlener schwarzer Pfeffer`, danach soft-delete und `exclude_from_matching`), `fix_misassigned_spoon_units` (Portionen mit Maßeinheit 102 „Esslöffel“, deren Name eine ml/g-Angabe trägt), `audit_ingredient_aliases`, `backfill_ingredient_embeddings`. Alle mit Dry-Run als Standard und `--apply`.

### D6 Menge
`UnitGramConverter._direct_portion_count` prüft zuerst den normalisierten Portionsnamen (Präfix `1 TL`, `1 EL`, `Esslöffel` …); die Maßeinheit zählt nur, wenn der Name keine andere Einheit nennt. Größe aus `ParsedLine.size` wählt Stückportion bzw. skaliert. Standardgewichte in `backend/recipe/data/standard_unit_weights.py` (Einheit × optionale Zutatenkategorie). Kategorie-Dichte über Namens-/Retail-Section-Regeln in `supply/services/portion_resolution.py`. `n. B.`-Defaults setzen `quantity_estimated=True`.

### D7 API
- `IngredientReviewRowOut` (`backend/recipe/schemas/ingredient_review.py`): neu `quantity_estimated: bool = False`, `source_line: str = ""`, `ai_reason: str = ""`.
- `POST /api/recipes/ingredient-review/new-ingredient-draft/` – Request `IngredientDraftRequestIn {source_text: str, quantity: float | None, unit: str}` → `TemporaryIngredientDraftOut` (bestehend) plus `duplicates: list[IngredientMatchCandidateOut]`. Auth erforderlich (401), läuft über das AI-Budget. Kein Persistieren.
- Zod: `frontend-food/src/schemas/ingredientReview.ts` synchron.

### D8 Frontend
`RecipeIngredientReviewStep.tsx`: Button „Zutat anlegen“ (Icon Zauberstab) in jeder unbestätigten Zeile; Mutation-Hook `useIngredientDraftMutation` lädt den Entwurf, öffnet den bestehenden „Neue Zutat prüfen“-Dialog; vorhandene `duplicates` als Hinweis „Vorhandene Zutat verwenden?“. Badge „geschätzt“ an der Menge, Originalzeile bei geteilten Zeilen.

## Risks / Trade-offs

- [Overfitting auf zehn Seiten] → Gold-Labels decken nur 110 Zeilen ab; weitere zehn zufällige Seiten werden als zweiter, nicht gemessener Satz gezogen und am Ende einmal geprüft. Regeln sind allgemein formuliert, keine Einzelfall-Aliase für Benchmark-Zeilen.
- [Index im Speicher veraltet] → Versionszähler im Cache, Rebuild < 200 ms.
- [Falsche Spezifizierer-Klassifikation entfernt wichtige Information] → Notiz behält immer den Originaltext; Spezifizierer-Liste getestet.
- [KI-Reranker kostet Budget] → nur ein Call pro Rezept, nur bei offenen Zeilen, nur angemeldet; Ergebnis im 7-Tage-Vorschau-Cache.
- [Datenmigration Salz/Pfeffer ändert Nährwerte bestehender Rezepte minimal] → Dry-Run-Bericht pro Rezept, Apply nur nach OK im gebündelten Rollout.

## Migration Plan

1. Code + Migrationen (`exclude_from_matching`, `LearnedIngredientMapping`) deployen.
2. Prod gebündelt: `audit_ingredient_aliases`, `fix_misassigned_spoon_units`, `split_combined_seasoning_items`, `backfill_ingredient_embeddings` jeweils Dry-Run → Bericht an Robert → `--apply` nach OK.
3. Rollback: Felder sind additiv; Commands schreiben ein Änderungsprotokoll (`change-audit-log`), soft-gelöschte Zutat kann reaktiviert werden.

## Open Questions

- Keine.
