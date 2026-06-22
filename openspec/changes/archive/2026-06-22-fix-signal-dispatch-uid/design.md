## Context

Django dedupliziert Signal-Handler anhand ihrer Speicheradresse. Ohne `dispatch_uid` wird bei jedem Modulimport ein neuer Handler registriert. In Tests ist dies besonders problematisch, da Django-Apps mehrfach geladen werden können. `supply/signals.py` hat einen weiteren Bug: `instance.tracker` referenziert `FieldTracker`, das nicht auf `Ingredient` definiert ist — das erzeugt `AttributeError`, der im `except`-Block geschluckt wird, und Quality-Score-Updates für Zutaten feuern nie.

## Goals / Non-Goals

**Goals:**
- Signal-Handler feuern genau einmal pro Event, unabhängig von Modulimport-Anzahl
- Quality-Score- und Embedding-Updates für Zutaten funktionieren wieder
- `usage_count` kann nie negativ werden
- `MeasuringUnit`-Löschungen invalidieren Recipe-Caches

**Non-Goals:**
- Einführung von `FieldTracker` (zu invasiv — `update_fields` aus Signal-kwargs reicht)
- Vollständige Signal-Architektur-Überarbeitung

## Decisions

**D1 — dispatch_uid: `"<app>.<handler_name>"`**
```python
@receiver(post_save, sender=RecipeItem, dispatch_uid="recipe.recalculate_cache_on_item_save")
```
Konvention: `"<django_app_label>.<function_name>_<event>"`.

**D2 — tracker ersetzen durch update_fields-Check**
```python
def _embedding_fields_changed(instance, update_fields) -> bool:
    if update_fields is None:
        return True  # konservativ: immer updaten wenn keine Info
    relevant = {"name", "description", "retail_section_id", "energy_kcal", "environmental_score", ...}
    return bool(relevant & set(update_fields))
```
`update_fields` ist im Signal-`kwargs` verfügbar.

**D3 — usage_count mit GREATEST schützen**
```python
Recipe.objects.filter(pk=recipe_id).update(
    usage_count=Greatest(F("usage_count") - 1, 0)
)
```
Benötigt `from django.db.models.functions import Greatest`.

**D4 — Embedding-Thread re-fetcht aus DB**
```python
recipe_pk = instance.pk
def _do_update():
    recipe = Recipe.objects.get(pk=recipe_pk)
    update_content_embedding(recipe)
transaction.on_commit(_do_update)
```

## Risks / Trade-offs

- `dispatch_uid` macht bestehende Doppel-Handler obsolet — in der Prod-Umgebung ist das sofort wirksam (kein Restart nötig, aber Handlers werden von WSGI/ASGI neu registriert beim Start)
