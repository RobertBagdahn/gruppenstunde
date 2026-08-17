## Why

Der Frühstücks-Wizard speichert Getränke korrekt als MealItems, aber das Abschluss-Cockpit (Schritt 5) zeigt nur Basis- und Belag-Zeilen — Getränke, warme Gerichte und Extras sind unsichtbar. Ebenfalls werden beim erneuten Öffnen des Wizards („Frühstücksassistent öffnen") bestehende Getränke-Items nicht in den Wizard-State zurückgeladen. Beides verstößt gegen die bestehende `breakfast-wizard`-Spec, die eine vollständige Transparenz-Tabelle sowie vorausgefüllte Werte beim Wiederöffnen fordert.

## What Changes

- **Frontend**: `StepCockpit` erweitern, sodass die Zusammenfassungstabelle ALLE Wizard-Komponenten zeigt (Getränke, warme Gerichte, Extras) — nicht nur Basis und Belag
- **Frontend**: `BreakfastWizardPage` beim Öffnen mit existierendem RefMeal die Drink-Items aus `refMeal.items` zurück in den Wizard-State laden (neben dem bereits genutzten `day_part_factor`)
- **Frontend**: Energieberechnung im Cockpit um Getränke- und Extras-kcal erweitern (nicht nur Basis+Belag)
- **Frontend**: Normalisieren im Cockpit um Getränke erweitern (verhält sich aktuell nur auf BE-Personen-Skalierung)

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities — dies ist ein Bugfix, der bestehende Spec-Anforderungen erfüllt -->

### Modified Capabilities
- `breakfast-wizard`: Cockpit-Zusammenfassung zeigt jetzt alle Komponenten (nicht nur Basis/Belag), Wizard-State restauriert gespeicherte Getränke beim Wiederöffnen

## Impact

- **Frontend**: `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` (Tabelle + kcal-Berechnung)
- **Frontend**: `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` (State-Initialisierung aus RefMeal)
- **Frontend**: `frontend-food/src/lib/breakfastCalc.ts` (ggf. neue Helper für Getränke-kcal)
- **Keine Backend-Änderungen**: RefMeal speichert und liefert Getränke-Items bereits korrekt
- **Keine Schema-Änderungen**: WizardState enthält bereits alle nötigen Felder
- **Keine Migrations**: Reines Frontend
