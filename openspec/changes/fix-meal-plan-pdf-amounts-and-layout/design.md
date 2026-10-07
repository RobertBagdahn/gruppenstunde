## Context

Der Essensplan-PDF-Export (`backend/planner/services/pdf_export.py`, Template `meal_plan_pdf.html`) formatiert Zutatenmengen selbst: `_get_recipe_ingredients` druckt `base_qty × scale` plus `portion.measuring_unit.name`, `_format_scaled_direct_quantity` ignoriert `MealItem.portion`. `quantity` ist aber ein Vielfaches der Portion (`RecipeItem`-Docstring: Gesamtgewicht = `quantity × portion.weight_g`). Für Portionen wie „100g Gurke" (quantity 1, weight 100) oder „1 EL (10ml)" (quantity 10, weight 10) entsteht dadurch ein Fehler um den Portionsfaktor. Die Einkaufsliste (`generate_shopping_list`) rechnet über `resolve_trusted_weight` korrekt, formatiert im PDF aber alt („ca. 3 x Stück") statt wie die App (`frontend-food/src/lib/shoppingItemDisplay.ts`).

Prod-Befund (Plan 18, nur lesend geprüft): Samstag-Frühstück nutzt gewählte Portionen („0,16 × 100g"), Sonntag-Frühstück direkte Gramm; Rezept 523 hat 0 Schritte (Duplikate 514/515 haben 4); Fr-Abendessen und So-Mittagessen haben keine Items.

Constraint: Peters Plandaten (Gerichte, Mengen, Portionen, Zeiten) werden nicht geändert.

## Goals / Non-Goals

**Goals:**
- Mengen im PDF stimmen mit dem berechneten Gewicht überein (Karten und Einkaufsliste konsistent).
- Ein gemeinsamer Python-Formatter für Karten, Direktzutaten, Schritt-Platzhalter und Einkaufsliste.
- Fehlende Schritte ehrlich ausweisen; Burger-Schritte per Dry-run-Datenschritt nachtragen.
- Layout ohne Leerseiten und ohne doppelten Zeitplan.

**Non-Goals:**
- Keine Änderung von Plandaten, Zutaten-Dubletten oder Einzelhandelsabteilungen im Katalog.
- Keine API-/Schema-Änderungen, keine Migrationen.
- Kein Umbau der App-Anzeige (`frontend-food`); nur Spiegelung ihrer Logik im PDF.

## Decisions

1. **Neues Modul `backend/supply/services/amount_formatting.py`.** Funktionen `format_portion_amount(quantity, portion)` und `format_shopping_item(item)`. Gewicht kommt immer aus `resolve_trusted_weight`; `is_direct_metric_portion` entscheidet, ob `quantity` schon Gramm/ml ist. Piece-Portionen zeigen Stück plus „(≈ Gewicht)". Alternative: Formatierung in `pdf_export.py` belassen und flicken — verworfen, weil die Fehlerklasse (Recipe #434) in `step_helpers._format_quantity` und `cooking_schedule_pdf.py` identisch ist.
2. **Einkaufsliste spiegelt `shoppingItemDisplay.ts`.** „Menge · Packungsbedarf oder ≈ Stückzahl"; Gewicht über `format_weight`-Stufen, Volumen für Flüssigkeiten. Stückzahlen im PDF werden auf ganze Stück aufgerundet (Entscheidung Robert). Stückzahl und Gewicht erscheinen immer gemeinsam (Entscheidung Robert); Packungsbedarf und Stückäquivalent stehen nebeneinander. Alternative: gemeinsamer Contract-Test mit Fixtures für Python und TypeScript — als Folgearbeit offen.
3. **Direktzutaten über `MealItem.portion`.** `_resolve_ingredient_weight_g(item) × factor × portions × reserve` liefert das Gewicht; bei gewählter Portion wird ihre Stückzahl gezeigt. Prefetch um `items__portion__measuring_unit` erweitern, um N+1 zu vermeiden.
4. **Schritte skalieren.** `_get_recipe_steps` übergibt den Skalierungsfaktor an `resolve_placeholders`; `step_helpers._format_quantity` nutzt `format_portion_amount`.
5. **Schritt-Hinweise.** Direktzutat ohne Rezept: „Servierfertig" (unverändert, auch Wedges). Rezept ohne Schritte: „Für dieses Rezept sind noch keine Zubereitungsschritte hinterlegt." Eine einzelne unnummerierte Beschreibungszeile gilt nicht als Schritt, sondern wird als Kurzbeschreibung gezeigt.
6. **Frühstückskarte.** Meals vom Typ `breakfast` mit ausschließlich Direktzutaten werden als eine Tabelle (Zutat, Gesamt, p. P.) plus 3–5 feste Aufbau-Schritte gerendert. Die Schritte sind Template-Text, keine Plandaten.
7. **Faktor-Beschriftung.** `portions_label` zeigt „N Personen × F Portionen", wenn `item.factor != 1`.
8. **„Gerichte offen".** Meals ohne Items erscheinen im Zeitplan mit „Gerichte offen" statt Kochstart/Dauer.
9. **Layout.** Zeitplan-Kartenansicht entfällt (Tabelle bleibt); Küchen-Notizen als Block unter der letzten Karte einer Mahlzeit mit `page-break-inside: avoid`; Deckblatt mit Eckdaten, Gesamtkosten (`cached_price_total`-Summe), Zeitplan-Kurzfassung und Allergen-Hinweis; Allergen-Badges je Karte (`_get_recipe_allergens`) und Matrix am Ende. Die fehlenden Allergene im PDF sind ein Datenproblem: In Prod trägt keine der 5705 Zutaten ein Allergen-Tag, Badges und Matrix bleiben deshalb leer, bis die Zutaten getaggt sind (Folgearbeit).
10. **Pro-Person-Angabe.** Kleine Zweitangabe „à X p. P." aus der ungescalten Menge pro Portion.
11. **Rezept 523.** Management Command `fill_recipe_steps_from_duplicate` (Quelle 514/515, Ziel 523) mit `--dry-run` als Default und `--apply`; läuft im gesammelten Prod-Rollout (siehe Rollout-Regel: Dry-run, `--apply` nur nach Roberts OK).

Betroffene Dateien: `backend/planner/services/pdf_export.py`, `backend/planner/services/cooking_schedule_pdf.py`, `backend/recipe/services/step_helpers.py`, `backend/planner/templates/planner/meal_plan_pdf.html`, `backend/supply/services/amount_formatting.py` (neu), neues Management Command unter `backend/recipe/management/commands/`. API-Endpunkte: keine Änderung (`GET /api/.../export-pdf` bleibt). Migrationen: keine.

## Risks / Trade-offs

- [Portionen ohne vertrauenswürdiges Gewicht] → Fallback „N × Portionsname" statt falscher Gramm-Zahl.
- [Aufrunden erhöht die Einkaufsmenge leicht] → Gewicht bleibt als genaue Angabe daneben sichtbar.
- [Python- und TypeScript-Formatter driften auseinander] → Test-Fixtures mit denselben Beispielen; Contract-Test als Folgearbeit.
- [Template-Umbau verschiebt Seitenumbrüche (WeasyPrint-Speicher, siehe `reliable-pdf-exports`)] → Smoke-Test mit großem Plan; keine neuen Bilder.
- [Frühstücks-Aufbauschritte sind feste Texte] → Nur bei reinen Direktzutaten-Frühstücken; Texte allgemein gehalten.

## Migration Plan

Teil des gesammelten Prod-Rollouts (siehe Rollout-Regel). Keine Schema-Migration. Reihenfolge nach dem Backend-Deploy:

1. Dry-run (schreibt nichts):
   `uv run python manage.py fill_recipe_steps_from_duplicate --source 515 --target 523 --append-step "Austernpilze in Streifen schneiden, in der Pfanne scharf anbraten und unter die Jackfruit mischen." --append-step "Brioche-Buns aufschneiden, kurz anrösten, mit Füllung belegen und servieren."`
2. Ausgabe an Robert; `--apply` nur nach seinem ausdrücklichen OK.
3. Rollback: die vier kopierten und zwei ergänzten Schritte von Rezept 523 löschen (Rezept hatte vorher 0 Schritte).

Der Code-Teil ist rückwärts unkritisch: PDF-Export liest nur, es werden keine Plandaten geändert.

## Open Questions

- Allergen-Tagging der Zutaten (heute 0 von 5705 getaggt) als eigener Change.
- Gemeinsamer Contract-Test für Python- und TypeScript-Mengenformat.
