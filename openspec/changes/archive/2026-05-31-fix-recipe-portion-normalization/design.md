## Context

Rezepte in der Prod-DB sollen immer `servings=1` haben, d.h. alle `RecipeItem.quantity`-Werte sind pro 1 Portion. Aktuell haben 73 von 189 Rezepten `servings > 1`. Davon sind 53 bereits normalisiert (Mengen pro Portion), 18 haben Gesamtmengen gespeichert, und 2 haben kaputte Daten durch falsches Portion-Matching beim Import.

Der Shopping-Service (`supply/services/shopping_service.py:98`) multipliziert `ri.quantity * portion.weight_g * factor * scaling` ohne durch `recipe.servings` zu teilen. Das produziert falsche Einkaufsmengen wenn `servings > 1`.

Der Import-Flow (`CreateRecipePage.tsx`) erlaubt zwar Servings-Editing, erzwingt aber keine Normalisierung auf 1 Portion vor dem Speichern.

Betroffene Dateien:
- `backend/supply/services/shopping_service.py` — Shopping-Berechnung
- `backend/shopping/api.py` — From-recipe Shopping-Endpoint
- `backend/recipe/api/` — Recipe Create/Update API
- `backend/recipe/schemas/` — Pydantic Schemas
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx` — Import-Stepper
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` — Save-Normalisierung

## Goals / Non-Goals

**Goals:**
- Alle Rezepte in der DB haben `servings=1`, Mengen pro 1 Portion
- Shopping-Service ist defensiv gegen `servings != 1`
- Import-Flow normalisiert automatisch auf 1 Portion mit User-Bestätigung
- Backend-API validiert `servings=1` bei Create/Update

**Non-Goals:**
- Rezepte für variable Portionsgrößen unterstützen (bleibt immer 1)
- Änderung des `servings`-Felds im Model (bleibt, wird aber immer 1 sein)
- Änderung der Frontend-Skalierungslogik in `IngredientList` (funktioniert korrekt)

## Decisions

### 1. Management Command statt Migration für Daten-Korrektur

**Entscheidung**: Management Command `normalize_recipe_servings` statt Django Data Migration.

**Rationale**: Die Normalisierung erfordert Heuristiken (erkennen ob Mengen schon pro Portion sind) und ggf. Gemini AI für die 2 kaputten Rezepte. Migrations sollten deterministisch sein. Ein Command kann mit `--dry-run` getestet und wiederholt ausgeführt werden.

**Alternativen verworfen**: Data Migration (nicht reproduzierbar, keine Dry-Run-Option), manuelles SQL (fehleranfällig).

### 2. Drei-Kategorien-Heuristik für Normalisierung

**Entscheidung**: Rezepte mit `servings > 1` werden in drei Kategorien eingeteilt:

| Kategorie | Heuristik | Aktion |
|-----------|-----------|--------|
| Bereits normalisiert | max(total_weight) < 200g UND avg(per_person_weight) < 30g | Nur `servings=1` setzen |
| Gesamtmengen | per-person Gewichte 10-500g | Alle `quantity` durch `servings` teilen, dann `servings=1` |
| Kaputte Daten | per-person > 500g | AI-Schätzung oder manuelles Flagging |

**Rationale**: Die Prod-Analyse zeigt klar trennbare Gruppen: 53/18/2 Rezepte.

### 3. Import-Stepper: Portionsvalidierung als eigener Schritt

**Entscheidung**: Im `CreateRecipePage`-Import-Flow wird nach dem URL-Import ein Validierungsschritt eingefügt, der die erkannten Portionsmengen anzeigt und den User fragt: "Für wie viele Portionen ist dieses Rezept?" Falls `servings > 1`, werden die Mengen automatisch durch `servings` geteilt vor dem Speichern.

**Rationale**: Das Quell-Rezept hat oft `servings=4` oder `servings=6`. Der User muss bestätigen, dass die Normalisierung korrekt ist.

### 4. Backend-Validierung erzwingt servings=1

**Entscheidung**: Recipe Create/Update API setzt `servings=1` serverseitig, unabhängig vom übergebenen Wert.

**Rationale**: Defense in depth. Selbst wenn Frontend-Bugs `servings > 1` senden, bleibt die DB konsistent.

### 5. Shopping-Service: defensiv durch recipe.servings teilen

**Entscheidung**: `shopping_service.py:98` wird geändert zu `weight_g = ri.quantity * portion.weight_g * factor * scaling / recipe.servings`. Analog für `shopping/api.py`.

**Rationale**: Sicherheitsnetz falls ein Rezept doch `servings > 1` hat. Die Kostenberechnung in `planner/api/meal_plan.py:636` macht es bereits so.

## Risks / Trade-offs

- **[Heuristik-Fehler]** Die Drei-Kategorien-Heuristik könnte ein Rezept falsch klassifizieren → Mitigation: `--dry-run` Mode, manuelle Überprüfung der Ausgabe vor Ausführung auf Prod
- **[Cached Values]** Nach Quantity-Änderung müssen cached Nährwerte und Preise neu berechnet werden → Mitigation: `recalculate_recipe_cache()` nach jeder Änderung aufrufen
- **[Import-AI-Fehler]** Gemini könnte die Original-Servings falsch erkennen → Mitigation: User bestätigt im Stepper, nicht blind übernehmen

## Migration Plan

1. Management Command lokal mit `--dry-run` testen
2. Command auf Prod ausführen via `cloud-sql-proxy`
3. Backend-API deployen (servings=1 Validierung + Shopping-Fix)
4. Frontend-Food deployen (Import-Stepper)

**Rollback**: Die Quantity-Werte können nicht einfach zurückgerechnet werden. Daher vor der Prod-Migration ein DB-Backup anlegen.
