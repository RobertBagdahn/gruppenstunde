## Context

Aktuell werden Rezept-Varianten (Austausch-Gruppen, optionale Zutaten) über das `MealItemSplit`-Model gesteuert: Ein MealItem hat Faktor 1.0, und die Anteile werden in separaten Split-Zeilen pro RecipeItem gespeichert. Die Split-Daten sind in der API-Response unsichtbar (kein `splits`-Feld in `MealItemOut`), es gibt kein `prefetch_related`, und die UI kann keine konfigurierten Varianten anzeigen.

Zusätzlich blockiert der `unique_recipe_per_meal`-Constraint mehrere Items desselben Rezepts in einer Mahlzeit — ein zentraler Blocker für den neuen Ansatz.

## Goals / Non-Goals

**Goals:**
- Jede Rezept-Variante wird ein eigenständiges `MealItem` mit eigenem `factor` (Anteil von `effectivePortions`)
- `factor` ist inline editierbar (z.B. "0,33" → 33% der Personen essen dies)
- Varianten-Slider-Dialog erzeugt alle kombinierten Varianten auf einmal (Batch-API)
- Varianten werden eingerückt unter dem Rezept-Titel angezeigt
- Items mit `factor < 0.01` werden ausgeblendet
- `MealItemSplit`-Model, -Service, -API-Endpunkte und -Frontend-Code werden vollständig entfernt
- Einkaufsliste, Nährwerte, Kosten und PDF-Export arbeiten mit dem neuen Modell

**Non-Goals:**
- Kein Speichern von Varianten-Konfiguration als "Template" für Wiederverwendung
- Keine UI zum "Merge" von Varianten zurück zu einem einzelnen Item
- Keine Änderung am Recipe-Model oder RecipeItem-Model
- Keine Änderung an der Rezept-Erstellung/Editierung (Austausch-Gruppen bleiben wie gehabt)

## Decisions

### 1. Speicherung aktiver RecipeItems: JSON-Feld statt Split-Tabelle

**Entscheidung:** `active_recipe_item_ids = JSONField(default=list)` auf `MealItem`

**Begründung:** Ein JSON-Feld ist einfacher als ein separates Model:
- Kein PROTECT-FK mehr, der Löschungen blockiert (muss manuell geprüft werden)
- Keine separaten API-Endpunkte zum Verwalten
- Alle Varianten-Daten direkt auf dem MealItem (weniger Queries)
- PostgreSQL unterstützt JSON-Contains-Query (`active_recipe_item_ids__contains=[42]`) für Delete-Protection

**Nachteil:** Keine FK-Constraint auf DB-Ebene. RecipeItems können gelöscht werden, während sie noch in active_ids referenziert werden. Wird durch manuelle Prüfung im API-Layer abgefangen.

### 2. Varianten-Gruppierung: UUID-Feld variant_group_id

**Entscheidung:** `variant_group_id = UUIDField(null=True)` auf `MealItem`

**Begründung:**
- Frontend gruppiert Items mit gleichem `variant_group_id` und zeigt sie eingerückt an
- UUID wird vom Backend beim Batch-Erstellen vergeben (einmalige UUID pro Batch-Call)
- Nicht-Null bedeutet "dieses Item ist Teil einer Varianten-Gruppe"
- Items ohne `variant_group_id` werden normal (nicht eingerückt) dargestellt

### 3. Energie-/Kosten-Berechnung: Delta vom Cache

**Entscheidung:** `energy_kcal`/`cost_eur` wird per Resolver berechnet:
1. Basis = `cached_energy_total_kcal` × `factor` (Default-Rezept, alle Standard-Mitglieder + alle Optional dabei)
2. Delta = Abweichung durch aktive/nicht-aktive Austausch- und Optional-Items (analog `get_split_delta_total`, aber über `active_recipe_item_ids` statt `MealItemSplit`)
3. Ergebnis = (Basis + Delta) × `factor`

**Begründung:** So bleibt der Recipe-Cache erhalten und die Berechnung ist schnell (nur RecipeItems der Abweichung laden, nicht alle). Der bestehende Delta-Ansatz aus `split_service.py` wird dafür in ein neues Helper-Modul überführt.

Alternativ "alles live berechnen" wurde verworfen: würde 10× mehr DB-Queries pro MealPlan laden bedeuten.

### 4. Batch-API: POST .../items/batch/

**Entscheidung:**
```
POST /api/meal-plans/{plan_id}/meals/{meal_id}/items/batch/
Request: [
  {
    recipe_id: int,
    factor: float,                # 0.0–1.0, Anteil an effectivePortions
    display_name: str | null,    # Optionaler Anzeigename (z.B. "mit Parmesan")
    active_recipe_item_ids: int[],  # IDs der aktiven RecipeItems
  }
]
Response: [
  {
    id: int,
    recipe_id: int,
    recipe_title: str,
    factor: float,
    display_name: str | null,
    active_recipe_item_ids: int[],
    variant_group_id: str,       # gleiche UUID für alle Items dieses Batch
    energy_kcal: float | null,
    cost_eur: float | null,
    ...
  }
]
```

- Atomare Transaktion: alle Items in einem DB-Commit
- Backend generiert `variant_group_id` (UUID4) einmal pro Batch-Call und setzt sie auf alle Items
- Validierung: Σ factor = 1.0 über alle Items im Batch (optional, da Nutzer auch manuell Faktoren editieren können)
- Factors < 0.01 werden nicht akzeptiert (Error) — das Ausblenden passiert im Frontend

### 5. Inline Factor-Edit: PATCH /meal-plans/{id}/meal-items/{itemId}/

Der bestehende `update_meal_item`-Patch-Endpunkt wird erweitert, um `factor` zu akzeptieren. Frontend zeigt Factor als editierbares Input-Feld in der Tagesplan-Ansicht.

### 6. Frontend: Filter factor < 0.01

Frontend filtert Items mit `factor < 0.01` aus der Anzeige (client-seitig, kein API-Filter). Items bleiben in der DB erhalten und tauchen wieder auf, wenn der Factor per API auf >= 0.01 erhöht wird.

### 7. Varianten-Dialog: Vollständige Kombinatorik

Algorithmus im Dialog:
1. RecipeItems nach `exchange_group_id` gruppieren
2. Für jede Exchange-Gruppe: Liste der RecipeItems als Optionen
3. Optionale Items: "mit" / "ohne" als zwei Optionen
4. Kreuzprodukt aller Gruppen und Optionals → Liste der Varianten
5. Jede Variante: Slider (0–effectivePortions), alle Slider summiert = effectivePortions
6. Beim Speichern: Varianten mit portions > 0 → items mit factor = portions/effectivePortions

### 8. Delete-Protection: RecipeItem und Recipe

**RecipeItem-Edit-Protection:** `MealItem.objects.filter(active_recipe_item_ids__contains=[item.id]).exists()` — blockiert Änderungen an `is_optional`/`exchange_group_id` wenn aktive Varianten referenzieren.

**Recipe-Delete-Protection:** `MealItem.objects.filter(recipe=recipe).exists()` — blockiert Löschen wenn MealItems das Rezept referenzieren.

### 9. Shopping-Liste: Neue Logik statt get_included_fractions

```python
def compute_variant_contributions(meal_plan: MealPlan) -> dict[int, float]:
    """Berechnet Gesamtmenge pro RecipeItem über alle Varianten-Items hinweg."""
    contributions = defaultdict(float)
    for meal in meal_plan.meals.all():
        for item in meal.items.filter(recipe__isnull=False):
            # Nur RecipeItems, die in active_recipe_item_ids sind
            recipe_items = item.recipe.recipe_items.filter(id__in=item.active_recipe_item_ids)
            for ri in recipe_items:
                weight_g = ri.quantity * (ri.portion.weight_g or 0)
                contributions[ri.id] += weight_g * item.factor
    return contributions
```

Wird in `shopping_service.py` aufgerufen statt `get_included_fractions`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Combinatorial explosion** — 3 Austausch-Gruppen × 2 Optionen × 1 Optional = 12 Varianten im Dialog | UI zeigt alle Kombinationen, aber die meisten sind 0. Slider sind kompakt (keine Labels bei 0). Dialog bleibt überschaubar für realistische Recipes (max 1-2 Gruppen + 1-2 Optionals = 4-8 Varianten). |
| **Perf-Einbruch MealPlan-Load** — jedes Varianten-Item braucht RecipeItems-Lookup für Energie/Kosten | Prefetch `meals__items__recipe__recipe_items` + `select_related("portion__ingredient")`. Berechnung im Resolver nur einmal pro Item. |
| **Data-Integrität** — RecipeItem wird gelöscht, aber von `active_recipe_item_ids` in MealItems referenziert | API blockiert Delete wenn Referenzen existieren (JSON-Contains-Query). Der Schutz ist jedoch kein DB-Constraint (PROTECT) mehr → bewusster Tradeoff für Simplizität. |
| **Σ factor = 1.0 nicht erzwingbar** — Nutzer kann Faktoren manuell editieren und Summe zerstören | Keine Server-Seite-Validierung nach initialem Batch. Nutzer ist für korrekte Summe verantwortlich. Ein späterer Warn-Hinweis in der UI ist denkbar, aber nicht Teil dieses Changes. |
| **Migration bestehender Daten** — existierende `MealItemSplit`-Einträge müssen konvertiert werden | Sind keine Produktionsdaten (aktive Entwicklung). Migration kann Splits einfach löschen oder überspringen. |

## Open Questions

- Soll der Batch-Endpunkt Σ factor = 1.0 validieren, oder reicht die Client-seitige Validierung im Dialog?
- Soll es eine "Alle Varianten löschen und zu einem Item zusammenfassen"-Funktion geben?
- Wie verhält sich der `MealItemOverride` (quantity_override/excluded) mit `active_recipe_item_ids`? Ein Override auf einer nicht-aktiven Zutat ist sinnlos.
