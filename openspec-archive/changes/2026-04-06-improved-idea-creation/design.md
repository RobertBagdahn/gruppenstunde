## Context

Der Idea-Erstellungsfluss auf `/create/idea` und `/create/knowledge` nutzt aktuell einen 3-Schritt-Wizard (Beschreiben -> Bearbeiten -> Vorschau & Speichern). Schritt 1 erzwingt einen KI-Call (`POST /api/ai/refurbish/`), der Freitext per Gemini 3.1 Flash-Lite in eine strukturierte Idea umwandelt. Dieser Call ist synchron, hat keinen Timeout, ist nicht abbrechbar und gibt dem Benutzer keine Zeitschätzung.

**Betroffene Dateien:**
- `backend/idea/api.py` — AI-Endpunkte (Zeilen 583-645)
- `backend/idea/schemas.py` — Pydantic-Schemas für AI-Requests/Responses
- `backend/idea/services/ai_service.py` — Gemini-Service (refurbish, suggest_tags, generate_images)
- `frontend/src/pages/NewIdeaPage.tsx` — 3-Schritt-Wizard (863 Zeilen)
- `frontend/src/api/ai.ts` — TanStack Query Mutations für AI-Calls
- `frontend/src/schemas/idea.ts` — Zod-Schemas

**Aktuelle Schwachstellen:**
- `ai_service.refurbish()` kettet drei Operationen: Textgenerierung + Tag-Vorschläge + bis zu 4 Bildgenerierungen. Die Bildgenerierung macht 60-70% der Laufzeit aus, ist aber erst in Step 2 relevant.
- Fehler werden generisch als HTTP 500 mit `{"detail": str(exc)}` zurückgegeben.
- Das Frontend nutzt `fetch()` ohne `AbortController`.
- Kein Timeout auf Gemini SDK-Ebene — ein hängender Call blockiert den Worker-Thread unbegrenzt.

## Goals / Non-Goals

**Goals:**
- Benutzer können zwischen KI-gestützter und manueller Erstellung wählen
- KI-Calls haben einen Timeout direkt auf Gemini SDK-Ebene (30s für Refurbish, 90s für Bilder)
- Benutzer können laufende KI-Calls abbrechen
- Benutzer sehen eine geschätzte Wartezeit während des KI-Calls
- Bildgenerierung wird aus dem Refurbish-Call entfernt und nur manuell per Button in Step 2 ausgelöst
- Spezifische Fehlercodes und deutsche Fehlermeldungen

**Non-Goals:**
- Änderung der KI-Prompts oder des Gemini-Modells
- Streaming/SSE für den Refurbish-Endpunkt (bleibt synchron)
- Rate-Limiting (separat geplant)
- Eigener Config-Endpunkt (Zeitschätzung ist ein UX-Hint, keine Geschäftslogik)

## Decisions

### 1. Timeout-Strategie: Gemini SDK `timeout`-Parameter

**Entscheidung:** Den Timeout direkt auf der Gemini SDK-Ebene setzen, indem der `timeout`-Parameter bei `client.models.generate_content()` genutzt wird.

**Alternativen (verworfen):**
- `concurrent.futures.ThreadPoolExecutor`: Thread läuft nach Timeout weiter (verwaister Thread), blockiert Cloud-Run-Instanz beim Runterskalieren. Bei uvicorn problematisch.
- `asyncio.wait_for`: Würde async-Refactoring des gesamten AI-Service erfordern.
- `signal.alarm`: Nur auf Unix, nicht threadsafe, kann uvicorn-Signalhandler stören.

**Warum Gemini SDK:** Der Timeout beendet den HTTP-Request zur Gemini API sauber auf Socket-Ebene. Kein verwaister Thread, keine Ressourcen-Leaks. Die `google-genai`-Library unterstützt `timeout` als Parameter in `generate_content()` und wirft `google.api_core.exceptions.DeadlineExceeded`, das wir als `AiTimeoutError` fangen.

**Werte:**
- Refurbish (Text + Tags): `AI_REFURBISH_TIMEOUT_SECONDS = 30`
- Bildgenerierung (pro Bild): `AI_IMAGE_TIMEOUT_SECONDS = 90`

### 2. Bildgenerierung aus Refurbish entfernen

**Entscheidung:** `ai_service.refurbish()` generiert KEINE Bilder mehr. Bilder werden nur noch manuell per Button in Step 2 über den bestehenden `POST /api/ai/generate-image/`-Endpunkt ausgelöst.

**Vorher:**
```
refurbish() = Text + Tags + 4× Bilder  (~30-55s)
```

**Nachher:**
```
refurbish() = Text + Tags              (~8-15s)
generate_images() = 4× Bilder          (separat, manuell, ~20-40s)
```

**Warum:**
- Bilder sind 60-70% der Laufzeit, werden aber erst in Step 2 benötigt
- Benutzer kommt in ~10s zu Step 1 statt in ~50s
- Wenn Benutzer den Wizard abbricht, wurden keine unnötigen Bilder generiert
- Der `generate-image`-Endpunkt existiert bereits und funktioniert
- Der `image_prompt` wird weiterhin von Refurbish generiert und im Frontend gespeichert

**Entfernte Felder aus `AiRefurbishOut`:**
- `image_url` — wird nicht mehr vom Refurbish-Call befüllt (bleibt als optionales Feld mit `null`)
- `image_urls` — wird nicht mehr befüllt (bleibt als leere Liste)

### 3. Kein Config-Endpunkt — Zeitschätzung als UX-Hint

**Entscheidung:** Kein `/api/ai/config/`-Endpunkt. Die Zeitschätzung "ca. 10-20 Sekunden" wird als UX-Hint im Frontend hardcoded.

**Vorher (verworfen):**
```
GET /api/ai/config/ → { refurbish_timeout_seconds: 60, ... }
```

**Nachher:**
```
Frontend zeigt: "KI arbeitet... (ca. 10-20 Sekunden)"
Kein zusätzlicher HTTP-Request.
```

**Warum:**
- "10-20 Sekunden" ist eine UX-Schätzung, keine Geschäftslogik
- Die Werte ändern sich praktisch nie
- Ein extra HTTP-Request für statische Konstanten ist Over-Engineering
- Der Refurbish-Call ist jetzt deutlich schneller (kein Bilder-Overhead), daher ist die Schätzung zuverlässiger
- Bei Timeout-Änderung im Backend muss nur der UX-Text im Frontend angepasst werden — das ist akzeptabel

### 4. Custom Exceptions statt generischer HTTP-500

**Entscheidung:** Drei spezifische Exception-Klassen im AI-Service, die im API-Layer auf HTTP-Codes gemappt werden.

```python
class AiTimeoutError(Exception):
    """Gemini-Call hat den Timeout überschritten."""

class AiUnavailableError(Exception):
    """Gemini-API ist nicht erreichbar."""

class AiInvalidResponseError(Exception):
    """Gemini-Antwort konnte nicht validiert werden."""
```

**Mapping:**
| Exception | HTTP-Status | error_code |
|-----------|-------------|------------|
| `AiTimeoutError` | 504 | `AI_TIMEOUT` |
| `AiUnavailableError` | 503 | `AI_UNAVAILABLE` |
| `AiInvalidResponseError` | 502 | `AI_INVALID_RESPONSE` |
| Sonstige `Exception` | 500 | `AI_INTERNAL_ERROR` |

**Fehler-Response-Format:**
```json
{
  "detail": "Deutsche Fehlermeldung",
  "error_code": "AI_TIMEOUT"
}
```

### 5. Abbruch-Strategie: AbortController im Frontend

**Entscheidung:** Das Frontend nutzt `AbortController.abort()`, um den HTTP-Request abzubrechen. Da der Timeout jetzt auf Gemini SDK-Ebene liegt, gibt es keine verwaisten Threads — der Gemini-Call endet spätestens nach 30s.

### 6. Zwei-Wege-Auswahl: Buttons im Step 0

**Entscheidung:** Step 0 des Wizards zeigt zwei primäre Aktionen:
- **"Mit KI erstellen"** (Primary-Button) — zeigt das Freitext-Eingabefeld
- **"Manuell erstellen"** (Secondary/Outline-Button) — springt direkt zu Step 1 mit leeren Feldern

**Kein separater Route-Parameter.** Der Zustand wird lokal im Component gehalten.

### 7. Verarbeitungszeit in Response: `processing_time_seconds`

**Entscheidung:** Die Refurbish-Response wird um `processing_time_seconds: float` erweitert. Nützlich für Monitoring und Feinjustierung der Zeitschätzung.

## API-Endpunkt-Änderungen

### Geänderter Endpunkt: `POST /api/ai/refurbish/`

- **Request**: Unverändert (`AiRefurbishIn`)
- **Response**: Erweitertes `AiRefurbishOut`:
  - Neues Feld: `processing_time_seconds: float`
  - `image_url` bleibt, wird aber immer `null` (Bilder nicht mehr im Refurbish)
  - `image_urls` bleibt, wird aber immer `[]`
- **Timeout**: 30 Sekunden (Gemini SDK-Ebene)
- **Fehler-Responses**:
  - 502: `{"detail": "...", "error_code": "AI_INVALID_RESPONSE"}`
  - 503: `{"detail": "...", "error_code": "AI_UNAVAILABLE"}`
  - 504: `{"detail": "...", "error_code": "AI_TIMEOUT"}`
  - 500: `{"detail": "...", "error_code": "AI_INTERNAL_ERROR"}`

### Bestehender Endpunkt: `POST /api/ai/generate-image/` (unverändert)

- Wird jetzt separat/manuell vom Frontend aufgerufen (Step 2)
- Timeout: 90 Sekunden (Gemini SDK-Ebene, neu)
- Fehler-Handling wird analog zum Refurbish-Endpunkt verbessert

### Gestrichener Endpunkt: `GET /api/ai/config/`

- Wird NICHT implementiert. Zeitschätzung ist ein UX-Hint im Frontend.

### Keine DB-Migrationen

Alle Änderungen betreffen nur API-Logik und Frontend. Keine Model-Änderungen erforderlich.

## Risks / Trade-offs

- **[Zeitschätzung im Frontend]** Die Zeitschätzung "10-20 Sekunden" ist hardcoded. Bei Backend-Änderungen muss sie manuell angepasst werden. → Mitigation: Änderungen sind selten, und `processing_time_seconds` in der Response ermöglicht Monitoring der tatsächlichen Dauer.
- **[Gemini SDK Timeout]** Nicht alle Gemini SDK-Versionen unterstützen den `timeout`-Parameter gleich. → Mitigation: Testen mit der aktuellen `google-genai`-Version. Fallback: `httpx` Timeout auf Transport-Ebene.
- **[Bilder-UX]** Benutzer müssen in Step 2 aktiv auf "Bilder generieren" klicken. → Akzeptabel: Der Button existiert bereits in Step 2. Die meisten Benutzer werden ihn nutzen.
- **[Refurbish ohne Bilder]** Das Frontend erhält `image_url: null` und `image_urls: []` vom Refurbish. → Kein Problem: Das Frontend prüft diese Felder bereits und zeigt einen Platzhalter, wenn kein Bild vorhanden ist.

## Open Questions

Keine offenen Fragen — alle Entscheidungen sind getroffen.
