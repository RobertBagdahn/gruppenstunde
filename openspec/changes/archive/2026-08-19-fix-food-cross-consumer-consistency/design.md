# Design — fix-food-cross-consumer-consistency

## Context

Die Auflösung aktiver Rezept-Zutaten ist heute auf mehrere Stellen verteilt und
inkonsistent:

- `planner/services/calculation_context.py` — kanonischer Resolver
  (`resolve_active_recipe_items` / `active_recipe_items`), genutzt von
  `shopping_service` und `nutrition_aggregation`.
- `planner/services/variant_service.py` — eigene (korrekte) Kopie für Energie/Kosten
  (`_compute_total_with_overrides`, `_compute_delta`).
- `planner/api/meal_plan.py` — `nutrition_summary` und `cost_summary` duplizieren die
  Auswahl-Logik **fehlerhaft** (leere `active_recipe_item_ids` schließt alle Optionals
  und Austausch-Mitglieder aus).
- `planner/services/meal_item_helpers.py` — `_resolve_ingredient_weight_g` filtert im
  direkten DB-Pfad keine soft-gelöschten Portionen.
- `recipe/services/recipe_checks.py` — `sync_recipe_nutritional_tags` und der
  `get_recipe_total_weight_g`-Fallback schließen Austausch-Alternativen nicht aus.

Der Default „Optionals eingeschlossen / Austausch → position 0" ist bereits in
`recipe-optional-items` spezifiziert — die Implementierung weicht davon ab.

## Goals / Non-Goals

**Goals:**
- Eine kanonische, testbare Auflösung aktiver Rezept-Zutaten, die alle Konsumenten teilen.
- Soft-gelöschte Portionen und Austausch-Alternativen konsistent aus allen
  Berechnungen und dem Tag-Sync ausschließen.
- `portion_display` semantisch korrigieren (Pro-Person statt Gesamtmenge).
- Robustheits-Fixes (ZeroDivision-Schutz, toter Code entfernen).

**Non-Goals:**
- Keine Änderung der API-Response-Form oder der Datenbank-Modelle.
- Keine Frontend-Änderungen (rein Backend-Berechnungslogik).
- Keine Neugestaltung des Varianten-/Optional-UX.

## Decisions

### 1. `nutrition_summary` und `cost_summary` auf `active_recipe_items()` umstellen

Statt der Inline-Schleife über `recipe_items` mit eigener `active_ids`-Prüfung rufen beide
Endpoints `active_recipe_items(mi)` auf (wie `shopping_service`). Das entfernt die
fehlerhafte Duplikation und stellt den Default automatisch her.

- **Alternative (verworfen):** Nur die `if`-Bedingung anpassen (z.B. `if active_ids and ...`).
  Lehnt sich ab: Die Duplikation bleibt bestehen und driftet erneut auseinander.

### 2. `_resolve_ingredient_weight_g` filtert `deleted_at` in beiden Pfaden

Der direkte DB-Pfad (`item.ingredient.portions.filter(...).first()`) erhält
`deleted_at__isnull=True`; der Fallback auf die Default-Portion (`rank=1`) ebenso. Damit
liefern Cache- und Direkt-Pfad identische Ergebnisse.

### 3. `sync_recipe_nutritional_tags` schließt inaktive Zutaten aus

Der Query wird um `.exclude(exchange_group__isnull=False, exchange_position__gt=0)` und
`portion__deleted_at__isnull=False` ergänzt — analog zu `get_recipe_nutritional_values`.
Gleiches gilt für den `get_recipe_total_weight_g`-Fallback.

### 4. `portion_display` interpretiert `quantity` pro Person

`resolve_portion_display` entfernt die Division durch `norm_portions` und behandelt
`quantity` als Pro-Person-Menge (konsistent mit allen Berechnungs-Pfaden, dokumentiert in
`test_ingredient_calcs.py`).

### 5. Kleinere Robustheits-Fixes

- `shopping_service`: `reserve_factor = meal_plan.reserve_factor or 1.0` und
  Division durch `max(reserve_factor, epsilon)` zum Schutz vor `reserve_factor = 0`.
- `variant_service.compute_variant_contributions` entfernen (toter Code).

## Risiken / Trade-offs

- **[Verhaltensänderung: Optionals/Austausch jetzt in Nährwert-/Kostenübersicht sichtbar]**
  → Gewollte Korrektur; entspricht `recipe-optional-items` und gleicht die Ansichten an.
  Bestehende Tests (`test_exchanges_and_variants.py`) decken explizite Varianten ab; neue
  Tests sichern den Leer-Auswahl-Fall.
- **[Energie/Kosten-Werte ändern sich für bestehende Pläne]** → Betrifft Pläne mit
  Rezepten, die Optionals/Austausch ohne Variantenauswahl enthalten; Werte werden
  korrekter, nicht falscher.
- **[`portion_display`-Änderung berührt Anzeige]** → Nur kosmetisch; `quantity` bleibt
  unverändert, nur die Interpretation der Pro-Person-Anzeige wird korrigiert.
- **[Soft-delete-Filter kann Werte minimal ändern]** → Nur bei bereits soft-gelöschten
  Portionen ohne Rebind; der Rebind-Mechanismus (`portion_integrity`) läuft unabhängig.

## Migration Plan

Keine Migrationen. Nach dem Merge `uv run pytest` ausführen; zusätzlich den
Rebind-Mechanismus (`rebind_dead_portion_references`) unverändert lassen. Kein Rollback
über DB nötig — bei Problemen einzelne Commits revertieren.

## Open Questions

- Keine offen.
