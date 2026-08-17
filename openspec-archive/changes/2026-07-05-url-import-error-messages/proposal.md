## Why

Der Rezept-URL-Import (`POST /api/recipes/import-from-url-enhanced/`) maskiert heute jeden Fehler als generisches HTTP 422 „Import fehlgeschlagen: …" (`backend/recipe/api/recipes.py:245-247`). Auf der Live-Version (Cloud Run) treten dadurch nicht unterscheidbare Fehlerursachen auf — blockierte Quellseiten (Bot-Schutz), nicht verfügbarer KI-Dienst (Region/Quota) oder fehlende Rezeptdaten erscheinen alle identisch. Nutzer und Support können nicht erkennen, was tatsächlich schiefging. Dieser Punkt stammt aus dem Stakeholder-Feedback („URL-Import funktioniert auf der Live-Version nicht").

## What Changes

- **Differenzierte Backend-Fehlertypen** — Der Import unterscheidet die Ursachen und liefert maschinenlesbare `error_code`-Werte mit passenden HTTP-Status statt pauschal 422:
  - `IMPORT_SOURCE_UNREACHABLE` — Quellseite nicht ladbar/blockiert/Timeout
  - `IMPORT_AI_UNAVAILABLE` — KI-Dienst nicht verfügbar (Region/Quota/Auth)
  - `IMPORT_NO_RECIPE_FOUND` — Seite ladbar, aber keine verwertbaren Rezeptdaten
- **Keine Fehler-Maskierung** — `GeminiUnavailableError`/`GeminiAuthError` werden nicht mehr in ein generisches 422 verpackt, sondern als jeweils eigener Fehlertyp durchgereicht.
- **Verständliche deutsche Frontend-Texte** — Der Import-Dialog (`RecipeImportPage`) zeigt je `error_code` einen passenden, handlungsleitenden deutschen Text statt der rohen technischen Meldung.

## Capabilities

### New Capabilities
- `recipe-url-import-errors`: Differenzierte, maschinenlesbare Fehlertypen für den Rezept-URL-Import inkl. passender HTTP-Status und deutscher Frontend-Texte.

### Modified Capabilities
<!-- Keine bestehende Capability ändert ihre Spec-Anforderungen; die Fehlerbehandlung wird als neue Capability erfasst. -->
- (keine)

## Impact

- **Backend-Apps**: `recipe` (`api/recipes.py` Import-Endpoint, `services/url_import_service.py`, `services/import_service.py`), `core` (`services/gemini.py` — bestehende `GeminiUnavailableError`/`GeminiAuthError` durchreichen).
- **Frontend-Pages**: `frontend-food` — `RecipeImportPage.tsx`, Hook `api/recipeImport.ts`.
- **Pydantic-Schemas**: Fehler-Response folgt dem bestehenden `error-handling`-Format (`error_code`, `detail`); ggf. Anpassung des Import-Response-/Error-Schemas.
- **Zod-Schemas**: Frontend-Fehlertyp-Mapping in `recipeImport.ts` (kein neues Datenschema, nur Error-Code-Konstanten).
- **Migration**: Keine.
- **Konsistenz**: Fügt sich in die bestehenden `error-handling`-Fehlercodes ein (UPPER_SNAKE_CASE, deutsche `detail`-Texte).
