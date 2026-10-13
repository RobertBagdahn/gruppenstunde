## Why

Rezepte brauchen mehr als Zutaten: Verbrauchsmaterial (Pappteller, Schaschlikspieße, Zahnstocher) und Geräte (Backofen, Topf, Auflaufform). Die Grundlagen existieren (`Material`, `ContentMaterialItem`, Materialien-Editor, `Equipment`), sind aber nirgends sichtbar nutzbar: kein Abschnitt in der Rezeptansicht, keine Pflegeseite im Food-Frontend, keine Einkaufs- oder Materialliste. Zwei parallele Konzepte (`Equipment` und `Material`) erschweren zusätzlich die Pflege.

## What Changes

- **BREAKING** `Equipment` und `Recipe.equipment` entfallen; Geräte sind `Material` mit `is_consumable = false`. Daten werden migriert.
- `Material` erhält Packungsgröße + Einheit, Preis pro Packung und einen Einkaufs-Abschnitt (`retail_section`).
- `ContentMaterialItem` erhält eine numerische Menge (`quantity`, Pflicht) und einen Modus `per_portion` / `total`; das freie Textfeld entfällt.
- Rezept-Detailseite zeigt unter den Zutaten einen Abschnitt mit „Benötigte Geräte“ und „Verbrauchsmaterial“, skaliert mit den Portionen.
- Neue öffentliche Seite „Material“ im Food-Frontend (Suche, Filter, Detail, Anlegen/Bearbeiten durch alle eingeloggten Nutzer, Zusammenführen durch Admins).
- Einkaufsliste: Verbrauchsmaterial wird optional (Standard: an) als eigener Abschnitt „Verbrauchsmaterial“ aufgenommen, nur Stückzahl.
- Neue Materialliste (nicht gespeichert) für ein Rezept, einen Essens-/Kochplan und eine bestehende Einkaufsliste: In-App-Ansicht, PDF/Druck, Text-Kopie, lokales Abhaken.
- Verbrauchsmaterialkosten fließen in Rezept- und Plankosten ein.
- KI-Materialvorschlag liefert zusätzlich Verbrauch/Gerät-Flag und Menge pro Portion.
- Rezeptliste filtert „mit Gerät X“ und „ohne Gerät X“ (URL-State).
- Datenmigration Equipment → Material und Seed-Liste gängiger Materialien.

## Capabilities

### New Capabilities
- `material-directory`: Material-Verzeichnis (Felder, Rechte, Seite im Food-Frontend, Duplikate, Seed, Equipment-Migration).
- `material-list`: Materialliste aus Rezept, Plan oder Einkaufsliste (Zusammenfassen, Ausgabe, PDF, Text).

### Modified Capabilities
- `recipe-materials`: Menge numerisch (pro Portion/gesamt), Geräte mit Menge, Anzeige in Rezeptdetail, Kosten, KI-Vorschlag, Wegfall der Equipment-Relation.
- `shopping-list`: Verbrauchsmaterial als optionaler eigener Abschnitt.
- `recipe-filter-uniform`: Filter „mit/ohne Gerät“.

## Impact

- Backend `supply`: `models/material.py`, `models/equipment.py` (entfernt), Migrationen (Schema + Daten), `api/` (neuer `materials`-Router, `equipment`-Router entfällt), `schemas/`, Seed-Command.
- Backend `recipe`: `models/recipe.py` (`equipment` entfällt), `api/materials.py`, `api/recipes.py` (Filter, `equipment_ids`), `schemas/materials.py`, `schemas/recipes.py`, `services/ai_materials_service.py`, Kosten-Service, PDF-Export/Template.
- Backend `shopping`/`planner`: Item-Erzeugung für Material, Materialliste-Endpunkte, Plan-Kosten.
- Pydantic ↔ Zod synchron: `frontend-food/src/schemas/supply.ts`, `recipe.ts`, `content.ts`; Hooks in `src/api/`.
- Frontend `frontend-food`: neue Seiten `pages/materials/*`, `RecipeDetailPage`, `RecipeMaterialsEditor`, `RecipeListPage` (Filter), `ShoppingList*`-Seiten, Plan-Seiten, Admin-`EquipmentTab` entfällt, Navigation.
- Das Haupt-Frontend bleibt unverändert.
- Migration: Schema- und Datenmigration; Prod-Schritte im Rollout-Plan, Dry-run zuerst, Anwendung nur nach OK.
