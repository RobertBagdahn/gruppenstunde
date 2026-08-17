## Context

Die Content-Plattform trackt Seitenaufrufe über zwei Mechanismen:
1. **`ContentView`-Records** (via GenericForeignKey) — individuelle View-Einträge mit Session-Deduplizierung
2. **`view_count`-Feld** auf jedem Content-Objekt — denormalisierter Zähler für schnelle Sortierung/Anzeige

Aktueller Zustand: Die aktive `record_view`-Funktion in `content/api/helpers.py` erstellt `ContentView`-Records, **inkrementiert aber `view_count` nicht**. Eine zweite, vollständigere Implementierung in `content/services/view_service.py` (mit Bot-Filterung + Inkrement) wird nirgends genutzt. Zudem fehlt der `record_view`-Aufruf in den Recipe-Detail-Endpunkten komplett.

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `backend/content/api/helpers.py` | Bot-Filterung + `view_count`-Inkrement hinzufügen |
| `backend/content/services/view_service.py` | Entfernen (Dead Code) |
| `backend/recipe/api/recipes.py` | `record_view`-Import + Aufrufe in `get_recipe` und `get_recipe_by_slug` |

## Goals / Non-Goals

**Goals:**
- `view_count` wird bei jedem neuen, nicht-bot, nicht-duplikat Aufruf atomar inkrementiert
- Alle 4 Content-Typen (GroupSession, Blog, Game, Recipe) tracken Views einheitlich
- Bot-Anfragen werden herausgefiltert (kein view_count-Anstieg)
- Dead Code wird entfernt

**Non-Goals:**
- Backfill von historischen `view_count`-Werten (bestehende `ContentView`-Records werden nicht rückwirkend gezählt)
- Änderungen an Frontend-Darstellung (z.B. View-Count auf allen Detail-Seiten anzeigen — separates Feature)
- Erweiterte Bot-Erkennung (CAPTCHAs, Rate Limiting etc.)
- Admin-Dashboard-Anpassungen (diese nutzen bereits `ContentView`-Records direkt)

## Decisions

### 1. Konsolidierung in `helpers.py` statt `view_service.py`

**Entscheidung**: Die aktive `record_view`-Funktion in `helpers.py` wird erweitert (Bot-Filter + Inkrement). `view_service.py` wird entfernt.

**Rationale**: `helpers.py` ist die bereits aktiv genutzte Implementierung. Alle 4 Content-Typ-APIs importieren aus `content.base_api`, welches `helpers.py` re-exportiert. Eine Migration auf `view_service.py` würde alle Imports ändern — unnötige Churn.

**Alternative verworfen**: `view_service.py` als zentrale Implementierung nutzen — erfordert Import-Änderungen in 3 Apps + neues Import-Pattern.

### 2. Atomares Inkrement mit `F()`-Expression

**Entscheidung**: `view_count` wird mit `model_class.objects.filter(pk=obj_id).update(view_count=F('view_count') + 1)` inkrementiert.

**Rationale**: Die Implementierung in `view_service.py` hat einen Race-Condition-Bug: `obj.view_count + 1` liest den Wert zuerst, dann schreibt. Bei gleichzeitigen Requests geht ein Inkrement verloren. `F()`-Expressions delegieren das Inkrement an die Datenbank — race-condition-frei.

**Alternative verworfen**: Separater Celery-Task / Cron für Batch-Updates — unnötige Komplexität für diese Trafficlast.

### 3. Bot-Filter-Pattern aus `view_service.py` übernehmen

**Entscheidung**: `BOT_PATTERNS`-Regex und `is_bot()`-Funktion werden nach `helpers.py` verschoben.

**Rationale**: Bewährtes Pattern, deckt die gängigsten Crawler/Bots ab. Leerer User-Agent wird ebenfalls als Bot gewertet (Vorsichtsprinzip).

### 4. Recipe Sort-Key von `most_viewed` auf `popular` ändern

**Entscheidung**: Konsistenz mit Session/Blog/Game herstellen.

**Rationale**: Alle anderen Content-Typen verwenden `popular` als Sort-Key. Frontend-Code, der `most_viewed` verwendet, muss angepasst werden.

## Risks / Trade-offs

- **[Risk] Bestehende `view_count`-Werte sind 0** → Kein Backfill geplant. Counts beginnen bei 0 nach dem Fix. Das ist akzeptabel, da die Plattform in aktiver Entwicklung ist und keine Rückwärtskompatibilität nötig ist.
- **[Risk] False-Positive Bot-Filterung** → User-Agent-Regex könnte legitime User mit ungewöhnlichen Browsern blockieren. Mitigation: Regex ist konservativ und prüft nur bekannte Bot-Identifier.
- **[Risk] `view_count` kann von `ContentView`-Records abweichen** → Bei DB-Inkonsistenzen könnte der Zähler von der tatsächlichen Anzahl an `ContentView`-Records abweichen. Mitigation: Ein Management-Command zum Recount könnte später ergänzt werden (Non-Goal für jetzt).
