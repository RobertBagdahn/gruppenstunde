## Context

Das `Portion`-Model in `supply/models/ingredient.py` hat aktuell kein Soft-Delete. Beim Löschen wird geprüft, ob RecipeItems die Portion referenzieren — wenn ja, wird ein 409 Conflict geworfen. Das Projekt verwendet bereits ein `deleted_at`-Pattern in der `Content`-Basisklasse (`content/models/core.py`).

## Goals / Non-Goals

**Goals:**
- Portionen soft-deletable machen (analog zum Content-Pattern)
- Bestehende Rezepte bleiben intakt (FK-Referenzen unberührt)
- Gelöschte Portionen aus Auswahllisten und Listings ausblenden
- Einfache, konsistente Implementierung

**Non-Goals:**
- Kein Restore-UI (Admin kann direkt in DB wiederherstellen)
- Kein kaskadierendes Aufräumen von RecipeItems
- Keine Anzeige von "gelöschte Portion" im Rezept-Detail (Portion-Name wird weiterhin normal dargestellt)

## Decisions

1. **`deleted_at` Feld direkt auf Portion** — Kein Mixin/Basisklasse, da Portion kein Content ist. Ein einfaches `DateTimeField(null=True, blank=True, db_index=True)` reicht.

2. **Kein Custom Manager** — Die wenigen Stellen, die Portionen abfragen, werden explizit mit `deleted_at__isnull=True` gefiltert. Ein Manager wäre Overengineering für diesen Fall.

3. **API-Verhalten**: `DELETE` setzt `deleted_at=now()` und gibt 204 zurück — unabhängig davon, ob RecipeItems existieren. Die 409-Prüfung entfällt komplett.

4. **RecipeItem-Display**: Wenn ein RecipeItem eine soft-gelöschte Portion referenziert, wird der Portion-Name weiterhin angezeigt. Nur in Auswahllisten (neue Zuordnung) erscheint sie nicht mehr.

## Risks / Trade-offs

- **Verwaiste Referenzen**: RecipeItems zeigen weiterhin auf gelöschte Portionen. Das ist gewollt — Datenintegrität bleibt erhalten.
- **Kein Undo-UI**: Versehentliches Löschen erfordert DB-Zugriff zum Wiederherstellen. Akzeptabel für Admin-only-Feature.
- **Filter-Konsistenz**: Alle Stellen, die Portionen für Auswahl laden, müssen den Filter haben. Übersehene Stellen könnten gelöschte Portionen anbieten.
