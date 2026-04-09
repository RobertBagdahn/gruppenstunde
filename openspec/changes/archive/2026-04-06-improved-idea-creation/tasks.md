## 1. Backend: Custom Exceptions

- [x] 1.1 Erstelle `AiTimeoutError`, `AiUnavailableError`, `AiInvalidResponseError` Exception-Klassen in `backend/idea/services/ai_service.py`
- [x] 1.2 Definiere deutsche Fehlermeldungen als Klassenvariablen (z.B. `AiTimeoutError.detail = "Die KI-Verarbeitung hat zu lange gedauert..."`)

## 2. Backend: Gemini SDK Timeout und Bildgenerierung entkoppeln

- [x] 2.1 Definiere Konstanten `AI_REFURBISH_TIMEOUT_SECONDS = 30` und `AI_IMAGE_TIMEOUT_SECONDS = 90` in `backend/idea/services/ai_service.py`
- [x] 2.2 Setze `timeout=AI_REFURBISH_TIMEOUT_SECONDS` bei allen `client.models.generate_content()`-Aufrufen in `refurbish()` und `suggest_tags()`
- [x] 2.3 Setze `timeout=AI_IMAGE_TIMEOUT_SECONDS` bei `generate_content()`-Aufrufen in `generate_images()`
- [x] 2.4 Fange `google.api_core.exceptions.DeadlineExceeded` und wirf `AiTimeoutError`
- [x] 2.5 Fange `google.api_core.exceptions.ServiceUnavailable` und ähnliche Netzwerk-Exceptions, wirf `AiUnavailableError`
- [x] 2.6 Fange `pydantic.ValidationError` bei der Gemini-Response-Validierung, wirf `AiInvalidResponseError`
- [x] 2.7 Entferne den `generate_images()`-Aufruf aus `ai_service.refurbish()`. Der `image_prompt` wird weiterhin generiert, aber keine Bilder.
- [x] 2.8 Füge Zeitmessung hinzu (`time.monotonic()` vor/nach dem Call), speichere als `processing_time_seconds`

## 3. Backend: Pydantic Schemas

- [x] 3.1 Erweitere `AiRefurbishOut` in `backend/idea/schemas.py` um optionales Feld `processing_time_seconds: float = 0`
- [x] 3.2 Erstelle `AiErrorOut` Schema mit Feldern `detail: str` und `error_code: str`

## 4. Backend: API-Endpunkte

- [x] 4.1 Refactore `POST /api/ai/refurbish/`-Endpunkt in `backend/idea/api.py`: ersetze generischen `except Exception` durch spezifische Exception-Handler für `AiTimeoutError` (504), `AiUnavailableError` (503), `AiInvalidResponseError` (502), sonstige (500)
- [x] 4.2 Stelle sicher, dass jede Fehler-Response das Format `{"detail": "...", "error_code": "..."}` hat
- [x] 4.3 Füge `processing_time_seconds` zur erfolgreichen Refurbish-Response hinzu
- [x] 4.4 Wende analoges Error-Handling auf `POST /api/ai/generate-image/`-Endpunkt an

## 5. Frontend: Zod Schemas (Schema-Sync)

- [x] 5.1 Erweitere `AiRefurbishSchema` in `frontend/src/schemas/idea.ts` um `processing_time_seconds: z.number().optional()`
- [x] 5.2 Erstelle `AiErrorSchema` mit `detail: z.string()` und `error_code: z.string()`

## 6. Frontend: API-Hooks

- [x] 6.1 Erweitere `useRefurbish` Mutation in `frontend/src/api/ai.ts` um `AbortController`-Support: akzeptiere `signal` Parameter und reiche ihn an `fetch()` weiter
- [x] 6.2 Erweitere Fehler-Extraktion in `useRefurbish`: parse `error_code` aus der Response und speichere im Error-Objekt

## 7. Frontend: NewIdeaPage — Zwei-Wege-Auswahl

- [x] 7.1 Refactore Step 0 in `frontend/src/pages/NewIdeaPage.tsx`: zeige zwei Buttons "Mit KI erstellen" (Primary) und "Manuell erstellen" (Secondary/Outline)
- [x] 7.2 Implementiere "Manuell erstellen": springt direkt zu Step 1 mit leeren Feldern und Standardwerten
- [x] 7.3 Implementiere "Mit KI erstellen": zeigt das bestehende Freitext-Eingabefeld

## 8. Frontend: NewIdeaPage — Abbrechbarer KI-Call

- [x] 8.1 Erstelle `AbortController`-Instanz beim Start des Refurbish-Calls, übergebe `signal` an `useRefurbish`
- [x] 8.2 Zeige "Abbrechen"-Button während der KI-Verarbeitung (neben dem Spinner)
- [x] 8.3 Bei Klick auf "Abbrechen": rufe `abortController.abort()` auf, wechsle zurück zu Step 0, behalte Freitext, zeige Info-Toast "KI-Verarbeitung abgebrochen"
- [x] 8.4 Zeige nach Abbruch zwei Optionen: "Erneut versuchen" und "Manuell erstellen"

## 9. Frontend: NewIdeaPage — Wartezeit-Anzeige und Fehler

- [x] 9.1 Zeige während des Spinners die geschätzte Wartezeit: "KI arbeitet... (ca. 10-20 Sekunden)" als hardcoded UX-Hint
- [x] 9.2 Bei KI-Fehler (502/503/504/500): zeige `detail`-Meldung aus der Backend-Response
- [x] 9.3 Zeige zwei Buttons bei Fehler: "Erneut versuchen" (wiederholt Refurbish-Call) und "Manuell erstellen" (wechselt zu Step 1 mit leeren Feldern)
- [x] 9.4 Stelle sicher, dass der eingegebene Freitext bei Fehlern erhalten bleibt

## 10. Frontend: Bildgenerierung in Step 2 anpassen

- [x] 10.1 Entferne automatische Bild-Übernahme aus dem Refurbish-Ergebnis (image_url/image_urls werden ignoriert wenn null/leer)
- [x] 10.2 Speichere `image_prompt` aus Refurbish-Response im State für spätere Verwendung im Bild-Dialog
- [x] 10.3 Stelle sicher, dass der bestehende "Bilder generieren"-Dialog in Step 2 mit dem gespeicherten `image_prompt` funktioniert

## 11. Tests

- [x] 11.1 Backend: pytest-Test für Refurbish-Timeout (Mock Gemini-Call mit `DeadlineExceeded`, erwarte 504 mit `error_code: "AI_TIMEOUT"`)
- [x] 11.2 Backend: pytest-Test für Refurbish mit unverfügbarem Gemini (erwarte 503 mit `error_code: "AI_UNAVAILABLE"`)
- [x] 11.3 Backend: pytest-Test für Refurbish mit ungültiger Gemini-Response (erwarte 502 mit `error_code: "AI_INVALID_RESPONSE"`)
- [x] 11.4 Backend: pytest-Test dass Refurbish KEINE Bilder mehr generiert (kein `generate_images()`-Aufruf)
- [x] 11.5 Backend: pytest-Test dass `processing_time_seconds` in der Refurbish-Response enthalten ist
