## Context

Das `Portion`-Modell hatte früher ein `is_system`-Boolean-Feld, das mit Migration `0004_remove_portion_is_system_package` entfernt wurde. Gleichzeitig wurden "Packung"-Portionen ins neue `Package`-Modell migriert und "g"-Portionen gelöscht. Die Bereinigung war unvollständig:

- **`test_portion_redesign.py`**: 3 Tests erwarten auto-erstellte Portionen (`name="g"`, `name="Packung"`, `name="Stück"`), die `make_ingredient()` nicht mehr erzeugt → `DoesNotExist`
- **`test_display_utils.py`**: `_make_package_portion` erstellt `Portion`-Objekte, aber `build_package_display()` nutzt seit Migration 0004 das `Package`-Modell via `get_shopping_portion()` → alle Tests greifen ins Leere
- **Tests + Schemas**: `is_system`-Referenzen in `test_rewe_export.py` und veraltete Kommentare; `is_default` fehlt in `PortionOut` und `PortionSchema`
- **Prod**: Frontend-Food-Bundle im CDN-Cache mit alter Zod-Schema, die `is_system` erwartet

## Goals / Non-Goals

**Goals:**
- `is_default: bool` als computed field zu `PortionOut` und `PortionSchema` hinzufügen
- Alle toten `is_system`-Referenzen aus Tests entfernen
- `is_default`-Duplizierung in `resolve_ingredient_portions` entfernen
- `test_display_utils.py` auf `Package`-Modell umstellen
- 3 kaputte Tests in `test_portion_redesign.py` löschen
- Test für `resolve_is_default` schreiben

**Non-Goals:**
- Kein neues Datenbank-Feld (keine Migration)
- Keine Änderung an der `Portion`-Datenstruktur
- Keine Änderung am Breakfast-Catalog-eigenen `PortionOut` in `breakfast_catalog.py`

## Decisions

### Decision 1: `is_default` als Pydantic-Resolver statt manueller Annotation

**Gewählt:** Ein `resolve_is_default`-Static-Method im `PortionOut`-Schema.

```python
class PortionOut(Schema):
    ...
    is_default: bool

    @staticmethod
    def resolve_is_default(obj) -> bool:
        if isinstance(obj, dict):
            return obj.get("is_default", obj.get("rank", 0) == 1)
        return getattr(obj, "rank", 0) == 1
```

**Begründung:** Der Resolver funktioniert automatisch für alle `PortionOut`-Nutzungen. Dict-Check behandelt `resolve_ingredient_portions` (Übergang), ORM-Fallback behandelt direkte Queryset-Rückgaben (`list_portions`).

### Decision 2: `is_default` aus `resolve_ingredient_portions` entfernen

Nachdem der `PortionOut`-Resolver `is_default` automatisch aus `rank` berechnet, ist die manuelle Zuweisung `"is_default": p.rank == 1` redundant und wird entfernt.

### Decision 3: `_make_package_portion` auf `Package`-Modell umstellen

**Gewählt:** `_make_package_portion` erstellt `Package`-Objekte statt `Portion`-Objekte.

```python
def _make_package_portion(self, ingredient, weight_g, name="", rank=1):
    if not name:
        name = f"{int(weight_g)}g Packung"
    return baker.make(
        Package,
        ingredient=ingredient,
        name=name,
        weight_g=weight_g,
        rank=rank,
    )
```

**Begründung:** `build_package_display()` nutzt `get_shopping_portion()` → `ingredient.packages.filter(rank=1)`. Die Tests müssen `Package`-Objekte erstellen, nicht `Portion`. `Package` hat kein `measuring_unit`-FK und kein `quantity`-Feld, daher werden diese aus dem Helper entfernt.

### Decision 4: 3 kaputte Tests in `test_portion_redesign.py` löschen

Alle drei Tests (`test_system_portions_have_correct_ranks`, `test_g_portion_is_system`, `test_g_portion_not_draggable`) erwarten auto-erstellte "g"/"Packung"/"Stück"-Portionen. Migration 0004 hat "g" gelöscht und "Packung" ins `Package`-Modell verschoben. Kein Mechanismus erstellt diese Portionen mehr automatisch. Die Tests sind nicht reparabel ohne Wiederherstellung der alten Logik — werden gelöscht.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `is_default` könnte in `resolve_ingredient_portions` noch gebraucht werden | Resolver behandelt Dicts und ORM-Objekte — kein Risiko |
| `_make_package_portion`-Änderung bricht andere Tests | Grep über `_make_package_portion` zeigt nur Nutzung in derselben Klasse |
| `test_system_portions_have_correct_ranks`-Löschung verliert Rank-Validierung | Rank=9999 für "g" ist nicht mehr relevant da "g" nicht mehr existiert |
| Frontend-Code erwartet `is_default` noch nicht | Zod-Schema wird ergänzt; falls Feld ungenutzt, wird es ignoriert |
| CDN-Cache hält alte Zod-Schema | Nach Deployment invalidiert Vite-Hashes den Cache automatisch |
