## Context

Der Rezept-URL-Import läuft über `POST /api/recipes/import-from-url-enhanced/` (`backend/recipe/api/recipes.py:234-247`). Der Endpoint fängt heute **jede** Exception und verpackt sie in ein generisches `HttpError(422, "Import fehlgeschlagen: ...")`. Darunter liegen mindestens drei klar unterscheidbare Fehlerklassen:

- **Quelle nicht ladbar**: `import_service.py:41-45` lädt die Seite via `httpx.get(..., timeout=15, headers={"User-Agent": "...InspiBot/1.0"})`. Rezeptseiten (z.B. Chefkoch) blockieren Datacenter-IPs/Bot-User-Agents → Exception. Lokal (Wohn-IP) funktioniert es, live (Cloud Run) nicht.
- **KI nicht verfügbar**: `core/services/gemini.py` wirft `GeminiUnavailableError`/`GeminiAuthError` (Region/Quota/Auth). Diese sind `HttpError`-Subklassen, werden aber vom generischen `except` überdeckt.
- **Kein Rezept gefunden**: Seite lädt, aber die KI extrahiert keine verwertbaren Rezeptdaten.

Das Projekt hat bereits eine etablierte Fehler-Konvention (`openspec/specs/error-handling/`): einheitliches JSON mit `error_code` (UPPER_SNAKE_CASE) + deutschem `detail`, plus bestehende KI-spezifische Fehlercodes. Diese Konvention wird hier genutzt.

Constraints: Keine Rückwärtskompatibilität nötig. UI-Texte Deutsch, Code Englisch. Keine Klar-Stacktraces an den Client. `uv run` für Python.

## Goals / Non-Goals

**Goals:**
- Der Import liefert unterscheidbare, maschinenlesbare `error_code`-Werte statt pauschal 422.
- `GeminiUnavailableError`/`GeminiAuthError` werden nicht mehr maskiert.
- Das Frontend zeigt je Fehlertyp einen verständlichen, handlungsleitenden deutschen Text.

**Non-Goals:**
- Keine Umgehung von Bot-Schutz (z.B. Proxy/Headless-Browser) — nur sauberes Melden.
- Keine Änderung der eigentlichen Extraktions-/Matching-Logik.
- Kein Retry-Mechanismus (separat denkbar).
- Keine Änderung am Ingredient-Stepper-URL-Import (`/api/ingredients/import-from-url/`).

## Decisions

### D1: Drei Fehlertypen mit eigenen Codes und Status
| Ursache | `error_code` | HTTP-Status |
|---|---|---|
| Quelle nicht ladbar/blockiert/Timeout | `IMPORT_SOURCE_UNREACHABLE` | 422 |
| KI-Dienst nicht verfügbar (Region/Quota/Auth) | `IMPORT_AI_UNAVAILABLE` | 503 |
| Seite ladbar, aber keine Rezeptdaten | `IMPORT_NO_RECIPE_FOUND` | 422 |

- **Warum 503 für KI**: signalisiert „vorübergehend nicht verfügbar" und unterscheidet sich von Eingabe-/Quellenproblemen (422). Konsistent mit bestehenden KI-Fehlercodes im `error-handling`-Spec.
- **Alternative (verworfen)**: alles bei 422 belassen, nur `error_code` variieren — weniger aussagekräftig für Monitoring/Clients.

### D2: Eigene Exception-Typen im Import-Service
`url_import_service.py`/`import_service.py` werfen typisierte Fehler:
- `SourceUnreachableError` beim Fehlschlag von `httpx.get` (ConnectError, Timeout, HTTP 4xx/5xx der Quelle).
- `NoRecipeFoundError`, wenn die KI kein verwertbares Ergebnis liefert.
- `GeminiUnavailableError`/`GeminiAuthError` werden unverändert aus `gemini.py` durchgereicht.

Der API-Endpoint (`recipes.py`) übersetzt diese Exceptions in die `error_code`/Status-Kombinationen aus D1 — **kein** pauschales `except Exception` mehr, sondern gezieltes Mapping; ein verbleibender Catch-All liefert `INTERNAL_ERROR` (500) gemäß `error-handling`.

- **Warum**: trennt Erkennung (Service) von HTTP-Übersetzung (API), testbar pro Schicht.

### D3: Frontend-Mapping von `error_code` zu deutschem Text
`frontend-food/src/api/recipeImport.ts` definiert eine Konstanten-Map `error_code → deutscher Text`; `RecipeImportPage.tsx` zeigt den passenden Text. Fallback-Text für unbekannte Codes.

Beispieltexte:
- `IMPORT_SOURCE_UNREACHABLE`: „Die Seite konnte nicht geladen werden. Manche Rezeptseiten blockieren den automatischen Abruf — bitte kopiere die Zutaten manuell oder versuche eine andere Quelle."
- `IMPORT_AI_UNAVAILABLE`: „Der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut."
- `IMPORT_NO_RECIPE_FOUND`: „Auf der Seite wurden keine Rezeptdaten gefunden. Bitte prüfe den Link oder gib das Rezept manuell ein."

### Betroffene Dateien
- Backend: `backend/recipe/services/import_service.py` (typisierte Fetch-Fehler), `backend/recipe/services/url_import_service.py` (`NoRecipeFoundError`, Durchreichen Gemini-Fehler), `backend/recipe/api/recipes.py` (Exception→`error_code`/Status-Mapping, kein generisches `except`).
- Backend: `backend/core/services/gemini.py` (nur prüfen, dass `GeminiUnavailableError`/`GeminiAuthError` durchgereicht werden).
- Frontend: `frontend-food/src/api/recipeImport.ts` (Error-Code-Konstanten + Mapping), `frontend-food/src/pages/recipes/RecipeImportPage.tsx` (Anzeige).

### API-Änderungen
- `POST /api/recipes/import-from-url-enhanced/` — Fehlerantworten folgen `error-handling`-Format: `{ "error_code": "IMPORT_...", "detail": "<deutscher Text>" }`, Status je D1. Erfolgsfall unverändert.

## Risks / Trade-offs

- **Fehlklassifikation** (z.B. Timeout fälschlich als „kein Rezept") → klare Exception-Grenzen im Service; Tests pro Fehlerklasse.
- **Quelle liefert 200 mit Bot-Wall** (Captcha-Seite statt Inhalt) → erscheint evtl. als `NoRecipeFoundError` statt `SourceUnreachable`; akzeptabel, beide Texte sind handlungsleitend.
- **Status-Wechsel 422→503 für KI** könnte bestehende Frontend-Annahmen brechen → Frontend-Mapping deckt beide ab; keine Rückwärtskompatibilität nötig.

## Migration Plan

1. Backend: Exception-Typen + Endpoint-Mapping, Tests pro Fehlerklasse.
2. Frontend: Error-Code-Map + Anzeige.
3. Keine DB-Migration.
4. Rollback: rein code-seitig revertierbar.

## Open Questions

- Soll bei `IMPORT_SOURCE_UNREACHABLE` zusätzlich ein „manuell einfügen"-Flow prominenter angeboten werden? (Außerhalb dieses Scopes, aber sinnvoll als Folge-Change.)
