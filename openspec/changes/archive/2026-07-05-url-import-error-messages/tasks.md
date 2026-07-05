## 1. Backend-Fehlertypen

- [x] 1.1 Typisierte Exceptions definieren: `SourceUnreachableError`, `NoRecipeFoundError` (in `recipe/services/`)
- [x] 1.2 `import_service.py` (`httpx.get`): Verbindungsfehler/Timeout/HTTP-Fehler der Quelle als `SourceUnreachableError` werfen
- [x] 1.3 `url_import_service.py`: leeres/unbrauchbares KI-Ergebnis als `NoRecipeFoundError` werfen; `GeminiUnavailableError`/`GeminiAuthError` durchreichen (nicht fangen)
- [x] 1.4 Prüfen, dass `core/services/gemini.py` die Gemini-Fehler unverändert nach oben gibt

## 2. API-Endpoint-Mapping

- [x] 2.1 In `recipe/api/recipes.py` (`import-from-url-enhanced`) das generische `except Exception` entfernen
- [x] 2.2 Gezieltes Mapping: `SourceUnreachableError` → `IMPORT_SOURCE_UNREACHABLE` (422), `GeminiUnavailableError`/`GeminiAuthError` → `IMPORT_AI_UNAVAILABLE` (503), `NoRecipeFoundError` → `IMPORT_NO_RECIPE_FOUND` (422)
- [x] 2.3 Catch-All → `INTERNAL_ERROR` (500) ohne Stacktrace-Leak, deutscher Text
- [x] 2.4 Antwortformat an `error-handling`-Spec angleichen (`{ error_code, detail }`)

## 3. Frontend

- [x] 3.1 `frontend-food/src/api/recipeImport.ts`: Error-Code-Konstanten + Map `error_code → deutscher Text` + Fallback
- [x] 3.2 Passenden Text je `error_code` anzeigen, Fallback für unbekannte Codes (Anzeige erfolgt in `CreateRecipePage.tsx`, dem tatsächlichen Aufrufer von `import-from-url-enhanced`; `RecipeImportPage.tsx` nutzt weiterhin den separaten `import-from-url`-Endpoint und war nicht betroffen)
- [x] 3.3 Sicherstellen, dass der Nutzer im Dialog bleibt und Quelle korrigieren/abbrechen kann

## 4. Tests

- [x] 4.1 Backend: Quelle nicht ladbar → `IMPORT_SOURCE_UNREACHABLE` (422)
- [x] 4.2 Backend: Gemini nicht verfügbar → `IMPORT_AI_UNAVAILABLE` (503), nicht maskiert
- [x] 4.3 Backend: kein Rezept gefunden → `IMPORT_NO_RECIPE_FOUND` (422)
- [x] 4.4 Backend: unerwarteter Fehler → `INTERNAL_ERROR` (500) ohne Detail-Leak
- [x] 4.5 Backend: unauthentifiziert → 403; Erfolgsfall → 200

## 5. Abschluss

- [x] 5.1 Keine `print`/`console.log`; deutsche UI-Texte, englischer Code
- [ ] 5.2 Manuell mit blockierter Quelle (z.B. Chefkoch) gegen Live-ähnliche Umgebung verifizieren
