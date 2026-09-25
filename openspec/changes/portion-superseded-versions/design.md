## Context

`update_portion` (`backend/supply/api/ingredients.py:959`) berechnet das prospektive `weight_g`. Ändert es sich und ist die Portion von `RecipeItem`s referenziert (`is_referenced_by_recipe_items`), ruft es `create_replacement_portion` (`supply/services/portion_integrity.py:164`) auf. Diese Funktion
- hängt bei Namenskollision „ (neu)“ an,
- vergibt bei Rang-1-Kollision den nächsten freien Rang,
- lässt die alte Portion aktiv.

Ergebnis für den Nutzer: zwei Portionen („Stück“, „Stück (neu)“), und die neue ist oft nicht einmal Standardportion.

Beschränkungen aus dem Bestand:
- `unique_portion_name_per_ingredient` (Lower(name), ingredient, `deleted_at IS NULL`) und `unique_rank1_portion_per_ingredient` (`rank=1, deleted_at IS NULL`).
- Nährwert-/Preisberechnung (`recipe/services/recipe_checks.py:85, 438, 518`, `supply/services/ingredient_price_proposal_service.py:192`) **schließt Items mit gelöschter Portion aus**.
- `rebind_dead_portion_references` (`portion_integrity.py:295`) hängt Items mit gelöschter Portion automatisch um (Gramm erhalten).
- `MealItem` referenziert keine Portion, sondern `(ingredient, measuring_unit)`; `_resolve_ingredient_weight_g` (`planner/services/meal_item_helpers.py`) sucht die aktive Portion dieser Einheit.

### Abhängigkeit zu `ingredient-status-visibility-unification`
Dieser Change setzt voraus, dass `_can_edit_portions` durch `food_access.can_edit` ersetzt ist (dort Task 3.3): Portionen verifizierter Zutaten darf nur Staff ändern. `update_portion` prüft das Recht **vor** der Ablöse-Entscheidung; die Ablösung ändert nie den Zutat-Status und schreibt keinen Status-Audit-Eintrag. Beide Changes ändern `supply/api/ingredients.py` (`update_portion` bzw. Rechtehelfer), deshalb wird dieser Change **nach** ISVU umgesetzt und auf dessen Stand aufgebaut.

## Goals / Non-Goals

**Goals:**
- Nach einer Gewichtskorrektur existiert für Nutzer genau eine Portion mit dem ursprünglichen Namen und Rang.
- Bestehende Rezepte ändern ihre Grammzahlen nicht ungefragt.
- Rezeptbesitzer können bewusst auf die aktuelle Portion umstellen.
- Ein Begriff „aktive Portion“ im gesamten Backend.

**Non-Goals:**
- Versionierung anderer Zutat-Felder (Nährwerte, Preis).
- Automatisches Umstellen von Rezepten (vom Nutzer ausgeschlossen: „immer versteckte Version“).
- Änderungen an den Reparatur-Jobs außer dem Ignorieren abgelöster Portionen.

## Decisions

### D1: Eigener Zustand statt Soft-Delete
Neue Felder an `Portion`:
```python
superseded_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.RESTRICT, related_name="superseded_versions")
superseded_at = models.DateTimeField(null=True, blank=True)
```
*Alternative*: abgelöste Portion über `deleted_at` verstecken. **Verworfen**, weil Nährwert-/Preisberechnung Items mit gelöschter Portion ausschließt und `rebind_dead_portion_references` sie automatisch umhängen würde. Beides widerspricht „alte Rezepte bleiben unverändert“.
`RESTRICT` statt `SET_NULL`: Ein Hard-Delete des Nachfolgers darf abgelöste Portionen nicht „wiederbeleben“; beim Löschen der ganzen Zutat (Kaskade) ist `RESTRICT` erlaubt.

### D2: `PortionQuerySet.active()`
```python
class PortionQuerySet(models.QuerySet):
    def active(self):  # nicht gelöscht, nicht abgelöst
        return self.filter(deleted_at__isnull=True, superseded_by__isnull=True)
```
`Portion.objects = PortionQuerySet.as_manager()`; `ingredient.portions.active()` funktioniert über den Related Manager. Alle Portions-Filter `deleted_at__isnull=True` werden auf `.active()` umgestellt (mechanisch, per `grep`). **Ausnahmen**, die weiter nur `deleted_at` prüfen, weil sie Referenzen auswerten: `recipe_checks.py` (`exclude(portion__deleted_at__isnull=False)`), `ingredient_price_proposal_service.py:192`, `rebind_dead_portion_references`. Ein Test stellt sicher, dass im Code kein neues `portions.filter(deleted_at__isnull=True)` hinzukommt (Grep-Test).

### D3: Constraints auf „aktiv“ umstellen
Beide Unique-Constraints erhalten `condition=Q(deleted_at__isnull=True, superseded_by__isnull=True)`. Migration: `RemoveConstraint` + `AddConstraint` in einer Migration; keine Datenmigration nötig, da es heute keine abgelösten Portionen gibt.

### D4: `supersede_portion` ersetzt `create_replacement_portion`
In `portion_integrity.py`, in `transaction.atomic()` mit `select_for_update()` auf die alte Portion:
1. Alte Portion: `superseded_by`/`superseded_at` setzen (dadurch frei für Name und Rang 1).
2. Neue Portion mit angeforderten Werten, Name/Rang der alten als Default, Gewicht als bestätigt/manuell (wie bisher).
3. Pfadkompression: `Portion.objects.filter(superseded_by=old).update(superseded_by=new)`.
4. Audit-Log-Eintrag (bestehendes `change-audit-log`), Logger wie bisher.
Reihenfolge 1 → 2 ist nötig, damit die Constraints nicht kollidieren; beides in derselben Transaktion.
Reparatur-Jobs, die heute `create_replacement_portion` nutzen und Items gezielt umhängen (`portion-integrity-guardrails`), verwenden weiter eine Variante **ohne** Ablösung (`create_replacement_portion(..., supersede=False)`), weil dort bewusst beide Portionen nebeneinander bestehen können. Entscheidung pro Aufrufer wird in den Tasks geprüft.

### D5: API-Antwort
`PATCH …/portions/{id}/` liefert `PortionOut` + `replaced_portion_id: int | None`. Das Frontend invalidiert bei gesetztem `replaced_portion_id` die Queries der Zutat (`['ingredient', slug]`, Portionslisten) sowie `['recipe']`.
`PortionOut` erhält `superseded_by_id: int | None` (für Admin-/Debug-Ansichten; in normalen Listen immer `null`, weil sie nur aktive liefern).

### D6: `current_portion` in `RecipeItemOut`
Resolver: Ist `item.portion.superseded_by_id` gesetzt und der Nachfolger aktiv, liefert `current_portion = {id, name, weight_g}`, sonst `null`. `superseded_by` wird in den Recipe-Detail-Querysets per `select_related("portion__superseded_by")` mitgeladen (kein N+1).

### D7: Endpunkt „aktuelle Portionen übernehmen“
`POST /api/recipes/{recipe_id}/recipe-items/adopt-current-portions/`
- Request: `AdoptCurrentPortionsIn { item_ids: list[int] | None = None }` (`None` = alle)
- Response: `AdoptCurrentPortionsOut { updated_count: int, items: list[RecipeItemOut] }`
- Auth: Session; Bearbeitungsrecht am Rezept (bestehende Rezept-Permission); 403 für anonyme Nutzer (`Sitzung nicht gefunden`) und Nutzer ohne Recht.
- Setzt `portion_id = current_portion.id`, `quantity` unverändert, invalidiert Rezept-Caches über die bestehenden Signale.
Einzel-„Aktualisieren“ im UI nutzt denselben Endpunkt mit `item_ids=[id]` (ein Pfad statt PATCH-Sonderfall).

### D8: Löschen eines Nachfolgers
Wird eine aktive Portion C soft-gelöscht, auf die abgelöste Portionen zeigen, hängt `delete_portion` zusätzlich zu den direkten Referenzen auch die Items der abgelösten Vorgänger nach der bestehenden Regel (Gramm erhalten, Rang-1-Ziel) um. Damit bleibt `current_portion` nie auf einer gelöschten Portion stehen.

### D9: Frontend
- `InlineIngredientEditor.tsx`: pro Item mit `current_portion` eine Hinweiszeile (Lucide `RefreshCw`, Tokens, Text „Veraltete Portion: Stück (50 g) → jetzt 60 g“), Button „Aktualisieren“; oberhalb der Liste „Alle aktualisieren (N)“, wenn N > 1.
- Portion-Picker zeigt die aktuelle (abgelöste) Portion eines Items weiterhin als gewählten Wert an, bietet sie aber nicht zur Auswahl an.
- Zutatendetail: Nach dem Speichern einer Gewichtsänderung Toast „Gespeichert. 12 Rezepte behalten das alte Gewicht, bis sie aktualisiert werden.“ (Anzahl aus neuem Feld `referencing_recipe_count` in der PATCH-Antwort).

## Risks / Trade-offs

- [Vergessene `deleted_at__isnull=True`-Stelle zeigt abgelöste Portion] → Grep-Test (D2) plus Test „Portionsliste enthält keine abgelöste Portion“ für Listing, Zutatendetail, Katalog, Picker.
- [`MealItem`-Gewichte folgen sofort der neuen Portion (Einheit statt Portion-FK)] → gewollt: Essenspläne sind Planungsdaten und sollen korrigierte Gewichte nutzen; im Proposal dokumentiert.
- [Rezepte behalten dauerhaft falsche Gewichte] → Hinweis im Editor; Datenqualitäts-Dashboard erhält eine Kennzahl „Rezepte mit veralteten Portionen“ (Task).
- [Reparatur-Jobs erwarten zwei parallele aktive Portionen] → D4: `supersede=False` für diese Aufrufer.

## Migration Plan

1. Migration `supply/00xx_portion_superseded`: Felder + Constraint-Tausch (reversibel).
2. Deployment Backend, dann Frontend.
3. `uv run python manage.py merge_neu_portion_duplicates --dry-run` auf Prod prüfen, dann ausführen.
Rollback: Migration rückwärts (nur möglich, solange keine abgelösten Portionen mit gleichem Namen existieren – der Rückwärtsschritt benennt Kollisionen mit Suffix „ (alt)“ um).

## Open Questions

- Soll Staff eine Liste „abgelöste Portionen“ im Admin sehen? Vorerst nur über das Datenqualitäts-Dashboard.
