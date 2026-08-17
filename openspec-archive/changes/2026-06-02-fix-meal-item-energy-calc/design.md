## Context

`Recipe` besitzt denormalisierte Cache-Felder, die per Signal invalidiert werden:
`cached_energy_kj` (kJ **pro 100g**) sowie `cached_price_total` (Gesamtpreis des Rezepts).

Zwei Pfade berechnen die Energie eines `Meal`/`MealItem` im Backend — inkonsistent:

1. **`nutrition_summary` (`planner/api/meal_plan.py:560-573`) — korrekt**
   Iteriert über `RecipeItem`s, holt das echte Gewicht je Zutat und skaliert:
   ```python
   scale = (weight_g / 100.0) * mi.factor * (norm_portions / recipe_servings)
   energy += ingredient.energy_kj * scale
   ```

2. **`MealItemOut.resolve_energy_kj` / `MealOut.resolve_total_energy_kj`
   (`planner/schemas/meal_plan.py:66-71, 117-125`) — fehlerhaft**
   ```python
   energy = cached_energy_kj * factor * (norm_portions / servings)
   ```
   Hier fehlt der Gewichtsfaktor `Σ weight_g / 100`. `cached_energy_kj` ist ein
   pro-100g-Wert, wird aber wie ein pro-Rezept-Wert behandelt → Werte ~10–20× zu klein.

Symptom auf Prod: Gulasch "32 kcal", Mittagessen "Ist: 3%". Lokal mit
`norm_portions=1` und kleinen Seed-Rezepten fällt es nicht auf, weil die
Größenordnung zufällig im plausiblen Bereich liegt.

`cost_eur` ist nicht betroffen, weil `cached_price_total` bereits ein Total-Wert ist.

## Goals / Non-Goals

**Goals:**
- `MealItemOut.energy_kj` und `MealOut.total_energy_kj` liefern realistische,
  auf `norm_portions` skalierte Gesamtenergien.
- Konsistenz mit `nutrition_summary`: gleiche Energie für dieselbe Datenbasis.
- Performante Serialisierung ohne N+1-Query pro Meal-Item.
- Bestehende Rezepte werden migriert (Cache neu berechnet).

**Non-Goals:**
- Keine Änderung an der Frontend-Anzeige-Logik (Division durch `normPortions`
  bleibt korrekt, sobald das Backend Totals liefert).
- Keine Änderung am `cost_eur`-Pfad.
- Keine neue Coverage-/Cockpit-Logik — `getCoverageStatus` bleibt unverändert,
  nur seine Eingabewerte werden korrekt.

## Decisions

### Entscheidung 1: Neues Cache-Feld `cached_energy_total_kj` statt Inline-Aggregation

**Gewählt:** Ein denormalisiertes Feld `Recipe.cached_energy_total_kj`
(Gesamtenergie in kJ für alle `servings` des Rezepts), analog zu
`cached_price_total`. Resolver greifen darauf zu:
```python
energy_kj = cached_energy_total_kj * factor * (norm_portions / servings)
```

**Alternative A (verworfen): Inline-Aggregation im Resolver.**
Jeder Resolver iteriert über `RecipeItem`s wie `nutrition_summary`. Nachteil:
N+1-Query pro Meal-Item bei jedem Detail-Load (ein MealPlan-Detail hat viele
Items über mehrere Tage). Verletzt Performance-Ziel (<200ms).

**Alternative B (verworfen): `cached_energy_kj` per-100g lassen, im Resolver mit
gecachtem Rezeptgewicht multiplizieren.** Erfordert zusätzlich ein
`cached_weight_g`-Feld und zwei Multiplikationen — komplexer als ein direktes
Total-Feld, ohne Mehrwert.

**Begründung:** Das Total-Feld spiegelt exakt das bewährte Muster von
`cached_price_total`. Die Cache-Infrastruktur (Signale, `recalculate_recipe_cache`)
existiert bereits; es muss nur ein Feld ergänzt werden.

### Entscheidung 2: Wiederverwendung der bestehenden Aggregation in `recalculate_recipe_cache`

`get_recipe_nutritional_values(recipe)` liefert bereits aggregierte **pro-100g**-Werte.
Für das Total wird zusätzlich das Gesamtgewicht des Rezepts benötigt
(`Σ RecipeItem.quantity * portion.weight_g`). Das Total-Energie ergibt sich als:
```python
cached_energy_total_kj = energy_kj_per_100g * (total_weight_g / 100.0)
```
Die Gewichtssumme wird ohnehin in der Preis-Schleife (`recipe_checks.py:220-228`)
über alle Items iteriert — dort kann `total_weight_g` mitgeführt werden, ohne
zusätzliche Queries.

### Entscheidung 3: `update_fields` und Signal-Abdeckung

`cached_energy_total_kj` wird in die `update_fields`-Liste in
`recalculate_recipe_cache` aufgenommen. Da die Invalidierung über dieselben
Signale (RecipeItem-/Ingredient-Änderung) läuft, die bereits
`recalculate_recipe_cache` triggern, ist keine neue Signal-Verdrahtung nötig.

## Risks / Trade-offs

- **[Stale-Cache nach Deploy]** Bestehende Rezepte haben `cached_energy_total_kj = NULL`,
  bis neu berechnet → Resolver würden `None`/0 liefern.
  → Mitigation: Data-Migration bzw. Management-Command-Lauf, der
  `recalculate_recipe_cache` für alle Rezepte ausführt. Resolver behandeln `None`
  defensiv (Rückgabe `None`, Frontend zeigt dann nichts statt falscher 0).
- **[Doppelte Wahrheit Energie]** `cached_energy_kj` (per 100g) und
  `cached_energy_total_kj` (total) müssen synchron bleiben.
  → Mitigation: Beide werden in genau einer Funktion (`recalculate_recipe_cache`)
  aus derselben Quelle berechnet — keine getrennten Update-Pfade.
- **[Frontend-Annahme]** Die Frontend-Anzeige teilt durch `normPortions`. Wenn
  jemand annimmt, das Backend liefere bereits pro Portion, entstünde erneut ein
  Faktor-Fehler. → Mitigation: Spec-Requirement dokumentiert explizit, dass
  `energy_kj`/`total_energy_kj` auf `norm_portions` skalierte **Totals** sind;
  Test prüft Konsistenz mit `nutrition_summary`.

## Migration Plan

1. Feld `cached_energy_total_kj` (nullable Float) zu `Recipe` hinzufügen.
2. `uv run python manage.py makemigrations recipe` + `migrate`.
3. `recalculate_recipe_cache` erweitern (Total-Berechnung + `update_fields`).
4. Data-Migration ODER bestehender Bulk-Recalc-Command, der für alle Rezepte
   `recalculate_recipe_cache` ausführt (Signale während Bulk disconnecten, am Ende
   gebündelt recalc — Muster wie in `import_legacy_food`).
5. Resolver in `planner/schemas/meal_plan.py` umstellen.
6. Frontend-Anzeige verifizieren (keine Codeänderung erwartet).

**Rollback:** Resolver auf alte (fehlerhafte) Berechnung zurücksetzen; das neue
Feld kann bestehen bleiben (ungenutzt), Migration muss nicht zurückgerollt werden.

## Open Questions

- ~~Gibt es bereits einen Bulk-Recalc-Management-Command?~~ **Geklärt:** Der Command
  `recipe/management/commands/recalculate_recipe_caches.py` existiert und wird für
  den Backfill wiederverwendet (kein separater Data-Migration-Code nötig).
