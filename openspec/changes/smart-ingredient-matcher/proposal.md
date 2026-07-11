## Why

Aktuell existieren drei verschiedene Implementierungen für das Matching von KI-generierten Zutaten auf bestehende Ingredients (URL-Import, AI-Create, AI-Suggest). Alle drei arbeiten mit unterschiedlicher Raffinesse — von simpler Exact-Match-Logik bis zu pg_trgm + Gemini. Es gibt kein Name/Note-Parsing ("Fladenbrot frisch" → name="Fladenbrot", note="frisch"), keine Confidence-Scores, keine gestufte Eskalation (einfache Matches zuerst, KI erst als letzte Instanz). Das produziert Dubletten, unrecyclebare Ingredient-Namen mit Zustandsform und inkonsistente Matching-Qualität.

## What Changes

- **Zentraler `IngredientMatcher`-Service** — eine einheitliche Pipeline, die von allen drei Flows (URL-Import, AI-Create, AI-Suggest) genutzt wird
- **Cascading Matcher** mit 4 Stages: Wort-Jaccard → pg_trgm+Levenshtein → Embedding (pgvector) → Gemini (nur für Nährwert-Anreicherung neuer Ingredients)
- **Name/Note-Parser** — extrahiert Modifikatoren (frisch, TK, rot, gehackt, etc.) aus Ingredient-Namen und wandelt sie in den `note`-Wert des RecipeItems um
- **Confidence-Scores** pro Match mit konfigurierbaren Thresholds pro Stage
- **Popularitäts-Sortierung** (Recipe-Usage-Count) — häufig genutzte Ingredients zuerst matchen
- **Human-in-the-Loop** — bei Unsicherheit entscheidet der User im Frontend-Dialog
- **Gemini-Enrichment extrahiert** — der Prompt für Nährwert-Anreicherung (`GeminiNewIngredient`) wird in einen eigenständigen Service `enrich_ingredient()` ausgegliedert, der von jedem Flow genutzt werden kann
- **BREAKING**: `_match_or_create_ingredient()` in `recipe_ai_suggest_service.py` wird durch den zentralen `IngredientMatcher` ersetzt (ändert Matching-Verhalten von Flow B)

## Capabilities

### New Capabilities
- `ingredient-matching`: Unified matching pipeline mit Confidence-Scores, Cascading Stages (Jaccard → Fuzzy → Embeddings → Gemini + Human-in-the-Loop), Name/Note-Parsing und Popularitäts-Sortierung

### Modified Capabilities
<!-- No existing specs change at requirement level — this is purely implementation -->

## Impact

- **Backend Apps**: `recipe/services/` — neuer `IngredientMatcher`-Service; `supply/` — Erweiterung Embedding-Text um Aliases + Groups
- **Pydantic Schemas**: Extraktion von `GeminiNewIngredient` in wiederverwendbares Schema; neues `MatchResult`-Schema mit Confidence + matched_via + note
- **API**: Keine neuen Endpunkte (bestehende Flows nutzen intern den neuen Service)
- **Frontend**: `UnknownIngredientDialog` erhält Unsicherheits-Fälle; kein neues UI-Feature
- **Migration**: Recipe-Usage-Count muss per Datenmigration initial berechnet werden
- **Tests**: Neue Tests für IngredientMatcher, Name/Note-Parser, Confidence-Berechnung; bestehende Tests für URL-Import/AI-Create/AI-Suggest migrieren
