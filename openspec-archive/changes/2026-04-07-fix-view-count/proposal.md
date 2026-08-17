## Why

Die View-Count-Funktion ist kaputt: Der `view_count` auf Content-Objekten wird **nie inkrementiert**, obwohl `ContentView`-Records erstellt werden. Die aktive `record_view`-Implementierung in `content/api/helpers.py` erzeugt zwar Einträge in der `ContentView`-Tabelle, aktualisiert aber nie das `view_count`-Feld auf dem Content-Objekt. Zusätzlich fehlt der `record_view`-Aufruf bei Recipes komplett. Es existiert eine zweite, vollständigere Implementierung in `content/services/view_service.py` (mit Bot-Filterung und `view_count`-Inkrement), die aber nirgends importiert wird — Dead Code.

## What Changes

- **Fix `record_view`**: Die aktive Implementierung in `content/api/helpers.py` wird erweitert, um `view_count` auf dem Content-Objekt atomar zu inkrementieren (`F('view_count') + 1`)
- **Recipe-Integration**: `record_view` wird in `recipe/api/recipes.py` für beide Detail-Endpunkte (`get_recipe`, `get_recipe_by_slug`) aufgerufen
- **Bot-Filterung**: Einfache Bot-Erkennung (User-Agent-Check) wird in die aktive `record_view`-Funktion integriert (übernommen aus dem ungenutzten `view_service.py`)
- **Dead Code entfernen**: `content/services/view_service.py` wird entfernt, da die Funktionalität in `helpers.py` konsolidiert wird
- **Konsistente Sort-Keys**: Recipe-Sortierung von `"most_viewed"` auf `"popular"` vereinheitlichen (wie bei Session/Blog/Game)

## Capabilities

### New Capabilities

_Keine neuen Capabilities — dies ist ein Bugfix bestehender Funktionalität._

### Modified Capabilities

- `comments-emotions`: View-Tracking-Verhalten ändert sich (Bot-Filterung, tatsächliches Inkrement von `view_count`)

## Impact

- **Backend-Apps**: `content` (helpers.py, services/), `recipe` (api/recipes.py)
- **Django-Models**: Kein Schema-Change — `view_count` (IntegerField) und `ContentView` existieren bereits
- **Pydantic/Zod-Schemas**: Keine Änderung nötig — `view_count` wird bereits korrekt serialisiert
- **Migrations**: Keine nötig — alle Felder existieren bereits
- **API-Endpunkte**: `GET /api/recipes/{id}` und `GET /api/recipes/by-slug/{slug}` werden um View-Tracking ergänzt
- **Sortierung**: `GET /api/recipes/` Sort-Parameter ändert sich von `most_viewed` zu `popular` (**BREAKING** für Frontend-Aufrufe, falls vorhanden)
