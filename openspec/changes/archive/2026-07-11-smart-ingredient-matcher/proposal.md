## Why

Aktuell existieren drei verschiedene Implementierungen für das Matching von KI-generierten Zutaten auf bestehende Ingredients (URL-Import, AI-Create, AI-Suggest). Alle drei arbeiten mit unterschiedlicher Raffinesse — von simpler Exact-Match-Logik bis zu pg_trgm + Gemini. Es gibt kein Name/Note-Parsing ("Fladenbrot frisch" → name="Fladenbrot", note="frisch"), keine Confidence-Scores, keine gestufte Eskalation (einfache Matches zuerst, KI erst als letzte Instanz). Das produziert Dubletten, unrecyclebare Ingredient-Namen mit Zustandsform und inkonsistente Matching-Qualität.

## What Changes

- **Zentraler `IngredientMatcher`-Service** — eine einheitliche Pipeline, die von allen drei Flows (URL-Import, AI-Create, AI-Suggest) genutzt wird
- **Cascading Matcher** mit 4 Stages: Wort-Jaccard → pg_trgm+Levenshtein → Embedding (pgvector) → Gemini (nur für Nährwert-Anreicherung neuer Ingredients)
- **Name/Note-Parser** — extrahiert quantity, unit (best effort), Modifikatoren (frisch, TK, rot, gehackt, etc.) und wandelt sie in `note` um. Sucht auch gegen `IngredientAlias`-Namen.
- **Confidence-Scores** pro Match mit konfigurierbaren Thresholds pro Stage
- **Popularitäts-Sortierung** (Recipe-Usage-Count) — Echtzeit via Django Signals aktuell gehalten
- **Human-in-the-Loop** — bei Grey-Zone (Confidence < 0.5), mehreren gleichwertigen Kandidaten oder keinem Match: existierender Zutaten-Suchdialog zur manuellen Auswahl
- **Gemini-Enrichment extrahiert** — der Prompt für Nährwert-Anreicherung (`GeminiNewIngredient`) wird in einen eigenständigen Service `enrich_ingredient()` ausgegliedert, der von jedem Flow genutzt werden kann
- **BREAKING**: Alle drei Flows (URL-Import, AI-Create, AI-Suggest) werden auf `IngredientMatcher` umgestellt: `_match_or_create_ingredient()`, `_get_ingredient_candidates()`, `match_ingredients()` und `_create_new_ingredients()` werden ersetzt

## Capabilities

### New Capabilities
- `ingredient-matching`: Unified matching pipeline mit Confidence-Scores, Cascading Stages (Jaccard → Fuzzy → Embeddings → Gemini + Human-in-the-Loop), Name/Note-Parsing und Popularitäts-Sortierung

### Modified Capabilities
<!-- No existing specs change at requirement level — this is purely implementation -->

## Impact

- **Backend Apps**: `recipe/services/` — neuer `IngredientMatcher`-Service (Django Service-Klasse); `supply/` — Erweiterung Embedding-Text um Aliases + Groups; `supply/signals.py` — RecipeItem-Signale für usage_count
- **Pydantic Schemas**: Extraktion von `GeminiNewIngredient` in wiederverwendbares Schema; neues `MatchResult`-Schema mit Confidence + matched_via + note (alle Felder in API exposed); `ParsedIngredient`-Schema mit quantity/unit/name/note
- **API**: Keine neuen Endpunkte (bestehende Flows nutzen intern den neuen Service)
- **Frontend**: `UnknownIngredientDialog` wird durch bestehenden Zutaten-Suchdialog ersetzt (Wiederverwendung); kein neues UI-Feature
- **Migration**: Recipe-Usage-Count per Datenmigration initial befüllt; Django Signals halten ihn danach aktuell
- **Tests**: Isolierte Stage-Tests + Integrationstests für IngredientMatcher, Name/Note-Parser, Confidence-Berechnung; bestehende Tests für URL-Import/AI-Create/AI-Suggest migrieren
