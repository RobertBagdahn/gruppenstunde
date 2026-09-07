# Technischer Audit: Zutaten, Rezepte, Essensplan & Einkaufsliste

> **Datum:** 18. August 2026
> **Status:** Befund & Analyse zur Vorbereitung von OpenSpec-Fix-Proposals
> **Fokus:** Datenfluss, Berechnungslogik, Skalierung, Datenintegrität und Schnittstellen

---

## Inhaltsverzeichnis

1. [Architektur & Datenfluss](#1-architektur--datenfluss)
2. [Kritische Logikfehler (Schweregrad: Hoch / Blocker)](#2-kritische-logikfehler)
   - [2.1 Nutri-Score: kcal-Werte gegen kJ-Schwellenwerte](#21-nutri-score-kcal-werte-gegen-kj-schwellenwerte)
   - [2.2 Phantom-Mahlzeiten durch `RefMeal` in Einkaufsliste & Nutrition-Summary](#22-phantom-mahlzeiten-durch-refmeal)
   - [2.3 Fehlende direkte Zutaten im Kochplan & Kochplan-PDF](#23-fehlende-direkte-zutaten-im-kochplan--kochplan-pdf)
   - [2.4 Multi-Portions-Rezept-Skalierungsfehler in Cockpit & Ampelregeln](#24-multi-portions-rezept-skalierungsfehler)
   - [2.5 Text-Parsing-Workaround im PDF-Export der Einkaufsliste](#25-text-parsing-workaround-im-pdf-export)
3. [Konstruktions- & Datenintegritäts-Widersprüche](#3-konstruktions--datenintegritäts-widersprüche)
   - [3.1 Stiller 1-Gramm-Fallback bei Portionen](#31-stiller-1-gramm-fallback-bei-portionen)
   - [3.2 Verdrängung des `Package`-Modells durch Küchenportionen](#32-verdrängung-des-package-modells)
   - [3.3 Totes Modell `UnitConversion`](#33-totes-modell-unitconversion)
   - [3.4 `RecipeItem.portion` Nullable vs. Code-Realität](#34-recipeitemportion-nullable-vs-code-realität)
   - [3.5 REWE-Export Mengenkalkulation & Packungs-Fallback](#35-rewe-export-mengenkalkulation)
   - [3.6 Persistente Einkaufsliste ohne Re-Sync-Mechanismus](#36-persistente-einkaufsliste-ohne-re-sync)
4. [Priorisierte Maßnahmenmatrix](#4-priorisierte-maßnahmenmatrix)

---

## 1. Architektur & Datenfluss

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                DOMÄNEN-ÜBERSICHT                                │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐        ┌───────────────┐        ┌─────────────────┐
   │   Ingredient    │───────▶│    Portion    │◀───────│  MeasuringUnit  │
   │ (per 100g data) │        │ (Grammgewicht)│        │ (g, ml, Stk...) │
   └────────┬────────┘        └───────┬───────┘        └─────────────────┘
            │                         │
            ▼                         ▼
   ┌─────────────────┐        ┌───────────────┐
   │     Package     │        │  RecipeItem   │
   │ (Kauf-Packung)  │        │ (Zutat/Menge) │
   └─────────────────┘        └───────┬───────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │     Recipe      │
                             │(portions: 1..N) │
                             └────────┬────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            ▼                                                  ▼
   ┌─────────────────┐   Direct Ingredient (Wizard/Snack)  ┌─────────────────┐
   │    MealItem     │◀────────────────────────────────────│   RefMeal       │
   │ (Recipe/Direct) │                                     │  (Template)     │
   └────────┬────────┘                                     └─────────────────┘
            │
            ▼
   ┌─────────────────┐
   │      Meal       │ (effective_portions, day_part_factor, override_portions)
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │    MealPlan     │ (norm_portions, reserve_factor, scaling_factor)
   └────────┬────────┘
            │
   ┌────────┴──────────────┬──────────────────┬──────────────────┐
   ▼                       ▼                  ▼                  ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ ShoppingService  │  │Nutrition-Summary│  │ Cockpit-Regeln   │  │ CookingSchedule │
│ (Zutaten-Summen) │  │  (Makro/Mikro)  │  │(Ampelbewertung)  │  │(Ablauf/Zutaten) │
└──────────────────┘  └─────────────────┘  └──────────────────┘  └─────────────────┘
```

---

## 2. Kritische Logikfehler

### 2.1 Nutri-Score: kcal-Werte gegen kJ-Schwellenwerte
* **Datei:** `backend/supply/services/nutri_service.py` (Zeilen 24, 38, 95)
* **Problem:** Die Grenzwerttabellen `SOLID_ENERGY_THRESHOLDS` und `BEVERAGE_ENERGY_THRESHOLDS` (z. B. `[335, 670, 1005, ..., 3350]`) basieren auf dem offiziellen französischen Nutri-Score-Algorithmus und sind in **Kilojoule (kJ)** definiert.
* **Code-Befund:**
  ```python
  neg_energy = _lookup_points(ingredient.energy_kcal, energy_t)
  ```
  `ingredient.energy_kcal` (in kcal) wird ohne Umrechnung ($1\text{ kcal} = 4,184\text{ kJ}$) direkt mit der kJ-Tabelle verglichen.
* **Konsequenz:** Reines Fett (900 kcal / 100g = 3765 kJ) müsste die maximale Punktzahl (10 Strafpunkte) erhalten. Da $900 \le 1005$, erhält es lediglich **2 Strafpunkte**. Nahezu kein Lebensmittel im System erhält mehr als 1–2 Energie-Strafpunkte. Alle berechneten Nutri-Scores sind systematisch zu positiv verzerrt.
* **Fehlender Natrium-Fallback:** Wenn `ingredient.sodium_mg` `None` ist (weil nur `salt_g` gepflegt wurde), vergibt `_lookup_points(None)` 0 Punkte. Salzhaltige Lebensmittel erhalten 0 Salz-Strafpunkte.

---

### 2.2 Phantom-Mahlzeiten durch `RefMeal`
* **Dateien:**
  - `backend/supply/services/shopping_service.py` (Zeile 93)
  - `backend/planner/api/meal_plan.py` (Zeile 1236)
  - `backend/recipe/services/nutrition_aggregation.py` (Zeile 220)
* **Problem:** Ein `RefMeal` (`is_reference=True`) ist eine Vorlage (z. B. Standard-Frühstück), die auf reale Mahlzeiten synchronisiert wird. Die Vorlage selbst ist keine verzehrte Mahlzeit.
* **Code-Befund:**
  - `shopping_service.py`:
    ```python
    meal_items = list(MealItem.objects.filter(meal__meal_plan=meal_plan)...)
    ```
    Es fehlt der Filter `meal__is_reference=False`. Die Vorlage wird als zusätzlicher Tag/Mahlzeit in die Einkaufsliste eingerechnet (z. B. 7 reale Frühstücke + 1 Vorlage = 8 Frühstücke eingekauft).
  - `meal_plan.py` (`nutrition_summary`):
    Bei Gesamtplan-Abfragen (`date is None`) summiert der QuerySet alle `MealItems` inklusive der `RefMeal`-Vorlage.
  - `nutrition_aggregation.py` (`_aggregate_meal_plan_values`):
    Summiert `Meal.objects.filter(meal_plan=meal_plan)` ohne `is_reference=False` für die Gesamt-Cockpit-Bewertung.

---

### 2.3 Fehlende direkte Zutaten im Kochplan & Kochplan-PDF
* **Dateien:**
  - `backend/planner/services/cooking_schedule_service.py` (Zeilen 421–424)
  - `backend/planner/services/cooking_schedule_pdf.py` (Zeile 171)
  - `backend/planner/services/pdf_export.py` (Zeilen 168 & 190)
* **Problem:** Mahlzeiten können neben Rezepten auch direkte Einzelzutaten enthalten (`MealItem.ingredient`), z. B. aus dem Frühstücks-Wizard (Brot, Butter, Aufstrich) oder direkte Snacks (Apfel, Banane, Getränke).
* **Code-Befund:**
  - `cooking_schedule_service.py`:
    ```python
    for meal_item in meal.items.all():
        recipe = meal_item.recipe
        if recipe is None or recipe.deleted_at is not None:
            continue
    ```
    Direkte Zutaten werden komplett ignoriert. Sie erscheinen weder im Kochplan noch in der Zeitleiste. Die im Kochplan ausgewiesenen Nährwert- und Kostensummen sind unvollständig.
  - `cooking_schedule_pdf.py`:
    `if not item.recipe: continue` überspringt direkte Zutaten beim PDF-Druck.
  - `pdf_export.py`:
    Rezeptzutaten werden mit `portions * reserve_factor / recipe.portions` skaliert. Direkte Zutaten werden mit `f"{item.quantity} {item.measuring_unit.name}"` unskaliert ausgegeben (für 20 Personen steht *"Brot — 100 g"* statt *"2.000 g"*).

---

### 2.4 Multi-Portions-Rezept-Skalierungsfehler
* **Dateien:**
  - `backend/recipe/services/recipe_checks.py` (Zeilen 199–205)
  - `backend/recipe/services/nutrition_aggregation.py` (Zeile 86)
* **Problem:** Ein Rezept kann für $N$ Portionen angelegt sein (`recipe.portions = 4`). `shopping_service` und `meal_plan.py` dividieren korrekt durch `recipe.portions`. Die Prüf- und Aggregationsdienste tun dies jedoch nicht.
* **Code-Befund:**
  - `recipe_checks.py`:
    ```python
    # Each recipe represents exactly one Normportion (servings is always 1).
    values, total_weight_g = get_recipe_values_with_computed(recipe)
    factor = total_weight_g / 100.0
    value_per_serving = actual_value * factor
    ```
    `total_weight_g` ist das Gesamtgewicht aller 4 Portionen. Die Nährwerte des 4-Personen-Rezepts werden ungeteilt mit den Grenzwerten für 1 Person verglichen $\rightarrow$ Rezept wird fälschlicherweise rot markiert.
  - `nutrition_aggregation.py`:
    ```python
    weight_g = active_item.weight_g or 0.0
    nutrient_scale = (weight_g / 100.0) * item.factor
    ```
    `active_item.weight_g` ist die Menge für alle `recipe.portions`. Die Division durch `recipe.portions` fehlt, wodurch 4-Personen-Rezepte mit 400 % Nährwerten und Kosten im Cockpit aufschlagen.

---

### 2.5 Text-Parsing-Workaround im PDF-Export
* **Datei:** `backend/planner/services/pdf_export.py` (`_aggregate_shopping_list`)
* **Problem:** Der PDF-Export nutzt nicht den etablierten `generate_shopping_list(meal_plan)`-Service, sondern baut formatierte Strings zusammen und versucht diese per Regex zurückzuparsen.
* **Konsequenzen:**
  1. Die Supermarkt-Abteilung wird hardcoded auf `"Sonstiges"` gesetzt; die Gang-Sortierung geht im PDF verloren.
  2. Wenn eine Zutat in verschiedenen Einheiten vorkommt (z. B. 500g aus Rezept A und 2 Stück aus Rezept B), addiert der Parser `500 + 2 = 502` und übernimmt die Einheit des letzten Eintrags (`502 Stück`).

---

## 3. Konstruktions- & Datenintegritäts-Widersprüche

### 3.1 Stiller 1-Gramm-Fallback bei Portionen
* **Datei:** `backend/supply/models/ingredient.py` (`Portion.compute_weight_g`)
* **Mechanismus:** `MeasuringUnit("Stück")` besitzt `quantity = 1.0`. Wird eine Portion *"1 Stück"* ohne `weight_g` gespeichert, berechnet `compute_weight_g` $1 \times 1.0 = 1.0\text{ g}$.
* **Folge:** Großes Stückgut (Kürbis, Wassermelone, Kohlkopf) geht mit 1 Gramm in alle Folgekalkulationen ein.

---

### 3.2 Verdrängung des `Package`-Modells
* **Dateien:** `backend/supply/services/shopping_service.py`, `backend/shopping/schemas.py`
* **Mechanismus:**
  1. `shopping_service.py` fragt nur `ingredient.portions` ab.
  2. `shopping/schemas.py` ruft `build_package_display` nur auf, wenn `compute_portion_options` keinen Treffer liefert. Da fast jede Zutat Küchenportionen hat, wird das `Package`-Modell de facto nie angezeigt.
  3. Die Heuristik in `compute_portion_options` minimiert `abs(count - 1.0)`. Für 1kg Mehl wird *"ca. 6,7 Tassen"* statt *"2x 500g Packung"* empfohlen.

---

### 3.3 Totes Modell `UnitConversion`
* **Dateien:** `backend/supply/models/unit_conversion.py`, `backend/supply/api/unit_conversions.py`
* **Befund:** Das Modell wird an keiner Stelle für Rezept-, Nährwert-, Einkaufs- oder Kochplan-Berechnungen herangezogen. Alle Dienste verlassen sich ausschließlich auf `Portion.weight_g` und `MeasuringUnit.quantity`.

---

### 3.4 `RecipeItem.portion` Nullable vs. Code-Realität
* **Modell:** `RecipeItem.portion` ist `null=True` (*"NULL = Gramm"*).
* **Code-Realität:** Die API (`items.py`) verlangt zwingend eine `portion_id`, und `calculation_context.py` verwirft Items mit `portion is None`. Das Nullable-Feld im Schema/Modell widerspricht der tatsächlichen Geschäftslogik.

---

### 3.5 REWE-Export Mengenkalkulation
* **Datei:** `backend/shopping/api.py` (`_compute_order_quantity`)
* **Logik:**
  ```python
  portion = get_shopping_portion(item.ingredient)  # sucht rank=1 Package
  if not portion:
      portion = item.ingredient.portions.filter(rank=1).first()  # Fallback auf Portion
  if portion and portion.weight_g:
      count = math.ceil(quantity_g / portion.weight_g)
  ```
* **Fehler:** Fehlt ein `Package`, aber es existiert eine `Portion(rank=1)` wie *"1 TL (5g)"*, bestellt der Export für 1000g Mehl $1000 / 5 = 200$ Packungen.

---

### 3.6 Persistente Einkaufsliste ohne Re-Sync-Mechanismus
* **Datei:** `backend/shopping/api.py` (`create_from_meal_plan`)
* **Problem:** Beim Erstellen einer persistenten Einkaufsliste wird ein statischer Snapshot erzeugt. Ändert der Planer nachträglich Rezepte, Portionen oder Tage im MealPlan, veraltet die Einkaufsliste lautlos. Es existiert weder ein Diff-Status noch eine Re-Sync-Funktion.

---

## 4. Priorisierte Maßnahmenmatrix

| Priorität | Bereich | Geplante Maßnahme | Betroffene Komponenten |
| :--- | :--- | :--- | :--- |
| **P1** | **Nutri-Score** | 1. Umrechnung von `energy_kcal` in kJ ($4,184 \times \text{kcal}$) vor Tabellenabgleich.<br>2. Natrium-Fallback aus `salt_g` ($1\text{g Salz} \approx 400\text{mg Natrium}$). | `supply.services.nutri_service` |
| **P1** | **RefMeal** | Konsequenter Ausschluss von `is_reference=True` in `shopping_service`, `nutrition_summary` und `_aggregate_meal_plan_values`. | `supply.services.shopping_service`, `planner.api.meal_plan`, `recipe.services.nutrition_aggregation` |
| **P1** | **Rezept-Portionen** | Standardisierte Division durch `max(recipe.portions, 1)` in `recipe_checks.py` und `nutrition_aggregation.py`. | `recipe.services.recipe_checks`, `recipe.services.nutrition_aggregation` |
| **P1** | **Kochplan Direct Items** | Gleichberechtigte Aufnahme von `MealItem.ingredient` in Kochplan-Generierung, Zeitleiste, PDF-Export und Nährwert-/Kostensummen. | `planner.services.cooking_schedule_service`, `planner.services.cooking_schedule_pdf` |
| **P2** | **PDF Einkaufsliste** | Umstellung des PDF-Exports auf die Ausgaben des zentralen `generate_shopping_list`-Service (inkl. Abteilungen und sauberer Einheiten). | `planner.services.pdf_export` |
| **P2** | **Packages vs. Portionen** | 1. `shopping_service` bindet `Package` bevorzugt ein.<br>2. Heuristik in `compute_portion_options` priorisiert Gebinde und Normportionen vor Hilfsmaßen (TL/Prise). | `supply.services.shopping_service`, `shopping.schemas` |
| **P2** | **Portion Validation** | Unterdrückung des 1g-Fallbacks bei Stück-/Stückgut-Einheiten ohne explizites Gewicht; stattdessen Validierungsfehler oder Pflichtfeld. | `supply.models.ingredient`, `supply.api.ingredients` |
| **P3** | **Einkaufslisten-Sync** | Implementierung eines Sync/Update-Endpunkts für persistente Einkaufslisten bei MealPlan-Änderungen. | `shopping.api`, `frontend-food` |
| **P3** | **Cleanup** | Bereinigung von `UnitConversion` und Bereinigung ungültiger `RecipeTypeChoices` in Suggestion-Services. | `supply`, `planner.services.intelligent_suggestions_service` |
