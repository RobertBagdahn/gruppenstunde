## Why

Beim Rezept-Import (Chefkoch-URL, eingefügter Text) landen Zutatenzeilen oft auf der falschen Zutat, bleiben „Offen“ oder bekommen eine falsche Menge, obwohl passende Zutaten im Katalog existieren. Der neue End-to-End-Benchmark mit zehn zufälligen, echten Chefkoch-Rezepten gegen den echten Katalog (`ingredient-matching-benchmark-2026-10-14.md`) misst: richtige Zutat 61 %, still falsch gewählt 11 %, richtige Menge 64 %, Zeile ohne Nacharbeit nur 42 %. Eine Seite im neuen Chefkoch-Layout lässt sich gar nicht importieren.

## What Changes

- **Benchmark als Abnahmekriterium**: `backend/recipe/tests/test_chefkoch_import_matching_e2e.py` mit gekürzten echten Chefkoch-Seiten, Katalog-Snapshot (`manage.py export_matching_catalog`) und Gold-Labels; Schwellen als Ratchet.
- **Parser**: Chefkoch-Zutatentabelle als Primärquelle (JSON-LD als Fallback, Import ohne JSON-LD möglich); Einheiten-Lexikon mit Chefkoch-Pluralformen (`Zehe/n`, `Pck.`, `Stange/n`, `Prise(n)`, `TL, gehäuft` …) und Mengenwörtern (`n. B.`, `etwas`); Bereiche und Zirka (`ca. 60–80 g` → 70 g) sowie Format „Name: Menge“; Kombizeilen werden geteilt („Salz und Pfeffer“ → zwei Zeilen); Spezifizierer in Klammern/nach Komma („rot“, „passierte“, „edelsüß“) bleiben Teil der Suche, Zusätze werden Notiz.
- **Matcher**: neues Kandidaten-Scoring (normalisierte Tokens, Wortstellung egal, Komposita-Zerlegung, Kopfnomen) in einer In-Memory-Engine mit gleichem Verhalten auf SQLite und Postgres; Konfliktwörter verhindern Fehlzuordnungen (frisch/trocken, edelsüß/geräuchert …); bei Gleichstand wird die kanonische Zutat vorbelegt; Embeddings für alle Zutaten als Reranker; Alias-Audit; bestätigte Review-Entscheidungen werden als gelernte Zuordnung gespeichert; ein KI-Reranker pro Rezept schlägt für offene Zeilen eine Zutat vor (nie Auto-Bestätigung).
- **Menge & Portion**: Portionen „1 TL (2g)“/„1 EL (10ml)“ werden als TL/EL erkannt, Maßeinheits-Name nur Fallback; Größenadjektive wählen bzw. skalieren Stückportionen; Standardgewichte für Stück-/Gebinde-Einheiten ohne KI; Prise = 0,5 g; „n. B.“-Defaults (Gewürz 1 Prise, Öl/Fett 1 EL, Kräuter 1 EL gehackt, sonst offen), immer als „geschätzt“ gekennzeichnet; Dichte nach Zutatenkategorie statt pauschal 1,0.
- **Zutat per Knopfdruck**: jede offene Review-Zeile bietet „Zutat anlegen“; der Entwurf wird auf Abruf mit normalisiertem Namen und Zauberstab-Anreicherung erzeugt, vor dem Speichern gegen Dubletten geprüft und danach mit umgerechneter Menge gewählt.
- **Daten**: Kombi-Zutat „Salz und Pfeffer“ wird vom Matching ausgeschlossen; Datenmigration teilt ihre Rezeptzeilen in je 1 Prise Jodsalz und 1 Prise gemahlenen schwarzen Pfeffer und soft-löscht sie danach. Datenfix für Portionen mit falscher Maßeinheit „Esslöffel“ (ID 102) an ml-Portionen; Alias-Bereinigung („Hähnchen“, „Quark“). Prod nur im gebündelten Rollout: Dry-Run zuerst, `--apply` nur nach OK.
- Die Change `import-ingredient-name-normalization` geht hierin auf; ihr offener Prüfschritt 5.2 wird durch den Benchmark ersetzt.

## Capabilities

### New Capabilities
- `import-matching-benchmark`: End-to-End-Benchmark mit echten Rezeptseiten, Katalog-Snapshot, Gold-Labels und Ratchet-Schwellen.
- `import-ingredient-line-parsing`: Zerlegung einer Rezept-Zutatenzeile in Menge, Einheit, Name, Spezifizierer, Notiz und ggf. mehrere Zutaten inkl. „n. B.“-Defaults.
- `learned-ingredient-mapping`: gelernte Zuordnung aus bestätigten Review-Zeilen.

### Modified Capabilities
- `ingredient-matching`: Scoring, Konfliktwörter, kanonische Zutat bei Gleichstand, Embedding-Reranker, KI-Reranker, ausgeschlossene Kombi-Zutaten, einheitliche Engine.
- `recipe-url-import`: Chefkoch-Zutatentabelle als Primärquelle, Import ohne JSON-LD.
- `recipe-ingredient-review`: Button „Zutat anlegen“ in jeder offenen Zeile, geschätzte Mengen sichtbar.
- `unit-conversion`: TL/EL-Portionserkennung, Größenadjektive, Standardgewichte ohne KI, Dichte nach Kategorie.

## Impact

- **Backend (`recipe`)**: `services/import_service.py`, `services/ingredient_parser.py`, `services/ingredient_name_normalization.py`, `services/ingredient_matcher.py`, `services/ingredient_review_service.py`, `services/unit_gram_conversion.py`, `api` (neuer Endpunkt für Entwurf auf Abruf), neue Management-Commands (Alias-Audit, Salz-und-Pfeffer-Migration, Maßeinheit-Datenfix).
- **Backend (`supply`)**: `services/portion_resolution.py`, `services/ingredient_embeddings.py` (Backfill), `services/term_normalization.py`; neues Model für gelernte Zuordnungen und Feld zum Ausschluss vom Matching → **Migrationen** in `supply`.
- **Schemas**: Pydantic `IngredientReviewRowOut` erhält `quantity_estimated: bool` und `source_line` (bei geteilten Zeilen); neues `IngredientDraftRequestIn`. Zod in `frontend-food/src/schemas/ingredientReview.ts` synchron.
- **Frontend (`frontend-food`)**: `components/recipe/RecipeIngredientReviewStep.tsx`, `store/useRecipeIngredientReviewStore.ts`, Query-Hook für den Entwurf auf Abruf.
- **KI-Kosten**: ein zusätzlicher Gemini-Call pro Import (Reranker) nur bei offenen Zeilen; Embedding-Backfill einmalig.
