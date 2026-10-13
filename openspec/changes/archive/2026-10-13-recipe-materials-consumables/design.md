## Context

`supply.Material` (Verbrauchs-Flag, Kategorie) und `ContentMaterialItem` (GenericFK, Textmenge) existieren, dazu die API `/api/recipes/{id}/materials/`, ein Editor samt KI-Vorschlagsdialog und das getrennte `supply.Equipment` mit `Recipe.equipment` (M2M, Filter `equipment_slug`). Es gibt keine Anzeige im Rezeptdetail, keine Pflegeseite im Food-Frontend und keine Berücksichtigung in Einkaufsliste, Kosten oder Plänen. Das Projekt braucht keine Rückwärtskompatibilität.

## Goals / Non-Goals

**Goals:**
- Ein Konzept (`Material`) für Geräte und Verbrauchsmaterial.
- Rezeptseite, Pflegeseite, Einkaufsliste, Materialliste, Kosten, Filter.

**Non-Goals:**
- Material für Gruppenstunden, Spiele oder Buffet.
- Gespeicherte Materiallisten oder serverseitiges Abhaken.
- Aufrunden auf Packungen in der Einkaufsliste.
- Änderungen am Haupt-Frontend.

## Decisions

1. **Equipment wird in Material überführt.** Datenmigration legt je `Equipment` ein `Material` (`is_consumable=false`, Kategorie `kitchen`, gleicher Name/Slug) an, erzeugt aus `Recipe.equipment` je ein `ContentMaterialItem` (Menge 1, `total`) und entfernt dann `Equipment`, `Recipe.equipment`, `equipment_ids`, den Equipment-Router und den Admin-Tab. Alternative (beides behalten) verworfen: doppelte Pflege, zwei Filter.
2. **Menge numerisch.** `ContentMaterialItem` erhält das neue Feld `amount` (`FloatField`, > 0, Standard 1) und `quantity_mode` (`per_portion` | `total`). Das Textfeld `quantity` bleibt für Gruppenstunden und Spiele bestehen und wird von Rezepten nicht mehr genutzt. Bestehende Rezept-Textmengen werden per Zahl-Parser nach `amount` migriert (Fallback 1, `total`). Skalierung: `per_portion` → `amount × Portionen`, `total` fix, immer auf ganze Stück aufgerundet. Geräte nutzen dasselbe Feld (Anzahl, Standard 1).
3. **Material-Felder.** `package_size` (Float, optional), `package_unit` (Text, z. B. „Stück“), `price_per_package` (Decimal, optional), `retail_section` (FK auf bestehende Einkaufs-Abschnitte, optional). Preis pro Stück = `price_per_package / package_size`; ohne Preis keine Kosten.
4. **Rechte.** Jeder eingeloggte Nutzer darf Material anlegen und eigenes bearbeiten; Admins bearbeiten alles, löschen (Soft Delete) und führen Duplikate zusammen (Verknüpfungen werden umgehängt, Quelle soft-gelöscht). Anlegen prüft Namen normalisiert (case-/Leerzeichen-insensitiv) und liefert bei Treffer das bestehende Material statt eines Duplikats.
5. **Gemeinsamer Service `supply/services/material_aggregation.py`.** Eingabe: Liste (Rezept, Portionen). Ausgabe: je Material `{amount, recipes[]}`. Verbrauchsmaterial wird summiert, Geräte nehmen das Maximum. Wird von Materialliste, Einkaufsliste und PDF genutzt. Materialliste ist reine Berechnung ohne Tabelle; Endpunkte: `GET /api/recipes/{id}/material-list/?servings=`, `GET /api/meal-plans/{id}/material-list/`, `GET /api/shopping-lists/{id}/material-list/`. Pläne nutzen je Mahlzeit `Meal.effective_portions × MealItem.factor` ohne Reservefaktor. Für Einkaufslisten aus einem Rezept speichert `ShoppingList.source_portions` die Portionenzahl.
6. **Einkaufsliste.** Beim Erstellen `include_consumables` (Standard `true`; Body bei `from-recipe`, Query-Parameter bei `from-meal-plan`). `ShoppingListItem` erhält FK `material` (nullable, `ingredient` bleibt nullable) und `unit="Stück"`; Mengen werden in Stück geführt, ohne Packungs-Aufrundung. Das Frontend gruppiert Items mit `material` in einen letzten Abschnitt „Verbrauchsmaterial“. Geräte kommen nie auf die Einkaufsliste. Material-Items sind nicht mit Zutaten verschmelzbar und tragen `ShoppingListItemSource`.
7. **Kosten.** Verbrauchsmaterial mit Preis fließt in die Gesamtkosten ein. Pro Portion (`per_portion`) steckt es in `Recipe.cached_price_total` (Neuberechnung bei Änderung der Verknüpfung oder des Materialpreises per Signal). Feste Mengen (`total`) lassen sich nicht pro Person ausdrücken und werden deshalb nur in den Plankosten (Kostenübersicht und Mahlzeit-Summe) addiert. Geräte kosten nichts.
8. **Filter.** Query-Parameter `material_slug` (mit) und `exclude_material_slug` (ohne); `equipment_slug` entfällt. URL-State wie bei den anderen Filtern.
9. **KI.** `ai_materials_service` liefert pro Vorschlag `is_consumable`, `quantity`, `quantity_mode`; Anwenden bleibt bestätigungspflichtig und atomar.
10. **PDF.** Rezept-PDF und Plan-PDF erhalten den Abschnitt Material. Die Materialliste selbst wird über eine Druckansicht im Browser als PDF gespeichert (kein eigenes serverseitiges Template).
11. **Frontend.** Neue Seiten `pages/materials/MaterialListPage.tsx` und `MaterialDetailPage.tsx`, Hooks in `src/api/materials.ts`, Zod-Schemas in `schemas/supply.ts`. Abhaken der Materialliste speichert lokal (`localStorage`, mit try/catch), nicht auf dem Server.

## Risks / Trade-offs

- Offenes Anlegen erzeugt Duplikate → Normalisierung beim Anlegen, Zusammenführen durch Admins.
- Textmengen lassen sich nicht immer parsen → Fallback 1 `total`, Migrationsbericht listet Zeilen zur Prüfung.
- Entfernen von `Equipment` bricht die API-Verträge → Pydantic/Zod, Tests und Seed-Daten im selben Change anpassen.
- Kosten ohne Preise unterschätzen → Material ohne Preis wird nicht gezählt; Anzeige bleibt ohne Hinweis auf fehlende Preise (kann später folgen).

## Migration Plan

1. Schema-Migration: neue Felder, `quantity` als neues Feld `quantity_value` parallel, Daten übertragen, altes Feld entfernen.
2. Datenmigration Equipment → Material inkl. Rezept-Zuordnungen; Seed-Command `seed_materials` (idempotent, Dry-run).
3. Equipment-Modell und Referenzen entfernen.
4. Prod: Dry-run zuerst, Anwenden nur nach OK des Nutzers; Schritte im Rollout-Plan ergänzen.
Rollback: Datenbank-Backup vor Schritt 3; danach kein Rollback ohne Restore.
