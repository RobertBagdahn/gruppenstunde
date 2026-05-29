## 1. Backend Model + Migration

- [x] 1.1 `deleted_at = DateTimeField(null=True, blank=True, db_index=True)` zum `Portion`-Model hinzufügen (`backend/supply/models/ingredient.py`)
- [x] 1.2 `soft_delete()` und `restore()` Methoden auf `Portion` implementieren
- [x] 1.3 Migration erstellen: `uv run python manage.py makemigrations supply`
- [x] 1.4 Migration ausführen: `uv run python manage.py migrate`

## 2. Backend API

- [x] 2.1 `delete_portion` in `backend/supply/api/ingredients.py`: 409-Prüfung entfernen, stattdessen `portion.soft_delete()` aufrufen
- [x] 2.2 `list_portions`: Filter `deleted_at__isnull=True` hinzufügen
- [x] 2.3 Alle anderen Stellen prüfen, die Portionen für Auswahllisten laden (z.B. RecipeItem-Schemas `resolve_ingredient_portions`) — Filter ergänzen

## 3. Frontend

- [x] 3.1 Prüfen ob Frontend-Code spezielle 409-Fehlerbehandlung für Portion-Delete hat — ggf. entfernen
