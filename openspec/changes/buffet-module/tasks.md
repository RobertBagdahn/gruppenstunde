## 0. Voraussetzung

- [ ] 0.1 `ingredient-status-visibility-unification` ist umgesetzt (Sichtbarkeitsmodell, Status, `set_ingredient_status`, Debug-Endpunkt entfernt) und `verify_ingredients_in_approved_recipes` lokal gelaufen; Branch auf diesen Stand bringen
- [ ] 0.2 `portion-superseded-versions` ist umgesetzt (`Portion.objects.active()` für Katalog-Portionen)

## 1. Freigabe

- [ ] 1.1 Zuordnungstabelle in `design.md` (D10) mit Robert durchgehen, offene Fragen (Apfelzimttee 146/415) klären, Freigabe im Change vermerken

## 2. Backend: Modelle und Migrationen

- [ ] 2.1 `planner/models/buffet.py` mit `BuffetTemplate`, `BuffetTemplateRole` (Constraint `unique_role_per_buffet_template`, `clean()` für `meal_types` und `role.group == "buffet"`); Re-Export in `planner/models/__init__.py`
- [ ] 2.2 `Meal.buffet_template`, `Meal.buffet_role_amounts`, `MealItem.buffet_role` in `planner/models/meal_plan.py`
- [ ] 2.3 Schema-Migration `planner` erzeugen und anwenden
- [ ] 2.4 Datenmigration `content`: Eltern-Tag `buffet` und neun Rollen-Tags (Namen, `group="buffet"`, `sort_order`, Lucide-Icon-Namen) idempotent anlegen
- [ ] 2.5 Django-Admin für `BuffetTemplate` mit Inline `BuffetTemplateRole` (Autocomplete für Standard-Zutaten/-Rezepte)

## 3. Backend: Services

- [ ] 3.1 `supply/services/ingredient_merge.py` aus `content/api/data_quality.py` extrahieren (inkl. Übernahme von Nährwerten bei leerem Ziel); API-Endpunkt auf Service umstellen
- [ ] 3.2 `recipe/services/recipe_merge.py` analog extrahieren; API-Endpunkt umstellen
- [ ] 3.3 `planner/services/quantity_plausibility.py` (`check`, Konstanten, `QuantityWarning`)
- [ ] 3.4 `supply/services/buffet_catalog.py` (`items_for_role(user, role_slug)`, Sichtbarkeit via `food_access`, nur aktive Portionen über `portions.active()` aus `portion-superseded-versions`; `weight_per_serving_g = cached_weight_g / max(portions, 1)`)
- [ ] 3.5 `planner/services/buffet_service.py` (`compute_buffet`, `save_buffet` in Transaktion, Ersetzen nur von `buffet_role`-Items)

## 4. Backend: API und Schemas

- [ ] 4.1 `planner/schemas/buffet.py`: `BuffetTemplateOut`, `BuffetTemplateRoleOut`, `BuffetSaveIn`, `BuffetSelectionIn`, `BuffetResultOut`, `BuffetResultItemOut`, `BuffetStateOut`, `QuantityWarningOut`
- [ ] 4.2 `supply/schemas/buffet_catalog.py`: `BuffetCatalogOut`, `BuffetCatalogRoleOut`, `BuffetCatalogItemOut`
- [ ] 4.3 `planner/api/buffet.py`: `GET /meal-plans/buffet-templates/`, `GET|POST /meal-plans/{plan_id}/meals/{meal_id}/buffet/` (`_require_auth` + `_require_edit` bzw. `_require_access`; Auswahl über `get_visible_ingredient_or_404`/`get_visible_recipe_or_404` mit `allow_system_draft=True`)
- [ ] 4.4 `supply/api/buffet_catalog.py`: `GET /supply/buffet-catalog/`; Router in `inspi/urls.py` registrieren
- [ ] 4.5 `supply/api/breakfast_catalog.py` zum Adapter umbauen (D5) auf dem ISVU-Stand (Debug-Endpunkt ist dort bereits entfernt)
- [ ] 4.6 `planner/api/meal_plan.py`: Portion-Automatik und `_derive_portion_weight_g` entfernen, 422 bei unbekannter Einheit, `warnings` in `wizard-items` (einzeln/bulk) und Meal-Item-Create/Update
- [ ] 4.7 `MealItemOut.buffet_role`, `MealOut.buffet_template_id` ergänzen
- [ ] 4.8 Einkaufslisten-Erzeugung aus Plan: `warnings` in der Antwort
- [ ] 4.9 Tag-Schutz: Änderungen an Tags mit `group="buffet"` an Zutat/Rezept nur für Staff (403 sonst, auch für Owner/Creator eines Entwurfs); übrige Tag-Änderungen folgen `food_access.can_edit`
- [ ] 4.10 `supply/services/ingredient_ai_suggest_service.py`: Belag-Bedingung auf `buffet-savory`/`buffet-sweet`

## 5. Backend: Commands und Daten

- [ ] 5.1 `supply/data/buffet_role_mapping.py` aus der freigegebenen Tabelle (ID + erwarteter Name + Aktion + Rolle)
- [ ] 5.2 `supply/management/commands/migrate_buffet_roles.py` (`--dry-run`, Transaktion, Namensprüfung, Zusammenfassung inkl. ⚠️-Liste, Löschen der alten `breakfast-*`-Tags nur ohne Träger)
- [ ] 5.3 `planner/management/commands/seed_buffet_templates.py` (idempotent, Standardauswahl per Name auflösen)
- [ ] 5.4 `seed_breakfast_catalog.py` und `tag_breakfast_prod.py` entfernen, Verweise in `core/management/commands/seed_all.py` ersetzen
- [ ] 5.5 Lokal: `uv run python manage.py migrate_buffet_roles --dry-run` prüfen, dann ausführen; `seed_buffet_templates` ausführen

## 6. Frontend: Schemas und Hooks

- [ ] 6.1 `frontend-food/src/schemas/buffet.ts` (Zod-Spiegel aller Buffet-Schemas inkl. `QuantityWarningSchema`)
- [ ] 6.2 `schemas/mealPlan.ts`: `buffet_role`, `buffet_template_id`, `warnings` in betroffenen Antworten
- [ ] 6.3 `api/buffet.ts`: `useBuffetTemplates(mealType)`, `useBuffetCatalog(templateSlug)`, `useBuffetState(planId, mealId)`, `useBuffetPreview` (debounced Mutation mit `dry_run`), `useSaveBuffet` (invalidiert Meal-Plan-Queries)

## 7. Frontend: UI

- [ ] 7.1 `components/buffet/BuffetBuilder.tsx`: Vorlagenwahl, Rollen-Sektionen mit Chips (Suche ab > 8), Menge pro Rolle, Live-Vorschau (kcal vs. Ziel, Kosten, Warnungen), Wiederherstellung, Mobile ab 320 px, Lucide-Icons und Design-Tokens
- [ ] 7.2 `pages/planning/MealSlot.tsx`: Aktion „Buffet zusammenstellen“ für alle Mahlzeitentypen außer `drinks`, `BreakfastQuickBuilder` ersetzen
- [ ] 7.3 MealSlot-Gruppierung nach Rolle (`buffet_role` → Rollen-Tag), deutsche Überschriften
- [ ] 7.4 Warnungs-Anzeige am MealItem und Hinweisbox in der Einkaufsliste
- [ ] 7.5 `components/breakfast/BreakfastQuickBuilder.tsx` und `.test.tsx` löschen

## 8. Tests

- [ ] 8.1 Backend: `compute_buffet` (Gleichverteilung, Rollen-Override, Zutat g/ml, Rezept-Faktor mit/ohne Gewicht, Personenzahl nicht in `quantity`)
- [ ] 8.2 Backend: Buffet-Endpunkt (dry_run ändert nichts; Speichern ersetzt nur Buffet-Items; 422 bei falscher Rolle; System-Entwurf per ID erlaubt; fremde private Zutat 404; anonym 403; ohne Rolle 404; Betrachter 403)
- [ ] 8.3 Backend: Katalog (Rollenreihenfolge, Sichtbarkeit anonym/Nutzer/Creator/Staff, unsichtbare Standardauswahl entfällt, keine Kürzung, 404 unbekannte Vorlage); Adapter liefert unverändertes Schema für den Assistenten; verbleibende Tests in `test_breakfast_wizard_visibility.py` auf den Adapter umstellen
- [ ] 8.4 Backend: `wizard-items` legt keine Portion an, 422 bei unbekannter Einheit, Gramm-Pfad des Assistenten funktioniert
- [ ] 8.5 Backend: Plausibilität (800 Stück → Warnung, 400 g → keine; Einkaufsliste liefert `warnings`)
- [ ] 8.6 Backend: `migrate_buffet_roles` (Dry-Run ändert nichts, Idempotenz, Namensabweichung wird übersprungen, Brötchen-Merge übernimmt kcal, Merge nur bei `owner=None`, Status/Visibility werden nie geändert, Bericht „manuell prüfen“ zur Laufzeit, alte Tags werden gelöscht)
- [ ] 8.7 Backend: Merge-Services (API-Verhalten unverändert, bestehende Tests grün)
- [ ] 8.8 Frontend: BuffetBuilder (Vorauswahl nach Mahlzeitentyp, keine Default-Auswahl ohne Vorlage, Vorschau wird angezeigt, Speichern ruft Endpunkt ohne eigene Mengenberechnung)
- [ ] 8.9 Frontend: MealSlot-Gruppierung für Mittagessen mit Buffet
- [ ] 8.10 `uv run pytest planner supply recipe content`, `npm run lint`, `npm run typecheck`, `npm test` grün

## 9. Rollout

- [ ] 9.1 DB-Snapshot Prod, `seed_buffet_templates`, `migrate_buffet_roles --dry-run` auf Prod, Ausgabe prüfen, Echtlauf
- [ ] 9.2 „manuell prüfen“-Liste des Befehls abarbeiten (erwartet u. a. Margarine, Kräuterbutter, Hummus, Mayonnaise, Tomaten, Cornflakes): Nährwerte ergänzen, durch Staff verifizieren (`can_verify`/`set_ingredient_status`)
- [ ] 9.3 Peter bitten, die Baguette-Planung für den Bundesrat mit der Vorlage „Belegte Baguettes“ zu testen
