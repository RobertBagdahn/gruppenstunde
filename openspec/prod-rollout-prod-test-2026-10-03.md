# Prod-Rollout: Änderungen aus dem Produktivtest vom 2026-10-03

Gebündelter Runbook für die Daten-Schritte der Changes aus dem Produktivtest von essensplan.app.
Regel: immer zuerst Dry-Run, Ergebnis prüfen, `--apply` nur nach ausdrücklichem OK von Robert.

## 1. block-delete-recipe-in-use

Plan-Einträge mit soft-gelöschtem Rezept auflisten und danach entfernen:

```bash
uv run python manage.py cleanup_deleted_recipe_meal_items          # Dry-Run
uv run python manage.py cleanup_deleted_recipe_meal_items --apply  # nur nach OK
```

## 2. import-ingredient-name-normalization

Die vier Ei-Dubletten (`Eier (Größe M)`, `Hühnereier Größe M`, `Hühnerei`, `Hühnereier`) in `Hühnerei (Größe M)` zusammenführen (meistgenutzte Zutat) und die Aliase `Ei`, `Eier` setzen. Das Command listet im Dry-Run betroffene Rezept-, Plan- und Portionseinträge:

```bash
uv run python manage.py consolidate_egg_ingredients          # Dry-Run
uv run python manage.py consolidate_egg_ingredients --apply  # nur nach OK
```
