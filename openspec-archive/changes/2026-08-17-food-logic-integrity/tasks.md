## 1. Grundlagen und Modellstand

- [x] 1.1 Den offenen `food-permission-hardening`-Stand mit den Food-Modellen, Router-Pfaden und Factories abgleichen und den `MealPlan.event`-Restvertrag entfernen oder auf `event_relation` migrieren.
- [x] 1.2 Bestehende Migrationen, neue Soft-Delete-Felder und die Event-/MealPlan-Relation mit `uv run python manage.py makemigrations --check` und `uv run python manage.py check` verifizieren.
- [x] 1.3 Die kanonische Zwischenstruktur für aktive MealItems und RecipeItems in `backend/planner/services/` festlegen und mit Typ-Hints sowie einem kleinen Unit-Test absichern.

## 2. Portionen und Rezeptimport

- [x] 2.1 Die Portion-Auflösung im URL-Import auf `(ingredient, name, measuring_unit, quantity)` umstellen.
- [x] 2.2 Referenzierte Portionen beim Import unveränderlich behandeln und bei abweichendem `weight_g` eine separate Portion verwenden oder anlegen.
- [x] 2.3 `source_url` vom Import-Draft über `RecipeCreateIn` bis zum Recipe-Modell persistieren und das Pydantic-Schema prüfen.
- [x] 2.4 API- und Service-Regressionstests für identische Portionen, abweichende Gewichte, referenzierte Portionen und Source-URL-Speicherung ergänzen.
- [x] 2.5 Die fehlende `weight_g`-Eingabe in `frontend-food` für Portionen und Packungen ergänzen und die deutsche Validierung für nicht plausible Werte abbilden.

## 3. Gemeinsame Berechnungslogik

- [x] 3.1 Einen gemeinsamen aktiven Berechnungskontext für RecipeItems und MealItems implementieren, der Soft-Deletes, Varianten, optionale Items, `excluded` und `quantity_override` berücksichtigt.
- [x] 3.2 Kosten-, Nährwert- und Meal-Serialisierungslogik auf den gemeinsamen Kontext umstellen, ohne Faktoren oder effektive Portionen doppelt anzuwenden.
- [x] 3.3 `shopping/services/shopping_service.py` auf aktive Portionen/Packungen und den gemeinsamen Gewicht-Helper umstellen.
- [x] 3.4 `cooking_schedule_service.py` auf Overrides, ausgeschlossene Zutaten, effektive Portionen und konsistente Rundung umstellen.
- [x] 3.5 Makronährstoffe im Kochplan aus denselben effektiven Zutaten wie Energie, Kosten und Einkaufsliste berechnen.
- [x] 3.6 `effective_portions` in `portion_display`, MealItem-Ausgaben, Tagesaggregation und Planaggregation einheitlich verwenden.
- [x] 3.7 Unit-Tests für Gramm, Milliliter, Stück/Portionen, Varianten, Reservefaktor, Mengen-Overrides und Ausschlüsse ergänzen.

## 4. Externe Mahlzeiten und Kosten

- [x] 4.1 Externe Mahlzeiten im `cost_summary` mit `external_cost_per_person × effective_portions` aggregieren.
- [x] 4.2 Das Kosten-Response-Schema um die notwendige Kennzeichnung externer Kosten ergänzen und den Pydantic-/Zod-Vertrag synchronisieren.
- [x] 4.3 Tests für automatische externe Energie, manuelle Energie und externe Kosten pro Person ergänzen.

## 5. Rezeptverifikation und API-Verträge

- [x] 5.1 `verify_recipe` so ändern, dass `confirm=true` bei `can_verify=false` den Status nicht auf `approved` setzt.
- [x] 5.2 Verification-Endpoints gegen die zentrale Sichtbarkeitslogik prüfen und private/unveröffentlichte Rezepte nicht anonyme Statusdaten verraten lassen.
- [x] 5.3 Verifikations-Response als benanntes Pydantic-Schema definieren und die Frontend-Response von `z.any()` auf das konkrete Zod-Schema umstellen.
- [x] 5.4 Tests für fehlende Pflichtfelder, Warnungen, Preview, Staff, Nicht-Staff und anonyme Nutzer ergänzen.

## 6. Meal-Plan- und Frühstücks-Wizards

- [x] 6.1 `useWizardState` und `BreakfastWizardPage` so umbauen, dass asynchron geladene RefMeal-/Katalogdaten genau einmal sicher rehydriert werden.
- [x] 6.2 Getränkeerkennung beim Frühstücks-Rehydrate auf `recipe_type` und den gültigen Backend-Vertrag umstellen.
- [x] 6.3 Meal-Plan-Wizard-Payload um Budget, Sichtbarkeit, Standardzeiten und alle vorgesehenen Einstellungen ergänzen.
- [x] 6.4 Wizard-LocalStorage mit Benutzer-, Plan-, Modus- und Versionskontext versehen und per Zod-Schema validieren.
- [x] 6.5 Abbrechen, Planwechsel, beschädigte Persistenz und fehlgeschlagene KI-Übernahme mit deutschen Fehlerzuständen behandeln.
- [x] 6.6 Frontend-Tests für asynchrone Rehydration, Getränke, Planwechsel, LocalStorage-Invalidierung und vollständige Create-Payloads ergänzen.

## 7. Frontend-Verträge und UI-Flows

- [x] 7.1 Betroffene Zod-Schemas für MealItems, Kosten, Kochplan, externe Mahlzeiten, Portionen und Wizard-State an die Pydantic-Schemas angleichen.
- [x] 7.2 API-Hooks so erweitern, dass alle im Wizard erfassten Felder tatsächlich gesendet werden und KI-Payloads ohne `any` typisiert sind.
- [x] 7.3 Rezept-, Zutaten- und Meal-Plan-Controls ausschließlich über serverseitige `can_edit`-/`can_delete`-Felder steuern.
- [x] 7.4 Kochplan-Frontend auf die aktuelle verschachtelte Backend-Struktur oder einen ausdrücklich stabilisierten Vertrag umstellen.
- [x] 7.5 Offene Portionshinweis-Darstellung in `MealSlot` umsetzen und Zeit-/Datumsberechnungen für `Europe/Berlin` sowie DST testen.

## 8. Integration und Datenqualität

- [x] 8.1 End-to-End-Test vom Rezept über MealPlan, Kosten, Einkaufsliste und Kochplan mit identischen erwarteten Mengen erstellen.
- [x] 8.2 End-to-End-Test für soft-gelöschte Portionen, bestehende RecipeItems und neue MealItems erstellen.
- [x] 8.3 Test für URL-Import, manuelle Bearbeitung, Speichern und erneutes Öffnen des Rezepts erstellen.
- [x] 8.4 Test für Frühstücks-RefMeal, Rehydrate, Änderung und erneutes Speichern erstellen.
- [x] 8.5 Datenqualitäts- oder Management-Command für verdächtige Portionen nur als Bericht prüfen; automatische Bereinigung bleibt ein separater freizugebender Schritt.

## 9. Verifikation und Release

- [ ] 9.1 Food-Backend-Tests mit `uv run pytest recipe/tests planner/tests supply/tests shopping/tests -q` ausführen und alle bestehenden Regressionen beheben.
- [x] 9.2 Food-Frontend mit `npm test -- --run`, `npx tsc --noEmit` und `npm run lint` prüfen.
- [ ] 9.3 Reale Pydantic-/Zod-Responses für Import, Portionen, MealPlan, Kosten und Kochplan vergleichen.
- [ ] 9.4 Desktop- und Mobile-Smoke-Tests für Rezeptdetail, Zutatenbearbeitung, MealPlan, Einkaufsliste, Kochplan und beide Wizard-Modi durchführen.
- [x] 9.5 OpenSpec-Validierung und Migration-Checks ausführen und die Ergebnisse im Change dokumentieren.
