## Context

Aktuell werden Mengenangaben im Food-Frontend inkonsistent angezeigt. Das Backend hat eine `_format_weight()`-Funktion in `backend/shopping/schemas.py` und liefert bereits `display_quantity` und `natural_portions` für Einkaufslisten. Für `RecipeItem` und `MealItem` gibt es keine formatierten Strings. Das Frontend hat `formatWeight()` in `frontend-food/src/utils/formatWeight.ts` und eine reichhaltigere `formatWeight()` in `frontend-food/src/lib/unitConversion.ts` — beide ohne `mg`-Schwelle.

Ziel ist ein einheitliches, Backend-berechnetes Anzeigeformat:
- `3,4 Äpfel (970g)` in Rezept, Essensplan, Kochplan
- `750g · 3×250g · 2×500g` in Einkaufsliste
- `mg`-Anzeige unter 1g

Keine Datenbankmigrationen nötig — ausschließlich Schema- und Formatierungsänderungen.

## Goals / Non-Goals

**Goals:**
- Einheitliches `portion_display`-Feld auf `RecipeItemOut` und `MealItemOut`
- Erweiterter `display_quantity`-String auf `ShoppingListItemOut` mit Packungsoptionen
- `_format_weight()` um `mg`-Stufe ergänzen (< 1g → mg)
- Deutsche Zahlenformatierung (Komma als Dezimalzeichen) in der Anzeige
- `Stück` im Portionsnamen unterdrücken (Ingredient-Name allein genügt)
- Gewicht im Essensplan pro NormPerson mit Hinweis-Badge
- Orange-Markierung für Zutaten ohne `weight_g`
- Packungsoptionen in Einkaufsliste: nur anzeigen, nicht speichern

**Non-Goals:**
- Packungsanzeige in Rezepten oder Essensplan
- Speicherbare Packungsauswahl pro Einkaufslisten-Item
- Umbau der Datenbankmodelle
- Änderungen am `mg`/`g`/`kg`-Speicherformat (Daten bleiben immer in Gramm)
- Breaking Changes an bestehenden API-Feldern (`display_quantity`, `natural_portions` bleiben)

## Decisions

### Entscheidung 1: Backend formatiert, Frontend zeigt an

**Gewählt:** Backend berechnet `portion_display` und liefert fertigen String.

**Rationale:** Konsistenz über alle Views garantiert. Formatierungslogik an einem Ort pflegbar. Frontend muss keine Rohdaten kennen (quantity, portion.weight_g, ingredient.name) um ein korrektes Display zu bauen.

**Alternative:** Frontend berechnet aus Rohdaten. Abgelehnt weil: Logik müsste in mehreren Components dupliziert werden (RecipeDetail, MealSlot, TableView, CookingSchedule), jede View müsste alle nötigen Felder vom Backend kennen.

---

### Entscheidung 2: `portion_display` als neues Feld, bestehende Felder behalten

**Gewählt:** `RecipeItemOut` und `MealItemOut` erhalten `portion_display: str` als zusätzliches Feld. `display_quantity` und `natural_portions` in `ShoppingListItemOut` bleiben erhalten.

**Rationale:** Kein Breaking Change. Bestehende Frontend-Konsumenten müssen nicht sofort migriert werden.

**Alternative:** Bestehende Felder ersetzen. Abgelehnt wegen möglicher Regressionen in anderen Views.

---

### Entscheidung 3: `portion_display` Format-Regel

```
Formel: "{quantity_de} {unit_name} {ingredient_name} ({weight_formatted})"

Sonderfälle:
  - MeasuringUnit.name == "Stück" → unit_name weglassen
    → "{quantity_de} {ingredient_name} ({weight_formatted})"
  - weight_g ist null → keine Klammer, orange-flag im Frontend
    → "{quantity_de} {unit_name} {ingredient_name}" + has_missing_weight: true
  - quantity == ganzzahlig → ohne Dezimalstelle: "3" statt "3,0"
  - quantity hat Nachkommastellen → deutsche Formatierung: "3,4"
  - ingredient.name fehlt → Slug als Fallback
```

**Beispiele:**
```
  RecipeItem: quantity=3.4, portion.measuring_unit.name="Stück",
              portion.weight_g=285, ingredient.name="Äpfel"
  → "3,4 Äpfel (969g)"   ← Stück unterdrückt

  RecipeItem: quantity=1, portion.measuring_unit.name="Prise",
              portion.weight_g=0.3, ingredient.name="Salz"
  → "1 Prise Salz (300mg)"   ← mg-Schwelle

  RecipeItem: quantity=0.5, portion.measuring_unit.name="EL",
              portion.weight_g=15, ingredient.name="Olivenöl"
  → "0,5 EL Olivenöl (8g)"
```

---

### Entscheidung 4: `MealItem.portion_display` pro NormPerson

**Gewählt:** `portion_display` im Essensplan gibt die Menge **pro NormPerson** an (`total_weight_g / norm_portions`). Dazu kommt ein separates Boolean-Feld `is_per_norm_person: true` auf `MealItemOut`, damit das Frontend ein Hinweis-Badge rendern kann.

**Rationale:** Der Essensplan zeigt Rezepte für eine bestimmte Personenzahl. Die Skalierung auf die echte Gruppe erfolgt erst beim Kochen. Es wäre irreführend die Gesamtmenge ohne Kontexthinweis anzuzeigen.

---

### Entscheidung 5: Gewichtsformatierung — Stufen

```python
def _format_weight(grams: float) -> str:
    if grams < 1:
        mg = round(grams * 1000)
        return f"{mg}mg"
    if grams >= 1000:
        kg = grams / 1000
        # 1 Dezimalstelle, trailing zero behalten: 1.0 → "1,0 kg"
        return f"{kg:.1f} kg".replace(".", ",")
    if grams >= 100:
        return f"{round(grams / 10) * 10}g"   # nächste 10g
    if grams >= 10:
        return f"{round(grams / 5) * 5}g"     # nächste 5g
    return f"{round(grams)}g"                  # nächste 1g
```

---

### Entscheidung 6: Packungsanzeige in Einkaufsliste

**Format:** `display_quantity` wird zu `"750g · 3×250g · 2×500g"`

**Berechnung pro Packungsgröße:**
```python
count_exact = quantity_g / portion.weight_g
count_full  = ceil(count_exact)
remainder_g = count_full * portion.weight_g - quantity_g

# Abrunden wenn Rest < reserve_factor-Schwelle (< 10% des Bedarfs)
if remainder_g / quantity_g < 0.10:
    count = floor(count_exact)
else:
    count = count_full

display = f"{count}×{format_weight(portion.weight_g)}"
```

Alle Packungsportionen (`is_system=True`, measuring_unit.name enthält "Packung") werden angehängt, getrennt durch ` · `.

**Datenbankabfrage:** `Portion.objects.filter(ingredient=item.ingredient, name__icontains="packung")`

---

### Entscheidung 7: Implementierungsort für `_format_weight` und `_build_portion_display`

Neue Utility-Funktionen in `backend/supply/utils.py` (neu anlegen). Beide Shopping-Schemas und Recipe-Schemas importieren von dort. So liegt die gesamte Formatierungslogik in einem Modul.

## Risks / Trade-offs

**[Risiko] `portion.weight_g` kann null sein** → `has_missing_weight: true` Flag auf API-Response, Frontend zeigt orange Markierung. Keine Exception.

**[Risiko] Ingredient ohne Packungsportionen** → `display_quantity` bleibt wie bisher (`"750g"`), kein Packungsteil. Kein Fehler.

**[Risiko] Sehr viele Packungsoptionen** → In der Praxis selten (max 2–3 Packungsgrößen pro Ingredient). Kein Limit nötig.

**[Trade-off] Backend berechnet Strings** → Sprachanpassungen (z.B. Englisch) müssten im Backend gemacht werden. Akzeptiert — Plattform ist deutschsprachig.

**[Trade-off] `display_quantity` ist ein String, kein strukturiertes Objekt** → Kein direktes Parsing im Frontend möglich. Akzeptiert — Frontend soll nur anzeigen, nicht verarbeiten.

## Migration Plan

1. Backend: `supply/utils.py` anlegen mit `format_weight()` und `build_portion_display()`
2. Backend: `shopping/schemas.py` — `display_quantity` Logik auf neue Util umstellen, Packungen anhängen
3. Backend: `recipe/schemas/` — `RecipeItemOut` um `portion_display` und `has_missing_weight` ergänzen
4. Backend: `planner/schemas/` — `MealItemOut` um `portion_display` und `is_per_norm_person` ergänzen
5. Frontend: Zod-Schemas synchronisieren
6. Frontend: Views auf `portion_display` umstellen (RecipeDetail, MealSlot, TableView, CookingSchedule)
7. Frontend: `ShoppingListItemRow` — Packungsoptionen neben `display_quantity` rendern
8. Frontend: Orange-Markierung für `has_missing_weight`
9. Frontend: NormPerson-Hinweis-Badge wenn `is_per_norm_person`

Kein Rollback nötig — keine Datenbankänderungen. Alte API-Felder bleiben erhalten.

## Open Questions

- Soll der NormPerson-Hinweis als Tooltip, Badge oder Inline-Text erscheinen? (UI-Entscheidung bleibt dem Entwickler überlassen)
- Soll `has_missing_weight` auch auf `ShoppingListItemOut` erscheinen oder nur auf Recipe/Meal-Level?
