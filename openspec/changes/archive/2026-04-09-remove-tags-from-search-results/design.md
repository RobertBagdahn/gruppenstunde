## Context

Die Suchseite (`/search`) zeigt aktuell alle Ergebnistypen als einheitliche Karten an, darunter auch Tags. Tags sind jedoch keine Inhalte, sondern Kategorisierungselemente. Sie erscheinen als leere Karten mit Platzhalter-Gradient und ohne sinnvolle Metadaten (kein Bild, keine Zusammenfassung). Das verwirrt Nutzer und bläht die Ergebnisliste auf (14 von 40 Ergebnissen sind Tags).

Die Autocomplete-Funktion für Tags soll davon unberührt bleiben, da sie einen echten Nutzen hat: Nutzer können nach Tags suchen und dann die Suche nach diesem Tag filtern.

**Betroffene Dateien:**
- `backend/content/services/search_service.py` — `CONTENT_TYPES` Set, `unified_search()` Funktion
- `frontend/src/schemas/search.ts` — `RESULT_TYPE_OPTIONS`, `RESULT_TYPE_CONFIG`
- `frontend/src/pages/SearchPage.tsx` — Tag-spezifisches Rendering in `ResultCard`

## Goals / Non-Goals

**Goals:**
- Tags aus den Suchergebnis-Karten entfernen
- Tags-Tab aus der Tab-Leiste entfernen
- Tag-Autocomplete unverändert beibehalten
- Cleaner Code: Tag-spezifische Rendering-Logik im Frontend entfernen

**Non-Goals:**
- Änderungen an der Autocomplete-Funktion
- Änderungen am Tag-Datenmodell
- Änderungen an der Tag-Verwaltung im Admin
- Entfernung der `_search_tags()`-Funktion (kann als Dead Code bleiben oder entfernt werden)

## Decisions

### 1. Backend: `"tag"` aus `CONTENT_TYPES` entfernen

**Entscheidung:** `"tag"` wird aus dem `CONTENT_TYPES` Set in `search_service.py` entfernt.

**Begründung:** Dies ist der minimale und sauberste Eingriff. Die `unified_search()` Funktion iteriert über `CONTENT_TYPES`, um zu bestimmen, welche Typen durchsucht werden. Durch Entfernung aus dem Set werden Tags weder durchsucht noch in `type_counts` gezählt. Die `_search_tags()` Funktion bleibt als ungenutzter Code bestehen — kann optional entfernt werden.

**Alternative:** Tags im Frontend filtern → Abgelehnt, weil unnötige Datenübertragung und falsche `type_counts`.

### 2. Autocomplete: Separate Logik beibehalten

**Entscheidung:** Die Autocomplete-Funktion (`_autocomplete_tags`) wird nicht verändert, da sie ein eigenes `AUTOCOMPLETE_TYPES` Set oder eine eigene Iteration nutzt.

**Begründung:** Autocomplete und Suche sind separate Funktionen. Die Autocomplete-Funktion hat ihren eigenen Loop (Zeile ~102 in `search_service.py`), der unabhängig von `CONTENT_TYPES` arbeitet.

### 3. Frontend: `RESULT_TYPE_OPTIONS` und `RESULT_TYPE_CONFIG` bereinigen

**Entscheidung:** Den `tag`-Eintrag aus `RESULT_TYPE_OPTIONS` (Tab-Leiste) und `RESULT_TYPE_CONFIG` (Karten-Rendering) entfernen.

**Begründung:** Da das Backend keine Tags mehr zurückgibt, ist der Frontend-Code für Tag-Karten tote Logik. Durch Entfernung bleibt der Code sauber. Der Tags-Tab verschwindet automatisch (da count = 0), aber explizite Entfernung ist sauberer.

**Keine Änderung an API-Endpunkten oder Response-Schemas nötig.** Das `result_type` Feld im Pydantic/Zod-Schema ist ein freier String bzw. Literal-Union — das Backend sendet einfach keine `tag`-Ergebnisse mehr.

## Risks / Trade-offs

- **[Gering] Dead Code** → Die `_search_tags()` Funktion wird nicht mehr aufgerufen. Mitigation: Optional in einem Follow-up entfernen, oder direkt mit-entfernen.
- **[Gering] Autocomplete-Abhängigkeit** → Sicherstellen, dass die Autocomplete-Funktion unabhängig von `CONTENT_TYPES` iteriert. Mitigation: Code prüfen, dass `_autocomplete_tags` nicht von `CONTENT_TYPES` abhängt.
- **Keine Datenbank-Migrationen nötig.**
