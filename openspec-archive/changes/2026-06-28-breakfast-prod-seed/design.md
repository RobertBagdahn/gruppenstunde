## Context

Das Frühstückssystem ist voll implementiert, aber die Seed-Daten sind zwischen zwei unabhängigen Systemen verteilt:

```
Seed-Quelle A: seed_all._seed_content()     Seed-Quelle B: seed_breakfast_catalog.py
───────────────────────────────             ──────────────────────────────────────
46 generische Ingredient-Einträge           6 Base-Zutaten + 14 Topping-Zutaten
(darunter 9 Frühstücks-Zutaten mit          8 Drink-Rezepte
 abweichenden Nährwerten)                   4 content.Tag-Einträge
19 Rezepte (darunter 2 Frühstücks-,         3 Frühstücks-spezifische Zutaten
 3 Getränke)                                (Frischkäse, Käse Scheiben, etc.)
                                            → seed_drink_recipes (Legacy, 4 Drinks)
```

Auf Produktion läuft nur `seed_all --if-empty` → kein Breakfast-Katalog, keine Tags, keine Drinks, keine warmen Rezepte.

## Goals / Non-Goals

**Goals:**
- Alle Breakfast-Daten (Tags, Bases, Toppings, Drinks, warme Rezepte) landen zuverlässig auf Prod
- Datenkonflikte zwischen `seed_all` und `seed_breakfast_catalog` sind aufgelöst
- Ein einziger Befehl (`seed_all`) erzeugt den vollständigen Datenbestand
- Warme Frühstücksrezepte sind korrekt mit `breakfast-warm-meal` getaggt
- Getränke sind aufgeteilt in Zubereitungspflichtig (Rezept) und Einschenkfertig (Zutat)
- Wurst/Käse sind spezifisch und einkaufbar
- Deployment ist per `cloud-sql-proxy` + Management-Commands auf Prod möglich

**Non-Goals:**
- Keine neuen Django-Models oder Datenbank-Migrationen
- Kein Frontend-Code (Food-Frontend bleibt unberührt) – die UI-Änderungen für den Drink-Split werden separat getrackt
- Keine Data-Migration für bestehende Duplikate auf Prod (wird über Idempotenz gelöst)

## Decisions

### D1: `seed_all` ruft Breakfast-Commands intern auf

```
seed_all()
├── _seed_content(...)       ← bestehende 46 Ingredient-Einträge (minus 9 Overlaps)
├── _seed_recipes(...)       ← bestehende 19 Rezepte
├── call_command('seed_breakfast_catalog')
│   ├── Tags: breakfast-base, -topping, -drink, -warm-meal
│   ├── 6 Base-Zutaten
│   ├── 17 Topping-Zutaten (spezifische Wurst-/Käsesorten)
│   ├── 6 Drink-Zutaten (Milch, Säfte, Hafermilch – tagged als Ingredient)
│   └── 3 Drink-Rezepte (Kaffee, Kakao, Tee – tagged als Recipe)
├── call_command('seed_breakfast_recipes')
│   ├── 5 warme Rezepte (mit Tag breakfast-warm-meal)
│   └── 1 kaltes Rezept (Müsli, recipe_type=cold_meal)
└── restliche seed_all-Aufrufe (events, planner, etc.)
```

Begründung: Die spezialisierten Commands bleiben wartbar und testbar. `seed_all` orchestriert nur. `--if-empty` Flag wird an die Sub-Commands durchgereicht.

### D2: Overlap-Ingredients werden aus `seed_all._seed_content` entfernt

Folgende 9 Einträge wandern aus `seed_all._seed_content` in `seed_breakfast_catalog`:

| Ingredient | seed_all Slug | Grund |
|-----------|---------------|-------|
| Butter | butter | seed_catalog hat bessere Werte (717 vs 730 kcal, BE-kalibrierte Portionen) |
| Honig | honig | dito (304 vs 325 kcal) |
| Nutella | nutella | dito (540 vs 539 kcal, 450g Glas statt generisch) |
| Marmelade | marmelade | dito (265 vs 250 kcal, 500g Glas) |
| Erdnussbutter | erdnussbutter | dito (580 vs 588 kcal, 500g Glas) |
| Leberwurst | leberwurst | dito (330 vs 320 kcal, 250g Packung) |
| Avocado | avocado | dito (gleiche kcal, aber 200g-Portionierung) |
| Hummus | hummus | dito (166 vs 177 kcal, 400g Becher) |
| Kaffee | kaffee | Ist jetzt ein Drink-Rezept, kein Ingredient |

Diese 9 haben in `seed_all` keine anderen RecipeItems außerhalb des Frühstücks (außer Kaffee und Butter, die auch in generischen Rezepten verwendet werden). Für die betroffenen Rezepte in `seed_all._seed_recipes` müssen die RecipeItems auf die neuen Breakfast-Slugs aktualisiert werden.

### D3: `seed_breakfast_catalog` wird zur kanonischen Quelle für alle Breakfast-Zutaten

Zutaten, die bisher in `seed_breakfast_catalog` existieren und in `seed_all` nicht vorkommen, bleiben dort:
- Frischkäse (`frischkaese`)
- Käse (Scheiben) (`kaese-scheiben`) → wird ersetzt durch spezifische Sorten
- Wurst (Scheiben) (`wurst-scheiben`) → wird ersetzt durch spezifische Sorten
- Lachs (Scheiben) (`lachs-scheiben`)
- Marmelade Erdbeere (`marmelade-erdbeere`)
- Konfitüre Himbeere (`konfituere-himbeere`)

### D4: `seed_drink_recipes` wird nicht mehr von `seed_all` aufgerufen

Die 4 Legacy-Drink-Rezepte (Kaffee, Kakao, Tee, Milch) sind ein Subset mit teils abweichenden Nährwerten. Der Command bleibt als Datei erhalten (nicht gelöscht), wird aber nicht mehr von `seed_all` referenziert und erhält einen Deprecation-Hinweis.

### D5: Warme Rezepte erhalten `breakfast-warm-meal` Tag

`seed_breakfast_recipes.py` wird erweitert: Nach Erstellung der Rezepte wird `recipe.tags.add(breakfast_warm_meal_tag)` aufgerufen.

### D6: Deploy-Prozess aktualisiert

`.opencode/skills/deploy/SKILL.md` Phase 7 ändert sich minimal:
- `seed_all` macht jetzt alles → kein separater Aufruf nötig
- Ein Hinweis wird ergänzt: "Phase 7 umfasst jetzt auch Breakfast-Seed-Daten"

Für den initialen Prod-Seed (wenn bereits `seed_all --if-empty` gelaufen ist, aber Breakfast fehlt):
- `cloud-sql-proxy` starten
- `uv run python manage.py seed_breakfast_catalog` (erzeugt Tags + 23 Zutaten + 3 Drink-Rezepte)
- `uv run python manage.py seed_breakfast_recipes` (erzeugt 6 Rezepte mit Tags)

### D7: Getränke-Split — Zutaten vs Rezepte

Bisher waren alle 8 Getränke als `recipe.Recipe` mit `recipe_type="drink"` modelliert. Neu gilt:

**Drink-Zutaten** (Tag `breakfast-drink` auf `supply.Ingredient`):
- Milch, Milch (laktosefrei), Hafermilch
- Saft (Orange), Saft (Apfel), Saft (Multivitamin)
- Diese sind `is_standalone_food=True`, haben Portionen in ml

**Drink-Rezepte** (Tag `breakfast-drink` auf `recipe.Recipe`):
- Kaffee, Kakao, Tee
- Diese erfordern Zubereitung und haben RecipeItems (z.B. Kakao = Kakaopulver + Milch)

Die `BreakfastCatalogOut` API erhält ein neues Feld `drink_ingredients: list[DrinkIngredientOut]`.

### D8: Wurst/Käse spezifisch gemacht

Die generischen Toppings "Käse (Scheiben)" und "Wurst (Scheiben)" werden ersetzt durch einkaufbare, spezifische Sorten:

**Käse:**
- Gouda, Emmentaler, Edamer

**Wurst:**
- Salami, Schinken (gekocht), Putenbrust (Aufschnitt)

## Complete Breakfast Catalog

### Tags (4)
| Slug | Zweck |
|------|-------|
| `breakfast-base` | Basis-Zutaten (Brot, Brötchen) |
| `breakfast-topping` | Belag-Zutaten |
| `breakfast-drink` | Getränke (sowohl Zutaten als auch Rezepte) |
| `breakfast-warm-meal` | Warme Frühstücksrezepte |

### Base-Zutaten (6)
| Name | Slug | Scheibe (g) | kcal/100g | BE |
|------|------|------------|-----------|-----|
| Bauernbrot | bauernbrot | 50 | 265 | 1 Scheibe = 1 BE |
| Toastbrot | toastbrot | 30 | 265 | 1 Scheibe = 1 BE |
| Stuten | stuten | 45 | 280 | 1 Scheibe = 1 BE |
| Körnerbrot | koernerbrot | 55 | 230 | 1 Scheibe = 1 BE |
| Brötchen (halbes) | broetchen-halb | 35 | 265 | ½ Brötchen = 1 BE |
| Brötchen (ganzes) | broetchen-ganzes | 70 | 265 | 1 Brötchen = 2 BE |

### Topping-Zutaten (17)
| Name | Slug | kcal/100g | knapp | normal | üppig | Packung |
|------|------|-----------|-------|--------|-------|---------|
| Butter | butter | 717 | 8g | 10g | 15g | 250g |
| Nutella | nutella | 540 | 15g | 20g | 25g | 450g |
| Marmelade | marmelade | 265 | 15g | 20g | 30g | 500g |
| Honig | honig | 304 | 12g | 15g | 20g | 500g |
| Erdnussbutter | erdnussbutter | 580 | 15g | 20g | 25g | 500g |
| Frischkäse | frischkaese | 342 | 20g | 30g | 40g | 200g |
| **Gouda** | gouda | 356 | 20g | 25g | 35g | 250g |
| **Emmentaler** | emmentaler | 380 | 20g | 25g | 35g | 250g |
| **Edamer** | edamer | 330 | 20g | 25g | 35g | 250g |
| **Salami** | salami | 400 | 25g | 30g | 40g | 200g |
| **Schinken (gekocht)** | schinken-gekocht | 120 | 25g | 30g | 40g | 200g |
| **Putenbrust (Aufschnitt)** | putenbrust-aufschnitt | 105 | 25g | 30g | 40g | 200g |
| Leberwurst | leberwurst | 330 | 25g | 30g | 40g | 250g |
| Lachs (Scheiben) | lachs-scheiben | 155 | 25g | 30g | 40g | 100g |
| Avocado | avocado | 160 | 40g | 50g | 70g | 200g |
| Hummus | hummus | 166 | 20g | 30g | 40g | 400g |
| Marmelade Erdbeere | marmelade-erdbeere | 260 | 15g | 20g | 30g | 500g |
| Konfitüre Himbeere | konfituere-himbeere | 265 | 15g | 20g | 30g | 350g |

### Drink-Zutaten (6) — Tag `breakfast-drink` auf Ingredient
| Name | Slug | kcal/100ml | Portion |
|------|------|-----------|---------|
| Milch | milch | 65 | 200ml |
| Milch (laktosefrei) | milch-laktosefrei | 65 | 200ml |
| Hafermilch | hafermilch | 46 | 200ml |
| Saft (Orange) | saft-orange | 45 | 200ml |
| Saft (Apfel) | saft-apfel | 46 | 200ml |
| **Saft (Multivitamin)** | **saft-multivitamin** | **47** | **200ml** |

### Drink-Rezepte (3) — Tag `breakfast-drink` auf Recipe
| Titel | Slug | kcal/100ml | RecipeItems |
|-------|------|-----------|-------------|
| Kaffee | kaffee | 4 | Kaffeepulver (8g), Wasser (200ml) |
| Kakao | kakao | 77 | Kakaopulver (20g), Milch (200ml) |
| Tee | tee | 1 | Teebeutel (1), Wasser (200ml) |

### Warme Frühstücksrezepte (5) — Tag `breakfast-warm-meal`
| Titel | Slug | Zutaten |
|-------|------|---------|
| Rührei | ruehrei | Ei (2), Butter (5g) |
| Pfannkuchen | pfannkuchen | Ei (1), Mehl (50g), Milch (100ml), Butter (10g) |
| **Omelett** | **omelett** | **Ei (3), Butter (10g), Salz, Pfeffer** |
| **Porridge** | **porridge** | **Haferflocken (80g), Milch (200ml), Honig (10g)** |
| **Gekochte Eier** | **gekochte-eier** | **Ei (2)** |

### Kalte Rezepte (1) — recipe_type=cold_meal
| Titel | Slug | Zutaten |
|-------|------|---------|
| **Müsli** | **muesli** | **Haferflocken (60g), Milch (150ml), Obst gemischt (50g)** |

## Risiken / Trade-offs

| Risiko | Auswirkung | Mitigation |
|--------|-----------|------------|
| Overlap-Ingredients haben RecipeItems in seed_all._seed_recipes (z.B. Butter in Pfannkuchen) | RecipeItems referenzieren per `name__icontains` → finden das Ingredient trotzdem | RecipeItems in seed_all._seed_recipes verwenden `name__icontains` → robust gegen Slug-Änderungen |
| seed_breakfast_catalog läuft vor seed_all._seed_content (z.B. bei Neu-DB) | Butter etc. werden zuerst mit Catalog-Werten erstellt → seed_all._seed_content überschreibt sie mit generischen Werten | Reihenfolge in seed_all sicherstellen: erst `_seed_content`, dann `call_command('seed_breakfast_catalog')` |
| Prod hat bereits Daten aus seed_all (wenn deploy schonmal lief) | breakfast_catalog überschreibt nichts (get_or_create) → die 9 Overlap-Ingredients bleiben mit seed_all-Werten | Manuell seed_breakfast_catalog ausführen oder `--force` Flag |
| Drink-Split erfordert API-Änderung | Frontend erwartet `drink_recipes`, bekommt jetzt auch `drink_ingredients` | Neues API-Feld `drink_ingredients` ist additiv → kein Breaking Change |
| seed_breakfast_catalog verwendet `slug`-basiertes get_or_create, seed_all verwendet `name`-basiertes | Unterschiedliche Dedup-Strategy → Race Conditions | Nach Entfernung der 9 Overlaps aus seed_all existiert jedes Ingredient nur in einer Quelle → kein Race |

## Migration Plan

### Initialer Prod-Seed (einmalig)

```bash
# 1. cloud-sql-proxy starten
cloud-sql-proxy inspi-441320:europe-west3:inspi-primary

# 2. Breakfast-Tags + Catalog + Drink-Zutaten einspielen
cd backend
uv run python manage.py seed_breakfast_catalog

# 3. Breakfast-Rezepte einspielen  
uv run python manage.py seed_breakfast_recipes

# 4. Verifikation
curl https://inspi-backend-xxxxx-ey.a.run.app/api/breakfast-catalog/
# → 6 Bases, 17 Toppings, 6 Drink-Zutaten, 3 Drink-Rezepte, 5 warm meals
```

### Normales Deploy (nach Code-Änderung)
`seed_all` läuft automatisch → Breakfast-Daten werden über interne Aufrufe mit erzeugt. `--if-empty` verhindert Duplikate bei Wiederholung.

### Rollback
Kein Rollback nötig (Idempotenz). Bei Problemen: einzelne Tags/Ingredients/Rezepte über Django-Admin löschen und erneut seeden.
