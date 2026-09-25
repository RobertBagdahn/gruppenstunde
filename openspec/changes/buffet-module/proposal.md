## Why

Das Frühstücksmodul soll zu einem **Buffet-Modul** werden, das auch für andere Mahlzeiten taugt. Konkreter Anlass: Für den Bundesrat sind mittags belegte Baguettes geplant (Peter), für die Halloween-Fahrt wird ebenfalls damit geplant. Heute geht das nicht sauber:

- **Kaputter Baukasten**: Der einzige eingebundene Builder (`BreakfastQuickBuilder`, `MealSlot.tsx:29`) speichert Mengen falsch. `quantity` wird als Gramm **für die ganze Gruppe** berechnet, aber mit der Einheit der Default-Portion („Stück“, „Scheibe“) gespeichert. Das Backend rechnet `MealItem.quantity` als Menge **pro Person** und multipliziert erneut mit der Personenzahl (`cooking_schedule_service.py:423`). Bei 10 Personen werden aus 80 g Brot pro Person so 8000 Stück. Das ist dieselbe Fehlerklasse wie „1 Tonne Kartoffeln zu viel“ bei VIA.
- Außerdem: fest verdrahtete DB-IDs als Standardauswahl, geschätzte statt berechnete kcal (`550 + 40 × Beläge`), nur 6 Einträge je Kategorie.
- **Tags voller Dubletten und Unsinn** (lokale DB = Prod-Export):
  - Brötchen 3×, 7 Margarinen (6 davon Entwurf ohne Nährwerte), Marmelade 2×, Avocado in zwei Kategorien
  - Tschai 3×, Glas Apfelsaft 2×, 5 VIA24-Mottogetränke
  - 8 Brot-Rezepte und 3 Backrezepte unter „warme Gerichte“
  - Tag-Namen sind Slugs (UI zeigt „breakfast-base“)
- **Keine Unterscheidung süß/herzhaft** → Nutella auf dem Mittags-Baguette.
- `wizard-items` legt still Portionen mit einem 10-g-Fallback an (`planner/api/meal_plan.py:1043`).

## What Changes

- **Buffet-Rollen als Tags** (`content.Tag`, `group="buffet"`, Eltern-Tag `buffet`, deutsche Namen, englische Slugs):
  - `buffet-bread` Brot & Gebäck, `buffet-fat` Streichfett
  - `buffet-savory` Belag herzhaft, `buffet-sweet` Belag süß
  - `buffet-condiment` Soßen & Würze, `buffet-fresh` Gemüse & Obst
  - `buffet-cereal` Müsli & Joghurt, `buffet-drink` Getränke, `buffet-dish` Gerichte
  - Rollen gelten für Zutaten **und** Rezepte.
- **Buffet-Vorlagen als DB-Modell** (`planner.BuffetTemplate` + `BuffetTemplateRole`), gepflegt nur von Staff (Django-Admin). Eine Vorlage legt fest, für welche Mahlzeitentypen sie gilt, welche Rollen aktiv sind, die Menge pro Person je Rolle und die Standardauswahl. Seed: „Frühstück“, „Belegte Baguettes“, „Abendbrot“.
- **Ein Buffet-Builder** (`components/buffet/BuffetBuilder.tsx`) ersetzt `BreakfastQuickBuilder`. Er ist aus jedem Mahlzeiten-Slot aufrufbar (nicht nur Frühstück); die Vorlage ist nach Mahlzeitentyp vorausgewählt.
- **Mengenlogik im Backend**: neuer Endpunkt `POST /api/meal-plans/{id}/meals/{meal_id}/buffet/` mit `dry_run` für die Vorschau. Das Backend rechnet Mengen pro Person und speichert Zutaten **immer in Gramm** (Getränke in Milliliter) und Rezepte als `factor`. Das Frontend rechnet keine Mengen mehr.
- **Buffet-Zustand an der Mahlzeit** (`Meal.buffet_template`, `Meal.buffet_role_amounts`, `MealItem.buffet_role`), damit der Builder beim erneuten Öffnen die Auswahl zeigt und beim Speichern nur Buffet-Einträge ersetzt.
- **Neuer Katalog** `GET /api/supply/buffet-catalog/?template=<slug>`, gruppiert nach Rolle. Der Filter `is_standalone_food` entfällt; die Rollen-Tags sind die Kuratierung.
- **Alter 6-Schritt-Assistent bleibt unverändert**: `GET /breakfast-catalog/` bildet die neuen Rollen auf die alten Felder ab (Adapter).
- **Mengen-Schutz**:
  - `wizard-items` legt keine Portionen mehr automatisch an (422 bei unbekannter Einheit)
  - Plausibilitätswarnung bei mehr als 1500 g oder mehr als 50 Stück pro Person, für Mahlzeit-Einträge und Einkaufsliste
- **Daten-Bereinigung**: Command `migrate_buffet_roles` mit `--dry-run` nach der freigegebenen Tabelle in `design.md`. Er ordnet alte Tags auf Rollen um, führt Dubletten über die bestehenden Merge-Funktionen zusammen, entfernt unpassende Rezepte aus dem Katalog (ohne sie zu löschen) und ergänzt fehlende Zutaten.
- **BREAKING**:
  - Tags `breakfast-base`, `-fat`, `-topping`, `-extra`, `-drink`, `-warm-meal` werden entfernt
  - Seed-Befehle `seed_breakfast_catalog` und `tag_breakfast_prod` werden durch `migrate_buffet_roles` und `seed_buffet_templates` ersetzt
- **Voraussetzung**: `ingredient-status-visibility-unification` ist umgesetzt. Von dort stammen:
  - das einheitliche Sichtbarkeitsmodell (Katalog, Speichern)
  - der Status `draft`/`verified`
  - der Verifizierungsweg
  - das Entfernen von `/breakfast-catalog/debug/` und der toten Frühstücks-Helfer

## Capabilities

### New Capabilities
- `buffet-roles`: Rollen-Tags für Buffet-Zutaten und -Rezepte (Zutaten und Rezepte, deutsche Namen, Pflege über bestehende Tag-Picker).
- `buffet-templates`: Staff-gepflegte Vorlagen mit Mahlzeitentypen, Rollen, Mengen pro Person und Standardauswahl.
- `buffet-builder`: Katalog-API, Speichern/Vorschau-Endpunkt mit Backend-Mengenlogik, Builder-UI für alle Mahlzeitentypen.
- `meal-quantity-plausibility`: Einheitenschutz beim Speichern von Mahlzeit-Einträgen und Plausibilitätswarnungen pro Person.
- `buffet-data-cleanup`: Einmalige, freigegebene Datenmigration der Frühstücks-Tags auf Rollen inkl. Dubletten-Merge.

### Modified Capabilities
- `breakfast-single-screen-builder`: wird durch `buffet-builder` ersetzt (Requirements entfernt).
- `breakfast-spread`: Streichfett-Tag heißt `buffet-fat`; Katalog-Adapter liefert `fat_ingredients` daraus, ohne `is_standalone_food`-Filter.
- `breakfast-mealplan-groups`: Gruppierung im MealSlot nach Buffet-Rolle, für alle Mahlzeitentypen.
- `ingredient-ai-suggest`: `belag`-Portionsvorschläge bei Rolle `buffet-savory` oder `buffet-sweet` statt `breakfast-topping`.
- `food-access-policy`: Die Ausnahme „Ingredient reference exceptions“ (eingeführt durch `ingredient-status-visibility-unification`) nennt statt des Frühstücks-Builders den Buffet-Builder; der Katalog listet nur Lesbares.

## Impact

- **Backend**
  - `planner/models/buffet.py` (neu): `BuffetTemplate`, `BuffetTemplateRole`
  - `planner/models/meal_plan.py`: `Meal.buffet_template`, `Meal.buffet_role_amounts`, `MealItem.buffet_role`
  - **Migrationen**: `planner` (Schema) und `content` (Daten: Rollen-Tags anlegen)
  - `planner/api/buffet.py` (neu), `planner/schemas/buffet.py` (neu), `planner/services/buffet_service.py` (neu)
  - `planner/services/quantity_plausibility.py` (neu)
  - `supply/api/buffet_catalog.py` (neu; ersetzt die Logik in `breakfast_catalog.py`, das zum Adapter wird)
  - `planner/api/meal_plan.py` (`wizard-items` ohne Auto-Portion, Warnungen)
  - Einkaufslisten-Service (Warnungen)
  - Merge-Logik aus `content/api/data_quality.py:535/633/665` in `supply/services/ingredient_merge.py` und `recipe/services/recipe_merge.py` extrahieren
  - Commands `migrate_buffet_roles`, `seed_buffet_templates`; `seed_breakfast_catalog.py` und `tag_breakfast_prod.py` entfernen
  - `supply/services/ingredient_ai_suggest_service.py` (Tag-Bedingung)
  - Django-Admin für Vorlagen
- **Pydantic**:
  - neu: `BuffetTemplateOut`, `BuffetRoleOut`, `BuffetCatalogOut`, `BuffetCatalogItemOut`, `BuffetSaveIn`, `BuffetSelectionIn`, `BuffetResultOut`, `QuantityWarningOut`
  - geändert: `MealItemOut` (+ `buffet_role`), `MealOut` (+ `buffet_template_id`), Antworten von Meal-Item- und Einkaufslisten-Endpunkten (+ `warnings`)
- **Frontend (`frontend-food/`)**
  - `components/buffet/BuffetBuilder.tsx` (neu), `api/buffet.ts` (neu), `schemas/buffet.ts` (neu)
  - `pages/planning/MealSlot.tsx` (Einstieg für alle Mahlzeitentypen, Gruppierung nach Rolle)
  - `schemas/mealPlan.ts` (Zod-Sync)
  - Warnungs-Anzeige in MealSlot und Einkaufsliste
  - `components/breakfast/BreakfastQuickBuilder.tsx` und dessen Test werden entfernt
- **Daten**: ca. 60 Einträge werden umgetaggt bzw. zusammengeführt; der Command läuft auf Prod nach Dry-Run-Freigabe.
