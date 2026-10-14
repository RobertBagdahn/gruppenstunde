# Design: Eingabegrenzen für Essenspläne

## Kontext

Die Review vom 2026-10-11 hat bestätigt, dass die Planner-API unmögliche Werte speichert: `reserve_factor=-100`, `activity_factor=1e9`, negative `day_part_factors` und `MealPlanDuplicateIn.norm_portions=-5e9` werden angenommen. Nur `MealPlanCreateIn/UpdateIn.norm_portions` (`gt=0, le=1000`) und `MealItemCreateIn.factor` (`gt=0`) sind begrenzt. `MealItem.quantity` ist `DecimalField(max_digits=10, decimal_places=3)`; zu große Werte enden als Datenbankfehler (HTTP 500) statt als Validierungsfehler.

Betroffene Dateien:

- Backend: `backend/planner/schemas/meal_plan.py` (`MealPlanCreateIn`, `MealPlanUpdateIn`, `MealPlanDuplicateIn`, `MealCreateIn`, `MealUpdateIn`, `MealItemCreateIn`, `MealItemUpdateIn`, `RefMealItemIn`, `WizardItemsIn`, `WizardItemsBulkIn`), `backend/planner/api/meal_plan.py` (`create_meal_plan`, `update_meal_plan`, `duplicate_meal_plan`, Meal-/MealItem-Endpunkte, Kopierpfade), `backend/planner/models/meal_plan.py` (Berechnung `total_scaling`, Tagesanteile), `backend/supply/schemas/` und `backend/supply/api/ingredients.py` (Portionsgewicht).
- Neu: `backend/planner/services/input_bounds.py` mit den Grenzwerten als Konstanten und Prüffunktionen, die alle Schemas und Services verwenden.
- Food-Frontend: `frontend-food/src/schemas/mealPlan.ts`, `frontend-food/src/lib/mealPlanBounds.ts` (gespiegelte Konstanten), `pages/planning/SettingsPanel.tsx`, `components/planning/CreateMealPlanDialog.tsx`, `pages/planning/wizard/ExtendedSettingsSection.tsx`, `pages/planning/wizard/MealPlanWizardPage.tsx`, Meal-Aktionen (Portionen ändern, Soll ändern) und Mengen-Dialoge.

## Grenzwerte (Vorschlag zur Owner-Freigabe)

Alle Werte sind **Vorschlagswerte** und vor der Umsetzung vom Owner zu bestätigen.

| Feld | Endpunkte | Vorschlag |
|---|---|---|
| `reserve_factor` | Plan anlegen/ändern | 1,0 bis 2,0 |
| `activity_factor` (PAL) | Plan anlegen/ändern | 1,0 bis 2,5 |
| `day_part_factors[meal_type]` | Plan anlegen/ändern | je 0 bis 1 |
| Summe `day_part_factors` | Plan anlegen/ändern | höchstens 1,5 (offen, siehe Fragen) |
| `Meal.day_part_factor` | Mahlzeit anlegen/ändern | 0 bis 1 |
| `norm_portions` | Plan anlegen/ändern **und duplizieren** | größer 0 bis 1000 |
| `override_portions` | Mahlzeit ändern | ganze Zahl 1 bis 1000 oder `null` |
| Menge einer Einzelzutat | MealItem anlegen/ändern, Wizard, Referenzmahlzeit | `quantity` > 0 und resultierende Grammmenge (`quantity_g`) höchstens 100 000 g |
| Portionsgewicht `weight_g` | Portion anlegen/ändern | größer 0 bis 100 000 g (gleiche Obergrenze, offen) |
| Planzeitraum | Plan anlegen/ändern/duplizieren | höchstens 60 Kalendertage |
| Mahlzeiten pro Plan | automatische Anlage und einzelnes Hinzufügen | höchstens 500 |

## Entscheidungen

1. **Eine Quelle für Grenzwerte.** `planner/services/input_bounds.py` definiert die Konstanten. Pydantic-Schemas nutzen sie in `Field(ge=…, le=…)` bzw. `field_validator`, Services (Duplizieren, Mahlzeitanlage, Einheitenwechsel) rufen dieselben Prüffunktionen auf. Das Food-Frontend spiegelt die Werte in `lib/mealPlanBounds.ts`; ein Backend-Test vergleicht beide Dateien, wie bei den gemeinsamen Mengen-Fixtures.
2. **Deutsche Feldfehler.** Grenzverletzungen antworten mit HTTP 422, einer deutschen Meldung mit dem erlaubten Bereich („Der Reservefaktor muss zwischen 1,0 und 2,0 liegen.“) und `fields` mit den betroffenen Feldnamen, im bestehenden Fehlerformat (`core/errors.py`). Pydantic-Standardtexte auf Englisch erreichen den Nutzer nicht.
3. **Mengengrenze nach Einheitenauflösung.** Die Obergrenze 100 000 g gilt für die aufgelöste Grammmenge (`resolve_grams`), damit Portionen, Standardmaße und Gramm gleich behandelt werden. Ist das Gewicht unbekannt, gilt nur `quantity > 0` und die Grenze der Datenbankspalte (Anzahl ≤ 100 000).
4. **PATCH prüft nur gesendete Felder.** Wie bei der Nährwertprüfung blockieren Bestandswerte außerhalb der Grenzen keine Änderungen an anderen Feldern. Die Summenregel für `day_part_factors` wird nur geprüft, wenn `day_part_factors` gesendet wird.
5. **Bestandsdaten ohne Migration.** Es gibt keine Datenmigration. Ein Management-Command `report_meal_plan_bounds` (nur lesend) listet Pläne, Mahlzeiten und Einträge außerhalb der Grenzen. Berechnungen (`total_scaling`, Tagesbedarf, Einkaufsliste) begrenzen Bestandswerte zur Laufzeit auf den erlaubten Bereich, damit keine negativen oder astronomischen Mengen entstehen; die Plan-Einstellungen zeigen bei solchen Werten einen Hinweis. Ob stattdessen per Migration korrigiert werden soll, entscheidet der Owner.
6. **Duplizieren nutzt dieselben Regeln.** `MealPlanDuplicateIn` erhält dieselben Grenzen für `norm_portions` und den Zeitraum wie das Anlegen.

## API-Änderungen

Keine neuen Endpunkte. Geänderte Validierung bei:

- `POST /api/meal-plans/`, `PATCH /api/meal-plans/{id}/`, `POST /api/meal-plans/{id}/duplicate/`
- `POST /api/meal-plans/{id}/days/`, `POST /api/meal-plans/{id}/add-day-before/`, `POST /api/meal-plans/{id}/add-day-after/` (Planlänge, Mahlzeitenzahl)
- `POST /api/meal-plans/{id}/meals/`, `PATCH /api/meal-plans/{id}/meals/{meal_id}/`
- `POST /api/meal-plans/{id}/meals/{meal_id}/items/`, `PATCH /api/meal-plans/{id}/meal-items/{item_id}/`, `POST /api/meal-plans/{id}/meals/{meal_id}/wizard-items/`, `POST /api/meal-plans/{id}/meals/wizard-items/bulk/`, Referenzmahlzeit-Items (`RefMealItemIn`), Kopieren von Einträgen
- `POST /api/ingredients/{slug}/portions/`, `PATCH /api/ingredients/{slug}/portions/{portion_id}/`

Request- und Response-Schemas behalten ihre Felder; nur die Wertebereiche werden enger. Zod-Schemas in `frontend-food/src/schemas/mealPlan.ts` erhalten dieselben `min`/`max`.

## Migrationen

Keine Schema-Migration und keine Datenmigration (siehe Entscheidung 5).

## Offene Fragen an den Owner

1. Sind die Vorschlagswerte der Tabelle fachlich richtig (insbesondere Reserve bis 2,0, PAL bis 2,5, 60 Tage, 500 Mahlzeiten)?
2. Soll die Summe der Tagesanteile auf 1,5 begrenzt werden, oder genügt die Einzelgrenze 0 bis 1?
3. Gilt die Obergrenze 100 000 g auch für Portionsgewichte, oder braucht es dort einen eigenen Wert?
4. Braucht `MealItem.factor` eine Obergrenze (bisher nur `> 0`)?
5. Bestandsdaten: zur Laufzeit begrenzen (Vorschlag) oder per Datenmigration korrigieren?

## Freigabe (2026-10-14)

Der Owner hat alle Vorschläge übernommen: Reserve 1,0–2,0, PAL 1,0–2,5, Tagesanteile je 0–1 mit Summe ≤ 1,5, `norm_portions` > 0 bis 1000, `override_portions` 1–1000, Mengen > 0 und ≤ 100 000 g, Portionsgewicht ≤ 100 000 g, Planlänge ≤ 60 Tage, ≤ 500 Mahlzeiten, `MealItem.factor` ≤ 100 (Antwort auf Frage 4), Bestandsdaten nur zur Laufzeit begrenzen (kein Datenmigration).
