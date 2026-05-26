## 1. Backend: Tags aus Suchergebnissen entfernen

- [x] 1.1 `"tag"` aus dem `CONTENT_TYPES` Set in `backend/content/services/search_service.py` entfernen
- [x] 1.2 Sicherstellen, dass `_autocomplete_tags()` weiterhin aufgerufen wird (unabhängig von `CONTENT_TYPES`)
- [x] 1.3 Optional: `_search_tags()` Funktion entfernen (Dead Code Cleanup)

## 2. Frontend: Tag-Konfiguration bereinigen

- [x] 2.1 `tag`-Eintrag aus `RESULT_TYPE_OPTIONS` in `frontend/src/schemas/search.ts` entfernen
- [x] 2.2 `tag`-Eintrag aus `RESULT_TYPE_CONFIG` in `frontend/src/schemas/search.ts` entfernen
- [x] 2.3 Tag-spezifische Rendering-Logik in `frontend/src/pages/SearchPage.tsx` entfernen (Icon-Anzeige im ResultCard)

## 3. Verifizierung

- [x] 3.1 Backend starten und prüfen, dass `/api/content/search/?q=test` keine `tag`-Ergebnisse mehr enthält
- [x] 3.2 Prüfen, dass `/api/content/search/autocomplete/?q=test` weiterhin Tags enthält
- [x] 3.3 Frontend prüfen: Kein "Tags"-Tab in der Tab-Leiste, keine Tag-Karten in den Ergebnissen
