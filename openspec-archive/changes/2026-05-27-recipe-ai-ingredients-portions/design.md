## Context

Rezepte werden im 3-Schritt-Wizard erstellt. In Schritt 2 ("Bearbeiten") müssen Nutzer manuell Zutaten suchen und RecipeItems anlegen. Das Projekt hat bereits:
- `IngredientAIService` in `backend/supply/services/ingredient_ai_service.py` (Gemini structured output pattern)
- `normalize_recipe_portions` Management Command (Gemini für Mengen-Schätzung)
- ~2000+ Ingredients in der DB mit Portionen

Der neue Service nutzt dasselbe Pattern (single Gemini Flash calls mit Pydantic response_schema).

## Goals / Non-Goals

**Goals:**
- KI-gestütztes Vorschlagen aller Zutaten für ein Rezept in einem Call
- Automatisches Matching gegen existierende Ingredients (Fuzzy über Name/Alias)
- Fehlende Ingredients automatisch anlegen mit KI-geschätzten Basiswerten
- Passende Portion pro Zutat auswählen oder neue erstellen
- Realistische Mengen (quantity) pro Person schätzen

**Non-Goals:**
- Vollständige Nährwert-Schätzung für neue Ingredients (nur Basis-Felder, Rest via existierendem `IngredientAIService`)
- Frontend-UI für Zutat-für-Zutat Bestätigung (alles auf einmal einfügen)
- Rezept-Beschreibung durch KI generieren lassen

## Decisions

### 1. Drei sequentielle Gemini Calls statt einem großen

**Entscheidung**: Drei separate Calls mit jeweils eigenem Structured Output Schema:
1. **Call 1 — Zutaten identifizieren**: Gibt Liste von Zutatennamen + geschätzte Gramm-Menge pro Person zurück
2. **Call 2 — Ingredient Matching**: Backend matched Namen gegen DB (kein Gemini Call, reine DB-Logik mit `icontains` + `IngredientAlias`)
3. **Call 3 — Portions-Zuordnung**: Für gematchte Ingredients die beste Portion + Menge bestimmen (DB-Lookup, kein extra Gemini Call)

**Rationale**: Ein einzelner Call mit allen Informationen (Ingredient-IDs, Portions-IDs, Mengen) wäre unzuverlässig, da Gemini die DB-IDs nicht kennt. Stattdessen: KI liefert Freitext-Namen + Gramm, Backend übernimmt das Matching.

**Alternative verworfen**: Alle DB-Ingredients im Prompt mitgeben → Token-Limit bei 2000+ Ingredients.

### 2. Fehlende Ingredients automatisch anlegen

**Entscheidung**: Wenn kein Match gefunden wird, neues Ingredient mit `status="ai_generated"` anlegen. Nur `name` und `slug` werden gesetzt. Nährwerte werden NICHT sofort geschätzt (zu viele Calls).

**Rationale**: Nutzer soll Rezept sofort fertigstellen können. Nährwerte können später via existierendem `IngredientAIService` nachgepflegt werden.

### 3. Portion-Auswahl Logik

**Entscheidung**: Für jedes Ingredient:
1. Prüfe ob eine `is_default=True` Portion existiert → nutze diese
2. Sonst: Nimm Portion mit `priority=1` oder höchstem `rank`
3. Wenn keine Portion existiert: Erstelle eine "Gramm"-Portion (`weight_g = 1.0`, `measuring_unit = "g"`)

Quantity wird dann berechnet: `ai_gramm / portion.weight_g`

### 4. API-Design

**Entscheidung**: `POST /api/recipes/{recipe_id}/ai-suggest-ingredients/`
- Liest Rezept-Titel, Beschreibung, Typ aus der DB
- Gibt Liste von vorgeschlagenen RecipeItems zurück (noch NICHT gespeichert)
- Zweiter Call `POST /api/recipes/{recipe_id}/ai-apply-ingredients/` speichert die Items

**Rationale**: Nutzer soll Vorschläge sehen bevor sie angewandt werden.

**Betroffene Dateien:**
- `backend/recipe/services/ai_ingredients_service.py` (neu)
- `backend/recipe/api/items.py` (neue Endpunkte)
- `backend/recipe/schemas/items.py` (neue Response-Schemas)
- `frontend/src/hooks/useRecipeAiIngredients.ts` (neuer Hook)
- `frontend/src/components/recipe/AiIngredientsButton.tsx` (neuer Button)

## Risks / Trade-offs

- **[Halluzination]** Gemini könnte Zutaten vorschlagen die zum Rezept nicht passen → Mitigation: Nutzer sieht Vorschau vor dem Speichern
- **[Matching-Qualität]** Einfaches `icontains` + Alias reicht evtl. nicht → Mitigation: Fuzzy-Match mit SequenceMatcher als Fallback
- **[Kosten]** Ein Gemini Call pro Rezept-Erstellung → Mitigation: Nur auf expliziten Button-Klick, kein Auto-Trigger
- **[Neue Ingredients ohne Nährwerte]** Cached-Werte im Rezept bleiben unvollständig → Mitigation: Akzeptabel, Nährwerte können nachgepflegt werden
