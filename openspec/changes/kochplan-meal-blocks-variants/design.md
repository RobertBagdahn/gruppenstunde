## Context

Der Kochplan (`/meal-plans/:id/cooking-schedule`) ist ein read-only, chronologischer Überblick für Köche über alle Mahlzeiten eines Events. Aktuell liefert `GET /api/meal-plans/:id/cooking-schedule/` eine flache Liste von `CookingScheduleItem` pro Tag, sortiert nach Startzeit. Jedes Item repräsentiert ein `MealItem` (ein Rezept im Kontext einer Mahlzeit).

### Aktuelle API-Struktur (vereinfacht)

```
CookingScheduleOut {
  days: [{
    date: "2025-07-15",
    items: [CookingScheduleItem, CookingScheduleItem, ...]  // flach
  }]
}
```

### Probleme

1. **Keine Mahlzeit-Blöcke**: Items verschiedener Meal-Typen (Frühstück, Mittagessen) sind gemischt
2. **Keine Varianten-Gruppierung**: Rezept-Varianten (gleiches Rezept, gleiche `variant_group_id`) erscheinen als separate Zeilen ohne Zusammenhang
3. **Kein Varianten-Name**: `MealItem.display_name` wird nicht durchgereicht
4. **Zutaten-Skalierung ignoriert Varianten**: `_compute_scaled_ingredients` beachtet `active_recipe_item_ids` nicht

## Goals / Non-Goals

**Goals:**
- Geschachtelte API-Struktur: `Day → Meal → RecipeBlock → Variant`
- Varianten-Namen (`display_name`) in der API und im UI zeigen
- Zutaten pro Variante korrekt auf Basis von `active_recipe_item_ids` skalieren
- Kochplan-UI in Meal-Blöcke mit Recipe-Karten und Varianten-Sub-Rows restrukturieren
- Mobile-first: auch auf schmalen Screens (320px) lesbar

**Non-Goals:**
- Keine Änderung am MealPlan-Datenmodell (keine Migration nötig)
- Keine Editier-Funktionalität im Kochplan (bleibt read-only)
- Kein PDF-Export-Update (separates Thema)

## Decisions

### Decision 1: Geschachtelte API statt Frontend-Gruppierung

**Entscheidung**: Backend liefert geschachtelte Struktur.

**Begründung**:
- Der Kochplan ist read-only — die API kann optimiert für einen einzigen Anwendungsfall sein
- Reduziert Frontend-Komplexität (keine Gruppierungslogik im Client)
- Änderungen an der Gruppierungslogik zentral im Backend

**Alternative**: Flache API + Frontend-Gruppierung — verworfen wegen duplizierter Logik und höherer Frontend-Komplexität.

### Decision 2: Neue Pydantic-Schemas statt alter erweitern

**Entscheidung**: Komplett neue Schemas (`CookingScheduleMealOut`, `CookingScheduleRecipeBlockOut`, `CookingScheduleVariantOut`), alte Schemas (`CookingScheduleItemOut`) entfernen.

**Begründung**:
- Die alte `CookingScheduleItemOut` repräsentiert ein einzelnes MealItem — in der neuen Struktur sind Varianten geschachtelt
- Klarer Bruch, keine Rückwärtskompatibilität nötig (laut AGENTS.md)
- Bessere Type Safety und Lesbarkeit

### Decision 3: Varianten-Key = (recipe_id, variant_group_id)

**Entscheidung**: Items mit demselben `recipe_id` und `variant_group_id` gehören zu einem RecipeBlock. Items ohne `variant_group_id` (`null`) bilden einen RecipeBlock mit einer einzelnen Variante.

**Begründung**:
- `variant_group_id` wird beim Batch-Erstellen von Varianten gesetzt (UUID)
- Ein Rezept kann mehrfach in einer Mahlzeit sein (z.B. zwei verschiedene Varianten-Gruppen) — die Kombination recipe_id + variant_group_id ist eindeutig
- Items ohne `variant_group_id` = Einzel-Rezept ohne Varianten

### Decision 4: Zutaten-Skalierung filtert nach active_recipe_item_ids

**Entscheidung**: `_compute_scaled_ingredients` akzeptiert einen optionalen `active_ids: list[int]` Parameter. Wenn gesetzt, werden nur RecipeItems einbezogen, deren ID in `active_ids` ist (plus nicht-exchangbare Items).

**Begründung**:
- Korrekte Zutaten pro Variante (aktuell ein Bug)
- Nicht-exchangbare Items (kein exchange_group) + nicht-optional Items sind immer aktiv
- Exchangbare Items: nur das mit `exchange_position=0` ist default-aktiv, override durch `active_recipe_item_ids`

### Decision 5: Meal-Block = gleiche (serving_time, meal_type, meal_id)

**Entscheidung**: Items werden nach `meal_id` gruppiert. Da keine Migration nötig ist, wird `meal_id` von `MealItem.meal_id` bezogen.

**Begründung**:
- Eindeutig: Ein Meal-Objekt = eine Mahlzeit
- Einfach: `meal_id` ist bereits als FK in MealItem vorhanden
- Erlaubt Meal-Metadaten (display_name, note, override_portions) zu aggregieren

### Decision 6: Varianten-Darstellung im UI als Sub-Rows

**Entscheidung**: Jeder RecipeBlock wird als Card mit Recipe-Titel + Image dargestellt. Darunter pro Variante eine Sub-Row mit:
- Startzeit + Dauer
- Portionsanzahl (effektiv: `portions * factor`)
- Varianten-Name (`display_name`)
- Zutaten + Schritte (ausklappbar pro Variante)

## API-Struktur (neu)

```json
{
  "days": [
    {
      "date": "2025-07-15",
      "day_start_time": "07:00",
      "day_end_time": "20:00",
      "day_duration_minutes": 780,
      "portions": 10,
      "day_nutritional_tags": [],
      "total_cost_eur": 85.50,
      "total_energy_kcal": 18500,
      "meals": [
        {
          "meal_id": 42,
          "meal_type": "breakfast",
          "display_name": "Frühstück",
          "serving_time": "2025-07-15T08:00:00Z",
          "note": "",
          "override_portions": null,
          "total_portions": 20,
          "recipe_blocks": [
            {
              "recipe_id": 7,
              "recipe_title": "Porridge",
              "recipe_slug": "porridge",
              "recipe_image": null,
              "nutritional_tags": [],
              "lead_minutes": 30,
              "start_time": "2025-07-15T07:30:00Z",
              "variants": [
                {
                  "variant_group_id": "uuid-1",
                  "display_name": "mit Honig",
                  "factor": 0.5,
                  "portions": 10,
                  "active_recipe_item_ids": [101, 102],
                  "lead_minutes": 30,
                  "start_time": "2025-07-15T07:30:00Z",
                  "total_cost_eur": 4.50,
                  "total_energy_kcal": 800,
                  "steps": "...",
                  "steps_parsed": [...],
                  "ingredients": [...]
                },
                {
                  "variant_group_id": "uuid-1",
                  "display_name": "ohne Honig",
                  "factor": 0.5,
                  "portions": 10,
                  "active_recipe_item_ids": [101],
                  "lead_minutes": 20,
                  "start_time": "2025-07-15T07:40:00Z",
                  "total_cost_eur": 3.50,
                  "total_energy_kcal": 600,
                  "steps": "...",
                  "steps_parsed": [...],
                  "ingredients": [...]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## UI-Layout (neu)

```
┌───────────────────────────────────────────────┐
│  Montag, 15. Juli 2025                        │
│  ⏱ 07:00 – 20:00 Uhr  │  €85,50              │
│                                               │
│  ┌─ 🥣 Frühstück ──────────────────────────┐  │
│  │  Servieren: 08:00 Uhr · 20 Portionen    │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │ Porridge                          │   │  │
│  │  │ ├ 07:30 (30 Min.) 10× mit Honig   │   │  │
│  │  │ └ 07:40 (20 Min.) 10× ohne Honig  │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ 🍝 Mittagessen ────────────────────────┐  │
│  │  Servieren: 12:00 Uhr · 10 Portionen    │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │ Nudeln mit Tomatensoße            │   │  │
│  │  │ └ 11:00 (60 Min.) 10×             │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ 🍔 Abendessen ────────────────────────┐  │
│  │  Servieren: 18:30 Uhr · 10 Portionen   │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │ Burger                            │   │  │
│  │  │ ├ 17:00 (90 Min.)  7× mit Chili   │   │  │
│  │  │ └ 17:18 (72 Min.) 3× ohne Chili   │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

## Risiken / Trade-offs

| Risiko | Mitigation |
|--------|------------|
| **Große API-Responses** — geschachtelte Struktur kann viel Daten enthalten (alle Zutaten pro Variante), bei 10+ Tagen + 20+ Rezepten | Backend berechnet komplette Response; Frontend cached via TanStack Query. Pagination nicht nötig da read-only und ein Plan typisch < 100 Items. |
| **Komplexität im Backend** — `build_cooking_schedule` muss erheblich umgebaut werden | Schrittweise: erst neue Dataclasses, dann Gruppierungslogik, dann Ingredient-Fix. Tests geben Sicherheit. |
| **Expandierbare Varianten-Details** — auf Mobile kann jede Variante Zutaten + Steps haben, das sind viele ausklappbare Bereiche | Standards: eingeklappt. Nur eine Variante gleichzeitig aufgeklappt. |
| **Lead-Time-Unterschiede bei Varianten** — Varianten können unterschiedliche Startzeiten haben (z.B. mit Chili braucht länger) | Wird korrekt abgebildet: jede Variante hat eigene `start_time` und `lead_minutes`. Der RecipeBlock zeigt die früheste Startzeit. |
