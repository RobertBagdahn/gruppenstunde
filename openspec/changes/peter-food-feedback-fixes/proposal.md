## Why

Peters Rückmeldungen und der Cloud-Run-Vorfall zeigen reproduzierbare Datenverluste bzw. API-Fehler in Frühstücks- und Portionsabläufen. Der Portions-Zauberstab kann eine neue Normalportion neben einer bestehenden Rang-1-Portion nicht speichern; Frühstücks-Extras verlieren beim Öffnen ihren Namen und beim Speichern ihre ausgewählte Portion; Mengen-Dialoge verhindern temporär leere Zahleneingaben. Zudem soll die Kopier- und Mengenanzeige durch Regressionstests abgesichert werden.

## What Changes

- Verhindern, dass die Bestätigung einer neuen typischen Portion mit einer vorhandenen Rang-1-Portion in einem HTTP-500 endet.
- Frühstücks-Extras mit Namen, Einheit, Menge und Portion round-trip-fähig speichern und wiederherstellen.
- Einheitenamen wie „Gramm“/„Milliliter“ in der Essensplan-Anzeige als Masseinheiten und nicht als Stück-Portionen behandeln.
- Bei einer bestehenden Einzelzutat im Essensplan den Portions-/Einheitenwechsel auf eine andere aktive Portion derselben Zutat anbieten.
- Individuelle Notizen an Essensplan-Einträgen erfassen, anzeigen und beim Kopieren erhalten.
- Bei Zutaten mit bestätigtem Stückgewicht im Buffet-Builder eine klar als Näherung markierte Stückzahl für die geplante Personenzahl anzeigen.
- Mengen-Dialoge während der Eingabe leer/bei 0 bearbeitbar halten und erst beim Bestätigen validieren.
- Kopierverhalten mit Werten für Menge, Einheit, Portion und Faktor explizit testen.

## Nicht-Ziele

- Keine Änderung der absichtlich begrenzten Omnibar-Vorschau ohne bestätigte Produktentscheidung.
- Keine Änderungen an Cloud-SQL-Kapazität ohne aktuellen Reproduktions-/Betriebsnachweis.
- Kein automatisches Überschreiben vorhandener Essensplan-Notizen oder bestehender Portionen.

## Capabilities

### New Capabilities
- `buffet-piece-estimate`: bestätigtes Stückgewicht für eine ungefähre Gesamtstückzahl im Buffet-Builder anzeigen.

### Modified Capabilities
- `portion-magic-wand`: Auswahl einer zusätzlichen Portion darf nicht an einer bereits belegten Rang-1-Position scheitern; Konflikte müssen kontrolliert und ohne Teiländerung beantwortet werden.
- `breakfast-wizard-direct-meal`: ausgewählte Portionsreferenzen (auch frei gesuchter Extras) müssen direkt und atomar gespeichert sowie im Frühstücks-Assistenten wiederhergestellt werden.
- `meal-item-unit-edit`: Einheitenwechsel in der Plan-Zeile speichert sofort bei gleichem Gewicht mit „Rückgängig“; Gramm-/Milliliter-Aliase werden als Masse/Volumen angezeigt.
- `meal-item-note`: Notizen in Tages- und Tabellenansicht bearbeiten, nur lesend ohne Bearbeitungsrecht, beim Kopieren erhalten.
- `meal-plan-duplicate`: Plan-Duplikat und Einträge-Kopie übernehmen Portion, Buffet-/Frühstücksmetadaten und Mengen unverändert.

Die temporär leeren Mengen-Dialoge (P-09) sind in `recipe-quantity-input` des Changes `fix-wizard-ingredient-review-and-quantities` spezifiziert und werden hier nicht doppelt geführt.

## Impact

- Backend: `backend/supply/services/portion_magic_wand.py`, `backend/supply/services/buffet_catalog.py`, zugehörige Buffet-Katalog-API/Schemas, `backend/planner/api/meal_plan.py`, Planner-Model/Schemas und Tests.
- Food-Frontend: Frühstücks-Schemas, `StepExtras.tsx`, `BreakfastWizardPage.tsx`, `refMealToWizardState.ts`, Mengen-Dialoge und Meal-Slot-Anzeige.
- Pydantic-/Zod-Verträge bleiben synchron. Eine additive Migration ist für `MealItem.note` erforderlich; Stückgewichte werden zur Laufzeit aus aktiven vertrauenswürdigen Portionen abgeleitet.
