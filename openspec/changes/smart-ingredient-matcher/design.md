## Context

Aktuell existieren drei fragmentierte Matching-Implementierungen in `backend/recipe/services/`:

| Flow | Datei | Matching | Nährwerte |
|------|-------|----------|-----------|
| URL Import | `url_import_service.py` | pg_trgm → Gemini (opak) | ✅ im gleichen Gemini-Call |
| AI Create | `recipe_ai_suggest_service.py` | exact name → alias | ❌ |
| AI Suggest | `ai_ingredients_service.py` | exact → slug → alias → contains → stemmed | ❌ |

Kein Flow hat Name/Note-Parsing, Confidence-Scores oder gestufte Eskalation. Gemini wird im URL-Flow sowohl für Matching als auch für Nährwert-Anreicherung verwendet — was den Entscheidungsprozess opak und nicht-deterministisch macht.

## Goals / Non-Goals

**Goals:**
- Einheitlicher `IngredientMatcher`-Service, den alle drei Flows nutzen
- Cascading Pipeline: Wort-Jaccard → pg_trgm+Levenshtein → Embedding → Gemini (nur Enrichment)
- Name/Note-Parser, der Modifikatoren (frisch, TK, rot, gehackt, etc.) aus Ingredient-Namen extrahiert
- Confidence-Scores und Populäritäts-Sortierung für deterministischere Entscheidungen
- Human-in-the-Loop bei Unsicherheit
- Gemini-Enrichment (`GeminiNewIngredient`-Prompt) als wiederverwendbarer Service extrahiert

**Non-Goals:**
- Keine neuen API-Endpunkte
- Kein Frontend-Redesign (bestehender `UnknownIngredientDialog` wird erweitert)
- Keine Änderung am Ingredient-Datenmodell (keine neuen DB-Felder außer ggf. Usage-Count)
- Kein Batch-Cleanup existierender Ingredients mit Zustandsform im Namen
- Kein ML-Training für Parser (rein regelbasiert + KI-Fallback)

## Decisions

### Decision 1: IngredientMatcher als zentraler Service

Ein neuer Service `recipe/services/ingredient_matcher.py` kapselt die gesamte Pipeline.

```python
class IngredientMatcher:
    def parse(self, raw_name: str) -> ParsedIngredient
    def match(self, name: str, context: RecipeContext | None = None) -> MatchResult
    def enrich(self, name: str, user: User | None = None) -> IngredientNutrition | None
```

Alle drei Flows rufen `IngredientMatcher.match()` statt eigener Matching-Logik.

### Decision 2: Name/Note-Parser mit Eskalation

Der Parser in `parse()` arbeitet ebenfalls kaskadierend:

```
Input: "2 frische Fladenbrot"

Step 1: Regel-basiert
  - Entferne bekannte Modifikatoren (Liste aus state/size/color/prep keywords)
  - Prüfe ob Rest als Ingredient existiert
  "Fladenbrot frisch" → remove "frisch" → "Fladenbrot" → existiert? JA
  → name="Fladenbrot", note="frisch"

Step 2: Jaccard/Fuzzy (falls kein Full-Match)
  - Generiere Varianten durch Entfernen/Umstellen von Wörtern
  - Suche beste Übereinstimmung mit Wort-Jaccard
  - Rest-Wörter = Note

Step 3: KI-Fallback (Gemini)
  - Roher String → Gemini parst in name + note + quantity + unit

Step 4: Human-in-the-Loop
  - Wenn Confidence < Threshold → Frontend-Dialog
```

Die Modifikator-Liste wird als Konstante im Service definiert.

### Decision 3: Cascading Matcher mit First-above-Threshold

```
Stage 1: Wort-Jaccard (Threshold 0.90)
  - Tokenisiere in Wörter, Jaccard = |intersection| / |union|
  - Sortiere Kandidaten nach Recipe-Usage-Count (popular)
  - Erster Kandidat über Threshold → MATCH

Stage 2: pg_trgm + Levenshtein (Threshold 0.70)
  - Gewichteter Score: 0.6 × pg_trgm + 0.4 × (1 − levenshtein/max_len)
  - Erster Kandidat über Threshold → MATCH

Stage 3: Embedding (Threshold 0.50)
  - pgvector CosineDistance, sigmoid-calibriert auf %
  - Embedding-Text: name + aliases + group_names
  - Erster Kandidat über Threshold → MATCH

Stage 4: Gemini Enrichment + Human
  - Kein Match gefunden → Minimales Ingredient anlegen (DRAFT)
  - Gemini enrich() für Nährwerte + Scores + Portion
  - Wenn auch Gemini unsicher → Human-in-the-Loop
```

Thresholds werden als Konstanten definiert und können später justiert werden.

### Decision 4: Gemini nur für Nährwert-Anreicherung

Der `GeminiNewIngredient`-Prompt wird aus `url_import_service.py` in einen eigenständigen Service extrahiert:

```python
def enrich_ingredient(name: str, user: User | None = None) -> IngredientNutrition | None:
    """Call Gemini to get nutritional data for a new ingredient.
    
    Returns GeminNewIngredient with energy_kcal, protein_g, fat_g,
    carbohydrate_g, scores, portion data, etc.
    """
```

Genutzt von:
- `IngredientMatcher.match()` wenn alle Stages fehlschlagen
- `_create_new_ingredients()` im URL-Flow (ersetzt den dortigen Inline-Call)

### Decision 5: Popularität = Recipe-Usage-Count

```sql
-- Einmalige Daten-Migration
ALTER TABLE supply_ingredient ADD COLUMN usage_count integer NOT NULL DEFAULT 0;

UPDATE supply_ingredient SET usage_count = (
  SELECT COUNT(*) FROM recipe_recipeitem 
  WHERE recipe_recipeitem.ingredient_id = supply_ingredient.id
);
```

Wird als `default_sort` im Matcher verwendet für die Candidate-Order.

### Decision 6: Embedding-Text erweitern

`build_ingredient_embedding_text()` in `embedding_service.py` wird erweitert:
- Aktuell: `name + description + retail_section`
- Neu: `name + description + retail_section + aliases (komma-getrennt) + group_names (komma-getrennt)`

Bestehende Embeddings werden nicht neu generiert (Hash-basierte Änderungserkennung greift automatisch bei nächstem Update).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Threshold-Feintuning** — Die initialen Thresholds (0.90/0.70/0.50) könnten zu streng oder zu lax sein | Thresholds als Django Settings konfigurierbar; Monitoring-Log für verpasste Matches |
| **Embedding-Qualität** — Erweiterung des Embedding-Textes erfordert Neu-Generierung aller Embeddings | Hintergrund-Job (`management command`) für batch_update_embeddings; Nutzer merken keine Veränderung |
| **Usage-Count-Veraltung** — Der Count wird nur einmal initial berechnet | Kein Echtzeit-Update nötig (approximate ordering reicht); kann periodisch aktualisiert werden |
| **Gemini-Kosten** — enrich() für jedes neue Ingredient kostet Tokens | Nur im Fallback-Pfad (Stages 1-3 schlagen fehl); bei vorhandenen Matches kein Gemini-Call |
| **Human-in-the-Loop UX** — Unsicherheits-Dialog könnte Workflow unterbrechen | Nur bei wirklich niedriger Confidence (< 0.3); User kann auch "trotzdem anlegen" |

## Migration Plan

1. Daten-Migration: `usage_count`-Feld auf Ingredient + Initialberechnung
2. Embedding-Text erweitern in `build_ingredient_embedding_text()`
3. `IngredientMatcher`-Service erstellen (zunächst parallel nutzbar)
4. Gemini-Enrichment extrahieren (`enrich_ingredient()`)
5. Flow C (AI-Suggest) auf `IngredientMatcher` umstellen
6. Flow B (AI-Create) auf `IngredientMatcher` umstellen
7. Flow A (URL-Import) auf `IngredientMatcher` umstellen — Gemini-Teil bleibt für Recipe-Metadaten
8. Alte Matching-Funktionen als deprecated markieren
9. Tests schreiben und Thresholds justieren

Rollback: Ältere Matching-Funktionen bleiben erhalten, einfaches Revert auf alten Flow-Code.

## Open Questions

- Soll `usage_count` in Echtzeit per Signal aktualisiert werden (bei RecipeItem-Create/Delete)?
- Welche konkreten Wörter gehören in die Modifikator-Liste des Parsers? Vorschlag: aus bestehenden Ingredient-Namen extrahieren (z.B. alle Wörter, die in >50% der Namen vorkommen, aber selten allein stehen)
- Frontend: Soll der Unsicherheits-Dialog die Top-3-Kandidaten zeigen oder nur "kein Match, trotzdem anlegen?"
