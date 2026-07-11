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

### Decision 1: IngredientMatcher als Django Service-Klasse

Ein neuer Service `recipe/services/ingredient_matcher.py` kapselt die gesamte Pipeline als Django Service-Klasse (nutzt ORM direkt, kein Mock-Layer nötig). Alle Stages durchsuchen sowohl `Ingredient.name` als auch `IngredientAlias.name`.

```python
class IngredientMatcher:
    """Central ingredient matching pipeline. Stateless — no instance state between calls."""

    @classmethod
    def parse(cls, raw_name: str) -> ParsedIngredient: ...
    @classmethod
    def match(cls, name: str, context: RecipeContext | None = None) -> MatchResult: ...
    @classmethod
    def enrich(cls, name: str, user: User | None = None) -> GeminiNewIngredient | None: ...
```

Alle drei Flows rufen `IngredientMatcher.match()` statt eigener Matching-Logik.

### Decision 2: Name/Note-Parser mit Quantity/Unit (best effort)

Der Parser extrahiert quantity + unit als best effort zusätzlich zu name + note:

```
Input: "200g Mehl"

Step 1: Regel-basiert
  - Quantity-Patterns: "200g", "2 Stück", "0.5", "1 EL", "etwas"
  - Unit-Abkürzungen: g, kg, ml, l, EL, TL, Stück, Pck., Bund, Dose
  - Entferne Modifikatoren (state/size/color/prep) aus dem Rest
  - Prüfe gegen Ingredient.name + IngredientAlias.name
  "200g Mehl" → quantity=200, unit="g", name="Mehl", note=""
  "2 frische Fladenbrot" → quantity=2, unit="Stück", name="Fladenbrot", note="frisch"

Step 2: Jaccard/Fuzzy (falls kein Full-Match)
  - Varianten durch Entfernen/Umstellen von Wörtern

Step 3: KI-Fallback (Gemini)
  - Roher String → Gemini parst vollständig

Step 4: Human-in-the-Loop
  - Wenn Confidence < Threshold → Frontend-Dialog
```

`ParsedIngredient`-Schema: quantity (float, default=0), unit (str, default=""), name (str), note (str, default=""), confidence (float).

Die Modifikator-Liste wird als Konstante im Service definiert.

### Decision 3: Cascading Matcher mit First-above-Threshold

Jede Stage durchsucht `Ingredient.name` UND `IngredientAlias.name`.

```
Stage 1: Wort-Jaccard (Threshold 0.90)
  - Tokenisiere in Wörter, Jaccard = |intersection| / |union|
  - Sortiere Kandidaten nach usage_count (popular)
  - Erster Kandidat über Threshold → MATCH
  - Wenn mehrere Kandidaten über Threshold mit ähnlichem Score → HITL

Stage 2: pg_trgm + Levenshtein (Threshold 0.70)
  - Gewichteter Score: 0.6 × pg_trgm + 0.4 × (1 − levenshtein/max_len)
  - Erster Kandidat über Threshold → MATCH
  - Wenn mehrere Kandidaten (Score-Differenz < 0.05) → HITL

Stage 3: Embedding (Threshold 0.50)
  - pgvector CosineDistance über ALLE Ingredients (nicht nur Top-N)
  - Embedding-Text: name + aliases + group_names
  - Erster Kandidat über Threshold → MATCH

Stage 4: Human Dialog + Gemini Enrichment
  - Kein Match in Stage 1-3 → bestehenden Zutaten-Suchdialog öffnen
  - User sucht manuell oder legt neu an
  - Bei "neu anlegen": DRAFT-Ingredient + Gemini enrich() (synchron)
  - Gemini fehlgeschlagen → DRAFT bleibt ohne Nährwerte
  - Auch bei Grey-Zone (0.3 ≤ confidence < 0.5) oder mehreren Kandidaten
    wird der Suchdialog mit Top-5-Vorschlägen geöffnet
```

HITL triggert in zwei Fällen:
1. Grey-Zone: kein Kandidat erreicht Stage-Threshold, aber mindestens einer hat confidence ≥ 0.3
2. Mehrere Kandidaten: ≥2 Kandidaten über Threshold mit Score-Differenz < 0.05

Thresholds werden als Konstanten definiert und können später justiert werden.

### Decision 4: Gemini nur für Nährwert-Anreicherung (synchron)

`enrich_ingredient()` läuft synchron — der User wartet auf die Nährwert-Daten. Bei Gemini-Fehlern: DRAFT ohne Nährwerte (graceful degradation).

Der `GeminiNewIngredient`-Prompt wird aus `url_import_service.py` in einen eigenständigen Service extrahiert:

```python
def enrich_ingredient(name: str, user: User | None = None) -> IngredientNutrition | None:
    """Call Gemini to get nutritional data for a new ingredient.
    
    Returns GeminiNewIngredient with energy_kcal, protein_g, fat_g,
    carbohydrate_g, scores, portion data, etc.
    """
```

Genutzt von:
- `IngredientMatcher.match()` wenn alle Stages fehlschlagen

### Decision 5: Popularität = Recipe-Usage-Count (via Signals)

```sql
-- Einmalige Daten-Migration
ALTER TABLE supply_ingredient ADD COLUMN usage_count integer NOT NULL DEFAULT 0;

UPDATE supply_ingredient si SET usage_count = (
  SELECT COUNT(*) FROM recipe_recipeitem ri
  JOIN supply_portion sp ON ri.portion_id = sp.id
  WHERE sp.ingredient_id = si.id
);
```

Danach hält ein Django Signal (`post_save` / `post_delete` auf `RecipeItem` + `Portion`) den `usage_count` in Echtzeit aktuell.

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
| **Embedding-Qualität** — Erweiterung des Embedding-Textes erfordert Neu-Generierung aller Embeddings | Batch-Update via `batch_update_embeddings(force=True)`; einmalig vor Flow-Migrationen |
| **Gemini-Kosten** — enrich() für jedes neue Ingredient kostet Tokens | Nur im Fallback-Pfad (Stages 1-3 schlagen fehl und User legt neu an); vorhandene Matches kein Gemini-Call |
| **Human-in-the-Loop UX** — Suchdialog könnte Workflow unterbrechen | Bestehender Zutaten-Suchdialog wird wiederverwendet (bekannte UX); Top-5 Vorschläge vorausgefüllt |
| **Parser-Fehlklassifikation** — Regel-basierter Parser könnte "rote Zwiebel" falsch als name="Zwiebel", note="rot" parsen obwohl "rote Zwiebel" eigenes Ingredient ist | Jaccard-Fallback prüft gegen existierende Ingredients; Gemini-Fallback als letzte Instanz |
| **Mehrere Gemini-Calls** — Parser-Fallback + enrich() können zwei Gemini-Calls für dasselbe Ingredient bedeuten | Parser-Fallback triggert nur bei wirklich mehrdeutigen Strings; im Normalfall kein Gemini im Parser nötig |
| **usage_count Signal Overhead** — Jeder RecipeItem Create/Delete triggert DB-Update | Einfaches `F('usage_count') + 1` Update (atomar, kein Race-Condition); Portion-Änderung ebenfalls abgedeckt |

## Migration Plan

1. Daten-Migration: `usage_count`-Feld auf Ingredient + Initialberechnung + Django Signal einrichten
2. Embedding-Text erweitern in `build_ingredient_embedding_text()` + Batch-Regeneration aller Embeddings
3. `IngredientMatcher`-Service + `IngredientNameParser` erstellen (zunächst parallel nutzbar)
4. Gemini-Enrichment extrahieren (`enrich_ingredient()`, synchron)
5. Flow C (AI-Suggest) auf `IngredientMatcher` umstellen
6. Flow B (AI-Create) auf `IngredientMatcher` umstellen
7. Flow A (URL-Import) umstellen — Gemini-Call auf Metadaten + quantity/unit reduzieren (1 Call)
8. Alte Matching-Funktionen entfernen
9. Tests schreiben und Thresholds justieren

Rollback: Ältere Matching-Funktionen bleiben bis Schritt 8 erhalten, einfaches Revert möglich.

## Open Questions

- Welche konkreten Wörter gehören in die Modifikator-Liste des Parsers? Initial 20-30 handgepflegte Einträge. Vorschlag: aus bestehenden Ingredient-Namen extrahieren (Wörter die häufig vorkommen aber selten allein stehen)
- Was passiert wenn ein Ingredient sowohl name="rote Zwiebel" als auch name="Zwiebel" in der DB hat und der Parser "rote Zwiebel" → "Zwiebel" + note="rot" parst? Gewinnt Jaccard-Kandidaten-Ranking (höherer usage_count?)
