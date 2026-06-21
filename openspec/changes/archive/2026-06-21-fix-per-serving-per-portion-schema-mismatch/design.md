## Context

Im Zuge des `servings→portions`-Renames (Change `add-semantic-color-tokens`) wurden Model-Felder, Pydantic-Schemas und Zod-Schemas umbenannt. Dabei ist ein Sync-Lücke entstanden:

- **Backend Pydantic Schema** (`recipe/schemas/nutrition.py`): `RecipeNutritionBreakdownOut` hat noch `per_serving_*`-Feldnamen
- **Backend API** (`recipe/api/nutrition.py`): Response-Dict verwendet noch `per_serving_*`-Keys
- **Frontend Zod Schema** (`schemas/recipe.ts`): Wurde bereits auf `per_portion_*` umgestellt
- **Frontend Code** (`RecipeDetailPage.tsx`): Referenziert `nb.per_serving_*` (18 Stellen)

Der Zod-`parse()` schlägt fehl, weil die API `per_serving_*` liefert, das Schema aber `per_portion_*` erwartet. `nutritionBreakdown` bleibt `undefined`, alle 4 Analyse-Accordions werden unsichtbar.

## Goals / Non-Goals

**Goals:**
- `per_serving_*` → `per_portion_*` im Backend-Pydantic-Schema (5 Felder)
- `per_serving_*` → `per_portion_*` im Backend-API-Response-Dict (5 Keys)
- `nb.per_serving_*` → `nb.per_portion_*` im Frontend (18 Referenzen)
- Frontend-Zod-Schema bereits korrekt, nur verifizieren
- Accordions funktionieren wieder (Zod-Validierung erfolgreich)

**Non-Goals:**
- Kein DB-Migration (reine API-Response-Änderung)
- Kein Umbau der Analyse-Logik
- Kein Spec-Change (keine neuen Fähigkeiten)

## Decisions

### 1. `per_serving_*` im Backend umbenennen, nicht im Zod zurücksetzen
   Der `servings→portions`-Rename ist der gewünschte Endzustand. Statt das Zod-Schema auf den alten Namen zurückzusetzen, wird das Backend nachgezogen. Das hält den Schema-Sync korrekt.

### 2. Keine Specs notwendig
   Es ändern sich keine Anforderungen oder Fähigkeiten – nur interne Feldnamen auf API-Ebene.

## Risiken / Trade-offs

- **Vergessene Referenzen**: Falls eine `nb.per_serving_*`-Referenz im Frontend übersehen wird → TypeScript-Compiler findet sie (strict mode, keine impliziten `any`). ✅
- **Andere Frontend-Komponenten**: Komponenten ausserhalb von RecipeDetailPage (z.B. RecipeSidebar, RecipeCookingMode) könnten auch `per_serving_*` nutzen → müssen durch `grep` gefunden werden. → Siehe Tasks.
- **Backend-Client-Breakage**: Falls externe Clients die `per_serving_*`-Keys parsen, brechen sie durch den Rename. Da das Projekt keine öffentliche API hat und keine Rückwärtskompatibilität erforderlich ist → akzeptabel.
