## Context

Der Enhanced-URL-Import (`POST /api/recipes/import-from-url-enhanced/`) nutzt Gemini um Zutaten zu matchen und ggf. neue anzulegen. Das Ergebnis enthält `ingredient_id` + `measuring_unit_id` pro Item, aber keine `portion_id`. Der Save-Endpoint (`POST /api/recipes/{id}/recipe-items/`) erwartet jedoch `portion_id`. Zusätzlich werden Meta-Felder (summary, difficulty, etc.) nicht aus dem Rezepttext extrahiert.

Aktueller Gemini-Prompt in `url_import_service.py` liefert nur Zutaten-Matching. Die DB hat 4 ScoutLevels und 14 Tags.

## Goals / Non-Goals

**Goals:**
- Bug fixen: Zutaten-Save funktioniert (portion_id statt ingredient_id)
- Alle Rezept-Metafelder per Gemini automatisch befüllen
- Neue Zutaten in der Vorschau als "NEU" markieren
- Lesbare Namen in der Vorschau

**Non-Goals:**
- Bild-Import von Chefkoch (Copyright-Probleme)
- Änderung am RecipeItem-Create-Endpoint selbst
- Neue DB-Migrations

## Decisions

### 1. Portion-Auflösung im Import-Service (nicht im Frontend)

**Entscheidung**: `_build_recipe_items()` löst für jedes Item die passende `Portion` auf oder erstellt eine neue.

**Warum**: Der Service hat bereits `ingredient_id` + `measuring_unit_id` aufgelöst. Die Portion-Suche gehört in dieselbe Transaktion wie die Ingredient-Erstellung. Das Frontend soll nur noch `portion_id` erhalten und weiterreichen.

**Lookup-Strategie**:
1. `Portion.objects.filter(ingredient_id=X, measuring_unit_id=Y).first()`
2. Nicht gefunden → Portion erstellen mit `weight_g` aus Gemini-Output

**Alternative verworfen**: Frontend macht separaten API-Call zum Portion-Lookup — zu komplex, Race Conditions möglich.

### 2. Gemini-Prompt um estimated_portion_weight_g erweitern

**Entscheidung**: Für JEDES Item (neu und bestehend) liefert Gemini ein `estimated_portion_weight_g`. Damit können fehlende Portionen sinnvoll erstellt werden.

**Warum**: Bei "1 EL Olivenöl" braucht man weight_g≈10, bei "1 Stück Zwiebel" weight_g≈120. Nur Gemini kann das kontextbezogen schätzen.

### 3. Meta-Felder im selben Gemini-Call extrahieren

**Entscheidung**: Den bestehenden `_call_gemini_for_matching()` Prompt um die Meta-Felder erweitern (summary, recipe_type, difficulty, execution_time, preparation_time, costs_rating, scout_level_ids, tag_ids). Kein separater API-Call.

**Warum**: Ein Call statt zwei spart Latenz und Kosten. Der Rezepttext ist ohnehin schon im Prompt.

**Structured Output erweitern** (`GeminiRecipeExtraction`):
```python
summary: str  # 1-2 Sätze
recipe_type: str  # breakfast|warm_meal|cold_meal|dessert|side_dish|snack|drink|simple_meal
difficulty: str  # easy|medium|hard
execution_time: str  # less_30|30_60|60_90|more_90
preparation_time: str  # none|less_15|15_30|30_60|more_60
costs_rating: str  # free|less_1|1_2|more_2
scout_level_ids: list[int]  # aus DB-Liste
tag_ids: list[int]  # aus DB-Liste
```

### 4. ScoutLevels und Tags aus DB im Prompt

**Entscheidung**: Vor dem Gemini-Call alle ScoutLevels und Tags laden und als JSON-Liste im Prompt mitgeben. Gemini wählt passende IDs aus.

**Warum**: Nur 4+14 Einträge — vernachlässigbarer Prompt-Overhead (~100 Token). Gemini kann so exakte IDs zurückgeben.

### 5. Chefkoch-Zeiten direkt mappen (wenn vorhanden)

**Entscheidung**: JSON-LD `prepTime`/`cookTime` (ISO 8601 Duration) werden geparst und in die Choice-Buckets gemappt. Gemini-Schätzung nur als Fallback wenn keine strukturierten Zeiten vorhanden.

**Warum**: Strukturierte Daten sind zuverlässiger als KI-Schätzungen.

### 6. Frontend: portion_id durchreichen

**Entscheidung**: `RecipeItemDraftSchema` (Zod) bekommt `portion_id`. `CreateRecipePage` sendet `portion_id` im POST-Body.

**Warum**: Minimaler Frontend-Change, Backend hat die Arbeit schon erledigt.

## Risks / Trade-offs

- **[Risk] Keine Portion existiert und Gemini schätzt weight_g falsch** → Mitigation: User kann Portionen nachträglich editieren. Geschätzte Portionen könnten mit `is_estimated=True` markiert werden (optional, nicht in Scope).
- **[Risk] Gemini-Output enthält ungültige Choice-Werte** → Mitigation: Backend validiert gegen erlaubte Choices, fällt auf Defaults zurück.
- **[Risk] Prompt wird zu lang mit Tags/ScoutLevels** → Mitigation: Nur 18 Einträge, ~100 Token — irrelevant.
- **[Trade-off] Ein großer Gemini-Call vs. zwei kleine** → Akzeptiert: Ein Call ist schneller, aber bei Fehler verliert man alles. Retry-Logik existiert bereits.
