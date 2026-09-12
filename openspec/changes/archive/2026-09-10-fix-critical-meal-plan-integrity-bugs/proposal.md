# Proposal: fix-critical-meal-plan-integrity-bugs

## Motivation & Problem
Die Tiefenanalyse der Menüplanung hat 10 kritische Fehler und 6 gravierende UX-Brüche offengelegt, die Datenschutz, Sicherheitsberechtigungen, Rechen- und Mengengenauigkeit sowie die tägliche Bedienbarkeit beeinträchtigen:

### Kritisch / Hohe Priorität
1. **Datenschutzleck bei KI-Frühstücken:** Private Frühstückspläne aller Nutzer werden ungefiltert in externe LLM-Prompts (Gemini) gestreut.
2. **Rechteumgehung:** Private Rezepte/Zutaten anderer Nutzer können über direkte IDs via `ref-meals` und `apply-ai` unberechtigt in Pläne eingebunden werden.
3. **Falsche Allergen-Entwarnung im PDF:** Die Allergenmatrix initialisiert ein leeres Set und druckt fälschlicherweise immer „Keine Allergene gefunden“.
4. **Fehlende Mengen- und Variantenskalierung im PDF:** Eintragsfaktoren, Portionsmengen und Varianten-Auswahlen werden ignoriert; Kochmengen weichen drastisch ab.
5. **Einheitenverlust bei KI-Frühstückszutaten:** Beim KI-Apply fehlt `measuring_unit_id`, wodurch Gewicht, Kcal und Kosten auf 0 g / 0 € kollabieren.
6. **Mengenverfälschung im Zutatendialog:** Gramm-Gewicht wird mit Portions-Einheiten (z. B. Scheibe) kombiniert abgeschickt (z. B. 100 Scheiben statt 2 Scheiben / 100 g).
7. **Frühstücks-Wiederöffnungs-Bug:** Zutatenmengen schrumpfen beim erneuten Öffnen im Assistenten um den Faktor `normPortions` (z. B. auf ein Zehntel).
8. **Verlust von Varianten beim Kopieren/Duplizieren:** `active_recipe_item_ids` und `variant_group_id` werden verworfen (z. B. laktosefrei wird wieder Vollmilch).
9. **Zutatenreste bei externen Mahlzeiten:** Nach Umstellung auf Restaurant/extern fließen alte Zutaten weiterhin in den Einkauf und Nährwert ein.
10. **Varianten-Schieberegler Multiplikationsfehler:** Ab 3 Tauschzutaten werden Portionen doppelt multipliziert, sodass z. B. 65 statt 10 Portionen entstehen und das Speichern blockiert wird.

### Mittlere Priorität (UX-Brüche & logische Inkonsistenzen)
11. **Getränke fehlen im zentralen Mahlzeiten-Register:** Der Typ `drinks` fehlt in `MEAL_TYPE_ORDER`, Labels und Farbschemata. In der Tabelle und im Kochplan werden Getränke komplett ausgeblendet.
12. **Keine Zutatensuche im Zutaten-Modus:** Das Suchfeld wird im Zutatenmodus ausgeblendet; Nutzer können nur aus 20 festen Elementen wählen.
13. **Verfrühte Lösch-Erfolgsmeldung mit falschem Undo:** In der Tabelle wird „Item gelöscht [Rückgängig]“ angezeigt, bevor der Bestätigungsdialog überhaupt bestätigt wurde.
14. **Gefährlicher Kontextwechsel beim Frühstücksassistenten:** Klickt man im Menü eines Dienstags-Frühstücks auf „Frühstücksassistent“, öffnet sich die *globale Plan-Referenz* und überschreibt potenziell alle verknüpften Tage.
15. **KI „Anderen Prompt probieren“ ist wirkungslos:** Der Button setzt denselben Prompt erneut und löscht die alten Vorschläge nicht.
16. **Nährwert-Tagesansicht zeigt identischen Durchschnitt:** In der Nährwertansicht wird unter jedem einzelnen Wochentag derselbe gemittelte Planwert gerendert.

## Proposed Changes
- **Backend / Sicherheit & KI:**
  - `meal_plan_ai_service.py`: `_get_breakfast_candidates` strikt auf Templates (`is_template=True`), öffentlich verifizierte Pläne und eigene Pläne des anfragenden Nutzers beschränken.
  - `ref_meal.py` & `meal_plan_ai_service.py`: Einbindung von Rezepten und Zutaten an die zentrale Sichtbarkeitsprüfung (`food_access`-Prüfung) binden.
  - `meal_plan_ai_service.py`: Einheiten (`measuring_unit_id` bzw. Standard-Gramm-Einheit) beim Persistieren von Zutaten mitspeichern.
  - `planner/models/meal_plan.py`: `MealTypeChoices.DRINKS` („drinks“) ergänzen, damit der Typ ein erstklassiger Bürger im Backend ist.
- **Backend / PDF & Konsistenz:**
  - `pdf_export.py`: Allergene tatsächlich aus den enthaltenen Rezepten und Zutaten ermitteln; Zutatenmengen mit `factor`, Einheitenmengen und aktiven Varianten (`active_recipe_items`) korrekt skalieren.
  - `meal_plan.py` (Kopieren & Duplizieren): `active_recipe_item_ids` und `variant_group_id` vollständig auf Zielmahlzeiten übertragen.
  - `shopping_service.py` & Nährwertberechnung: Mahlzeiten mit `is_external=True` strikt von der Aggregation ihrer verwaisten `MealItem`s ausschließen.
- **Frontend / Berechnungen & Dialoge:**
  - `schemas/mealPlan.ts` & `TableView.tsx`: `drinks` in `MEAL_TYPE_ORDER`, `MEAL_TYPE_LABELS`, Farben und Icons integrieren.
  - `RecipeSearchDialog.tsx`: Portionsanzahl und Einheit nicht mit Gesamtgramm vermischen; Suchfeld auch im Zutaten-Modus für Filterung rendern.
  - `refMealToWizardState.ts`: Bereits gespeicherte personenbezogene Zutatenmengen nicht erneut durch `normPortions` teilen.
  - `VariantSliderDialog.tsx`: Formel in `handlePortionChange` korrigieren, sodass Restportionen als Anteile an `totalOthers` und nicht an `effectivePortions` skaliert werden.
  - `TableView.tsx`: Voreiliges Toast & Undo entfernen; Löschtoast erst nach Bestätigung feuern.
  - `MealActionsMenu.tsx`: Klick auf „Frühstücksassistent“ im Menü eines konkreten Tages muss die Mahlzeit-ID mitgeben (`/meal-plans/:id/breakfast/wizard?mealId=...`), nicht die globale Referenz.
  - `StepAiPrompt.tsx`: „Anderen Prompt ausprobieren“ setzt Vorschläge zurück und fokussiert das Textfeld.
  - `SuggestionsView.tsx`: In der Ansicht „pro Tag“ echte Tagesdaten statt des planweiten Durchschnitts anzeigen.

## Success Criteria & Verification
- E2E- und Unit-Tests für alle 16 Befunde verifizieren die Korrektur.
- Keine privaten Nutzerdaten fremder Accounts im Prompt.
- PDF-Ausdruck enthält exakt die Allergene und Mengenskalierungen der App.
- Varianten überstehen Duplizierung und Plan-zu-Plan-Kopie ohne Informationsverlust.
- Schieberegler summiert exakt auf die Soll-Portionen (z. B. 10 Portionen bleiben in Summe 10).
- Getränkezeile ist in Tagesplan, Tabelle und Kochplan durchgängig sichtbar.
- Zutatensuche funktioniert für alle Zutaten.
- Frühstücksassistent aus der Mahlzeit editiert nur diesen Tag.
