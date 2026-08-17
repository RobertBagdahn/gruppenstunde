## Why

Rezepte, Zutaten und Essenspläne berechnen Mengen, Kosten, Nährwerte und Kochplan-Daten derzeit über mehrere voneinander abweichende Pfade. Dadurch können gespeicherte Portionen rückwirkend verändert werden, gelöschte Portionen in Einkaufslisten landen und Nutzer unterschiedliche Werte für denselben Essensplan sehen. Zusätzlich verlieren mehrere Wizard- und Import-Flows eingegebene Daten oder laden bestehende Daten nicht zuverlässig.

Der Change bündelt die fachlichen Korrekturen, damit die Food-Flows wieder konsistente Ergebnisse liefern und die wichtigsten Regeln durch Regressionstests geschützt sind. Der laufende Change `food-permission-hardening` bleibt für Berechtigungen, Soft-Delete-Infrastruktur und Relationen zuständig; dieser Change verwendet diese Grundlagen und korrigiert deren fachliche Nutzung.

## What Changes

- Eine kanonische Berechnungsgrundlage für Rezept-, MealItem-, Einkaufslisten-, Kosten-, Nährwert- und Kochplan-Mengen festlegen.
- Ingredient- und RecipeItem-Overrides einschließlich ausgeschlossener Zutaten in allen Berechnungspfaden berücksichtigen.
- Externe Mahlzeiten in Kosten- und Nährwertzusammenfassungen korrekt berücksichtigen.
- Effektive Portionen und Tages-/Reservefaktoren in Anzeige, Kosten, Einkaufsliste und Kochplan einheitlich anwenden.
- Soft-gelöschte Portionen und Packungen aus aktiven Berechnungen und Auswahlpfaden ausschließen.
- URL-Importe portionssicher machen und `source_url` beim Speichern eines importierten Rezepts persistieren.
- Verifikation unvollständiger Rezepte blockieren, sofern Pflichtfelder fehlen.
- Rezept-, Zutaten- und Meal-Plan-Wizards so korrigieren, dass bestehende Daten, Getränke, Einstellungen und KI-Vorschläge nicht verloren gehen.
- Persistierte Wizard-Daten strikt validieren und gegen Benutzer-/Planwechsel isolieren.
- Fehlende Eingabemöglichkeiten für `weight_g` ergänzen und API-/Zod-Verträge synchronisieren.
- Regressionstests für Berechnungswege, Importe, Soft-Delete, Wizard-Rehydration und Frontend/Backend-Verträge ergänzen.
- **BREAKING** Veraltete oder widersprüchliche Berechnungs- und Wizard-Verträge werden durch die kanonischen Felder und Regeln ersetzt.

## Capabilities

### New Capabilities

- `food-calculation-consistency`: Einheitliche Mengen-, Portions-, Override-, Kosten- und Nährwertberechnung über alle Food-Ausgabepfade.
- `food-wizard-state-integrity`: Zuverlässige Rehydration, Validierung und Persistenz der Rezept-, Frühstücks- und Meal-Plan-Wizard-Zustände.

### Modified Capabilities

- `recipe-url-import`: Importierte Quellen und Portionen werden beim Speichern korrekt und referenzsicher übernommen.
- `recipe-verification`: Unvollständige Rezepte dürfen nicht als geprüft/freigegeben markiert werden.
- `portion-data-integrity`: Soft-gelöschte Portionen werden nicht mehr für aktive Berechnungen verwendet.
- `meal-item-override-calc`: Overrides gelten konsistent für Kosten, Nährwerte, Einkaufsliste und Kochplan.
- `meal-plan-effective-portions`: Effektive Portionen werden in allen Darstellungen und Aggregationen einheitlich verwendet.
- `meal-plan-cooking-schedule`: Kochplan-Mengen, Varianten und Nährwerte entsprechen den aktiven Meal-Plan-Daten.
- `meal-external-cost`: Externe Mahlzeiten fließen in Kostenübersichten ein.
- `breakfast-wizard`: Frühstücks-RefMeals werden korrekt geladen, Getränke erkannt und Einstellungen erhalten.
- `shopping-list`: Gelöschte Portionen und Packungen werden aus Einkaufsberechnungen ausgeschlossen.

## Impact

- Backend-Apps: `recipe`, `supply`, `planner` und `shopping`.
- Frontend: ausschließlich `frontend-food/`, insbesondere Rezept-, Zutaten-, Planungs- und Wizard-Seiten sowie API-/Zod-Schemas.
- Betroffene Backend-Schemas umfassen Rezept-Import/Verifikation, Portionen, MealItems, Kosten, Kochplan und Wizard-Responses.
- Betroffene Frontend-Schemas umfassen `recipe`, `supply`, `mealPlan`, Frühstücks- und Wizard-State-Schemas.
- Bestehende Berechnungs- und API-Tests müssen angepasst und um End-to-End-Regressionstests ergänzt werden.
- Neue oder geänderte Model-Felder benötigen neue Django-Migrationen; bestehende Migrationen werden nicht verändert.
- Die Änderungen können bestehende, inkonsistente Wizard- oder Import-Payloads ablehnen und sind daher als fachlicher Vertragswechsel zu behandeln.
