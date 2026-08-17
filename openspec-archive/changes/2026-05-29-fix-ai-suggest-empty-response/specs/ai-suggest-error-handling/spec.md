## AI Suggest Error Handling

### Requirements

- WENN der Gemini-Client nicht verfügbar ist, MUSS der Endpoint HTTP 503 zurückgeben
- WENN der Endpoint einen Fehler (4xx/5xx) zurückgibt, MUSS der Dialog eine deutsche Fehlermeldung anzeigen
- Die Fehlermeldung MUSS den User informieren, dass die KI nicht erreichbar ist (nicht "keine Vorschläge")
