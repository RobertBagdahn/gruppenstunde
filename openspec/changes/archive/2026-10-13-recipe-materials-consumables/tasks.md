## 1. Backend – Datenmodell und Migration

- [x] 1.1 `Material` um `package_size`, `package_unit`, `price_per_package`, `retail_section` erweitern (+ Stückpreis-Property)
- [x] 1.2 `ContentMaterialItem`: `quantity` numerisch, `quantity_mode` (`per_portion`/`total`); Textmengen migrieren (Fallback 1/`total`) und Migrationsbericht ausgeben
- [x] 1.3 Datenmigration Equipment → Material inkl. Rezept-Verknüpfungen (Menge 1, `total`)
- [x] 1.4 `Equipment`, `Recipe.equipment`, `equipment_ids`, Equipment-Router/Admin entfernen
- [x] 1.5 Command `seed_materials` (idempotent, `--dry-run`) mit gängigen Geräten und Verbrauchsmaterialien
- [x] 1.6 Prod-Schritte (Dry-run zuerst, Anwenden nur nach OK) in den Rollout-Plan eintragen

## 2. Backend – API und Services

- [x] 2.1 Material-Router in `supply/api/` (Liste mit Suche/Filter/Pagination, Detail, Anlegen mit Duplikat-Erkennung, Bearbeiten, Soft Delete, Admin-Zusammenführen) und Pydantic-Schemas
- [x] 2.2 `recipe/api/materials.py` und `schemas/materials.py` auf numerische Menge, Modus und `is_consumable` umstellen
- [x] 2.3 Rezept-Filter `material_slug` / `exclude_material_slug`, `equipment_slug` entfernen
- [x] 2.4 Service `material_aggregation` (Summe für Verbrauch, Maximum für Geräte, Rezeptquellen)
- [x] 2.5 Endpunkte Materialliste für Rezept, Plan und Einkaufsliste inkl. Berechtigungen
- [x] 2.6 Einkaufsliste: `include_consumables`, `ShoppingListItem.material`, Items und Quellen für Verbrauchsmaterial
- [x] 2.7 Kosten-Service: Verbrauchsmaterialkosten in Rezept- und Plankosten
- [x] 2.8 `ai_materials_service`: `is_consumable`, Menge, Modus
- [x] 2.9 PDF: Materialabschnitt in Rezept- und Plan-PDF (die Materialliste selbst wird über die Browser-Druckansicht als PDF gespeichert)

## 3. Frontend (frontend-food)

- [x] 3.1 Zod-Schemas in `schemas/supply.ts`/`recipe.ts`/`content.ts` synchron zu Pydantic; TanStack-Query-Hooks in `api/materials.ts`
- [x] 3.2 Seiten `MaterialListPage` und `MaterialDetailPage` (Suche, Filter, URL-State, Anlegen/Bearbeiten, Admin-Zusammenführen), Route und Hauptmenü-Link
- [x] 3.3 `RecipeMaterialsEditor` auf Menge + Modus + Verbrauch/Gerät umbauen; Equipment-Auswahl in Editor/Wizard entfernen
- [x] 3.4 `RecipeDetailPage`: Abschnitt „Benötigte Geräte“ / „Verbrauchsmaterial“ unter den Zutaten, skaliert mit Portionen
- [x] 3.5 Rezeptliste: Filter „mit/ohne Gerät“ im URL-State
- [x] 3.6 Einkaufsliste: Option „Verbrauchsmaterial aufnehmen“ (Standard an) und Abschnitt „Verbrauchsmaterial“
- [x] 3.7 Materialliste: Ansicht, PDF-Download, Text kopieren, lokales Abhaken; Einstiege in Rezept, Plan und Einkaufsliste
- [x] 3.8 Admin-`EquipmentTab` entfernen, KI-Vorschlagsdialog um Flag/Menge erweitern
- [x] 3.9 Mobile-Prüfung ab 320 px, deutsche UI-Texte mit Umlauten

## 4. Tests

- [x] 4.1 Backend: Migration, Duplikat-Erkennung, Rechte, Aggregation, Einkaufsliste, Kosten, Filter, KI-Schema (`uv run pytest`)
- [x] 4.2 Frontend: Vitest für Editor, Rezeptdetail, Materialseite, Materialliste, Schema-Contract-Tests
- [x] 4.3 Typecheck/Lint (`tsc`, ESLint, Ruff) und manuelle Prüfung im Browser
