## MODIFIED Requirements

### Requirement: Content-Aufbereitung (Refurbish)

Das System MUST die Umwandlung von unstrukturiertem Freitext in eine strukturierte Idea per KI unterstützen. Der Refurbish-Endpunkt MUST einen Timeout auf Gemini SDK-Ebene implementieren, spezifische Fehlercodes zurückgeben und KEINE Bildgenerierung mehr enthalten.

#### Scenario: Freitext aufbereiten (Erfolg)

- GIVEN ein authentifizierter Benutzer mit unstrukturiertem Rohtext
- WHEN der Benutzer den Text an POST `/api/ai/refurbish/` sendet (Body: `{ raw_text: string }`)
- THEN extrahiert und generiert die KI strukturierte Felder:
  - `title`, `summary`, `summary_long`, `description`
  - `idea_type` (default: "idea")
  - `costs_rating`, `execution_time`, `preparation_time`, `difficulty`
  - `suggested_tag_ids`, `suggested_tag_names`, `suggested_tags`
  - `suggested_scout_level_ids`
  - `suggested_materials` (Array mit `{ quantity, material_name, material_unit, quantity_type }`)
  - `image_prompt` (für spätere manuelle Bildgenerierung)
- AND die Response enthält `processing_time_seconds` (float) mit der tatsächlichen Verarbeitungsdauer
- AND die Response enthält `image_url: null` und `image_urls: []` (keine Bildgenerierung mehr)
- AND das Ergebnis wird als strukturiertes JSON zurückgegeben

#### Scenario: KI-Call überschreitet Timeout

- GIVEN ein Refurbish-Request wurde gesendet
- WHEN der Gemini-API-Call den Timeout (30 Sekunden) auf SDK-Ebene überschreitet
- THEN wirft das Gemini SDK `DeadlineExceeded`, das als `AiTimeoutError` gefangen wird
- AND HTTP 504 Gateway Timeout wird zurückgegeben mit `{ "detail": "Die KI-Verarbeitung hat zu lange gedauert. Bitte versuche es erneut oder erstelle die Idee manuell.", "error_code": "AI_TIMEOUT" }`

#### Scenario: KI-Dienst nicht verfügbar

- GIVEN die Google Gemini API ist nicht erreichbar
- WHEN ein Benutzer Aufbereitung anfragt
- THEN wird HTTP 503 Service Unavailable zurückgegeben mit `{ "detail": "Der KI-Dienst ist derzeit nicht verfügbar. Bitte versuche es später erneut oder erstelle die Idee manuell.", "error_code": "AI_UNAVAILABLE" }`

#### Scenario: KI liefert ungültige Antwort

- GIVEN die Gemini API antwortet, aber mit ungültigen Daten
- WHEN die Antwort nicht gegen das Pydantic-Schema validiert werden kann
- THEN wird HTTP 502 Bad Gateway zurückgegeben mit `{ "detail": "Die KI hat eine ungültige Antwort geliefert. Bitte versuche es erneut oder erstelle die Idee manuell.", "error_code": "AI_INVALID_RESPONSE" }`

#### Scenario: Unerwarteter Fehler

- GIVEN ein unerwarteter Fehler tritt im Refurbish-Vorgang auf
- WHEN der Fehler nicht den obigen Kategorien zugeordnet werden kann
- THEN wird HTTP 500 zurückgegeben mit `{ "detail": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder erstelle die Idee manuell.", "error_code": "AI_INTERNAL_ERROR" }`
- AND der Fehler wird mit vollständigem Stacktrace serverseitig geloggt

#### Scenario: Aufbereitung mit unzureichendem Input

- GIVEN minimaler oder sehr kurzer Eingabetext (weniger als 20 Zeichen)
- WHEN der Benutzer ihn zur Aufbereitung einreicht
- THEN generiert die KI was möglich ist und lässt unsichere Felder leer
- AND der Benutzer wird aufgefordert fehlende Informationen zu ergänzen

## ADDED Requirements

### Requirement: Spezifische KI-Exceptions

Das Backend MUST spezifische Exception-Klassen für KI-Fehler implementieren, die im API-Layer auf HTTP-Statuscodes und maschinenlesbare Fehlercodes gemappt werden.

#### Scenario: Exception-zu-HTTP-Mapping

- GIVEN eine KI-Exception wird im AI-Service geworfen
- WHEN der API-Layer die Exception fängt
- THEN wird sie wie folgt gemappt:
  - `AiTimeoutError` → HTTP 504, `error_code: "AI_TIMEOUT"`
  - `AiUnavailableError` → HTTP 503, `error_code: "AI_UNAVAILABLE"`
  - `AiInvalidResponseError` → HTTP 502, `error_code: "AI_INVALID_RESPONSE"`
  - Sonstige `Exception` → HTTP 500, `error_code: "AI_INTERNAL_ERROR"`
- AND jede Response enthält ein `detail`-Feld mit einer deutschen Fehlermeldung

### Requirement: Gemini SDK Timeout

Alle KI-Endpunkte MUST den Timeout direkt auf Gemini SDK-Ebene setzen, damit keine verwaisten Threads entstehen.

#### Scenario: Refurbish-Timeout

- GIVEN ein Refurbish-Call an die Gemini API
- WHEN der `timeout`-Parameter auf `AI_REFURBISH_TIMEOUT_SECONDS = 30` gesetzt wird
- THEN bricht der Gemini SDK-Client den HTTP-Request nach 30 Sekunden sauber ab
- AND `google.api_core.exceptions.DeadlineExceeded` wird als `AiTimeoutError` gefangen

#### Scenario: Bildgenerierungs-Timeout

- GIVEN ein Bildgenerierungs-Call an die Gemini API
- WHEN der `timeout`-Parameter auf `AI_IMAGE_TIMEOUT_SECONDS = 90` gesetzt wird
- THEN bricht der Gemini SDK-Client den HTTP-Request nach 90 Sekunden sauber ab
- AND `google.api_core.exceptions.DeadlineExceeded` wird als `AiTimeoutError` gefangen

### Requirement: Bildgenerierung aus Refurbish entfernt

Der Refurbish-Endpunkt MUST KEINE Bildgenerierung mehr ausführen. Der `image_prompt` wird weiterhin generiert und in der Response zurückgegeben.

#### Scenario: Refurbish ohne Bilder

- GIVEN ein Refurbish-Call wird ausgeführt
- WHEN die Textgenerierung und Tag-Vorschläge abgeschlossen sind
- THEN wird `generate_images()` NICHT aufgerufen
- AND die Response enthält `image_url: null` und `image_urls: []`
- AND die Response enthält `image_prompt` mit einem englischen Prompt für spätere manuelle Bildgenerierung
