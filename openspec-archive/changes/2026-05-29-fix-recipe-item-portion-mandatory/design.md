## Context

`RecipeItem` hat aktuell drei optionale FKs (`portion`, `ingredient`, `measuring_unit`) und ein `quantity`-Feld ohne klare Semantik. Im Inspi-Altprojekt war das Modell sauber: `quantity` ist immer ein Multiplikator auf eine Portion, und jede Portion kennt ihr Gewicht in Gramm. Dieses Design wird übernommen.

## Goals / Non-Goals

**Goals:**
- `quantity` hat eine einzige Bedeutung: Multiplikator auf `portion`
- `portion_id` ist Pflicht auf `RecipeItem`
- `weight_g` auf `Portion` wird per Signal berechnet
- Bestehende Daten werden automatisch migriert
- Frontend-Editor arbeitet Portion-basiert

**Non-Goals:**
- Keine Änderung an der Portion-Verwaltungs-UI (Admin)
- Keine Änderung am Rezept-Import (CookLang etc.) — wird separat angepasst
- Kein Refactoring der Portion-Display-Logik (nur Vereinfachung der Datenquelle)

## Decisions

### 1. RecipeItem Modell

```python
class RecipeItem(models.Model):
    recipe     = FK(Recipe, CASCADE)
    portion    = FK(Portion, PROTECT)           # PFLICHT, nicht nullable
    quantity   = FloatField(default=1)          # Multiplikator
    sort_order = IntegerField(default=0)
    note       = CharField(max_length=255)

    class Meta:
        constraints = [
            CheckConstraint(check=Q(quantity__gt=0), name="recipe_item_quantity_positive")
        ]
```

`ingredient` und `measuring_unit` werden entfernt — beides ergibt sich aus `portion.ingredient` und `portion.measuring_unit`.

### 2. Portion Modell (Anpassungen)

```python
class Portion(models.Model):
    name           = CharField(max_length=255, default="g")
    measuring_unit = FK(MeasuringUnit, PROTECT)   # PFLICHT
    ingredient     = FK(Ingredient, CASCADE)
    quantity       = FloatField(default=1)          # User-Input: z.B. 200 (ml), 1 (Stück)
    weight_g       = FloatField(validators=[MinValueValidator(0.01)])  # Calculated per Signal
    ...
```

### 3. weight_g Berechnung (Signal)

Bei jedem `Portion.save()`:
- Wenn `measuring_unit.unit == "g"`: `weight_g = quantity × measuring_unit.quantity`
- Wenn `measuring_unit.unit == "ml"`: `weight_g = quantity × measuring_unit.quantity × ingredient.physical_density`
- Sonst (Stück etc.): `weight_g` bleibt wie gesetzt (manuell/AI)

Implementiert als `pre_save` Signal auf `Portion`.

### 4. Basis-Portionen

Jede Ingredient MUSS mindestens eine Basis-Portion haben:
- Feste Stoffe: Portion(name="g", measuring_unit=g_unit, quantity=1, weight_g=1, is_default=True)
- Flüssigkeiten: Portion(name="ml", measuring_unit=ml_unit, quantity=1, weight_g=density, is_default=True)

Erstellt per Datenmigration für alle bestehenden Ingredients ohne Basis-Portion.

### 5. Datenmigration

Schritt 1: Basis-Portionen für alle Ingredients anlegen (wo nicht vorhanden)
Schritt 2: RecipeItems mit `portion_id=NULL`:
- Wenn `ingredient_id` gesetzt → Basis-Portion des Ingredients zuweisen, `quantity` bleibt (= Gramm)
- Wenn `portion_id` bereits gesetzt → nichts tun
- Wenn weder `portion` noch `ingredient` → Item löschen (kaputte Daten)

Schritt 3: `ingredient` und `measuring_unit` Felder von RecipeItem entfernen

### 6. Frontend Editor

Beim Hinzufügen einer Zutat:
- Default: Basis-Portion ("1g") verwenden, quantity = `ingredient.standard_recipe_weight_g`
- User gibt Zahl ein → `quantity` auf Basis-Portion

Beim Speichern:
- Sendet `portion_id` (Pflicht) + `quantity`

### 7. AI Estimate

Gibt weiterhin Gramm zurück. Frontend/Backend rechnet um:
- `new_quantity = estimated_grams / item.portion.weight_g`

## Risks / Trade-offs

- **Migration**: Items ohne Ingredient UND ohne Portion gehen verloren (sollten nicht existieren)
- **Signal-Berechnung**: Bei Stück-basierten Portionen muss `weight_g` manuell korrekt sein — Signal kann es nur für g/ml berechnen
- **Breaking API**: Alle Clients die `ingredient_id` oder `measuring_unit_id` senden, brechen. Da kein externes API → akzeptabel
