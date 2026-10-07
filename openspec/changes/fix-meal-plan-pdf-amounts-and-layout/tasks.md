## 1. Mengenformatierung (Backend)

- [x] 1.1 `backend/supply/services/amount_formatting.py` prüfen und fertigstellen: `format_portion_amount`, `format_cooking_weight`/`_volume`, `format_shopping_item`
- [x] 1.2 Unit-Tests `backend/supply/tests/test_amount_formatting.py`: Pre-weighed („100g Gurke"), Volumen („1 EL (10ml)"), Piece („Stück", „1 Zwiebel", „Stück (400g)"), direkte Metrik, Gewicht nicht vertrauenswürdig, Flüssigkeit
- [x] 1.3 `_get_recipe_ingredients` in `backend/planner/services/pdf_export.py` auf `format_portion_amount` umstellen
- [x] 1.4 `_format_scaled_direct_quantity`: `MealItem.portion` und `_resolve_ingredient_weight_g` nutzen; Prefetch `items__portion__measuring_unit` in `_build_meal_context` ergänzen
- [x] 1.5 `backend/planner/services/cooking_schedule_pdf.py`: Zutatenmengen auf denselben Formatter umstellen
- [x] 1.6 Pro-Person-Zweitangabe („à X p. P.") in Rezept- und Direktzutaten-Daten ergänzen

## 2. Schritte und Platzhalter

- [x] 2.1 `_get_recipe_steps` mit Skalierungsfaktor aufrufen; `backend/recipe/services/step_helpers.py::_format_quantity` portionsbewusst machen
- [x] 2.2 Tests in `backend/recipe/tests/test_step_helpers.py`: „0,3 × 100g Gurke" skaliert auf 35 Personen ergibt „1,05 kg"
- [x] 2.3 Einzelne unnummerierte Beschreibungszeile nicht als Schritt zählen (`_extract_steps_from_markdown`-Aufrufer), als Kurzbeschreibung durchreichen
- [x] 2.4 Kennzeichen „Rezept vs. Direktzutat" in Item-Daten; Template: Hinweis „Für dieses Rezept sind noch keine Zubereitungsschritte hinterlegt." bzw. „Servierfertig"

## 3. Einkaufsliste im PDF

- [x] 3.1 `_aggregate_shopping_list` auf `format_shopping_item` umstellen (Menge · Packungsbedarf oder Stückäquivalent, ganze Stück aufgerundet)
- [x] 3.2 Tests in `backend/planner/tests/test_pdf_export.py`: 8,8 kg Mehl mit 500-g-Packung, 22,8 Stück wird 23, Flüssigkeit in l

## 4. Layout und Template

- [x] 4.1 Zeitplan-Kartenansicht aus `backend/planner/templates/planner/meal_plan_pdf.html` entfernen, Tabelle behalten
- [x] 4.2 „Gerichte offen" für Mahlzeiten ohne Items im Zeitplan (Kochstart/Dauer ausblenden)
- [x] 4.3 Frühstückskarte: nur Direktzutaten, Tabelle (Zutat, Gesamt, p. P.) plus 3–5 Aufbau-Schritte
- [x] 4.4 Faktor-Beschriftung „N Personen × F Portionen"; Notizblock unter die letzte Karte (`page-break-inside: avoid`), Deckblatt mit Gesamtkosten, Kurzzeitplan und Allergen-Hinweis
- [x] 4.5 Ursache geklärt (Prod, nur lesend): 0 von 5705 Zutaten tragen ein Allergen-Tag (`is_dangerous`), es gibt nur Diät-Tags; Badges und Matrix sind im Template vorhanden, bleiben aber ohne Daten leer. Allergen-Tagging der Zutaten ist Folgearbeit außerhalb dieses Changes
- [x] 4.6 Template-Tests und Smoke-Test: PDF für Plan mit Frühstück, Rezepten, leerer Mahlzeit rendern (keine Leerseiten, kein Doppelzeitplan)

## 5. Daten (Prod-Rollout)

- [x] 5.1 Management Command `fill_recipe_steps_from_duplicate` (Quelle 514/515, Ziel 523): `--dry-run` Default, `--apply` explizit, idempotent, Test mit Fixture
- [x] 5.2 In die Rollout-Checkliste aufnehmen: Dry-run auf Prod, Ergebnis an Robert, `--apply` nur nach seinem OK

## 6. Abschluss

- [x] 6.1 `ruff check`, `makemigrations --check` und `pytest` für `planner`, `supply`, `recipe` grün; einziger Fehlschlag `test_api_endpoints::test_duration_filter` ist unabhängig von dieser Änderung (Dauer-Filter der Plan-Liste, wochentagsabhängig)
- [x] 6.2 PDF für Plan 18 gegen Prod (schreibgeschützte Sitzung) erzeugt: 14 statt 17 Seiten; Margarine Sa 528 g, Salatgurke 1,32 kg / 1,05 kg / 680 g (Liste 3,0 kg), Hummus 1,05 l, Jackfruit 4,44 kg, „Gerichte offen", „37 Personen × 1,5 Portionen"
- [ ] 6.3 Vorschlagsliste an Peter versenden (10 Punkte, Antwort „1b, 2a …"); Plandaten bleiben unverändert
