## Context

Die Wizard-Vorschau rendert `RecipeIngredientsTable`, die Menge und Einheit aus `item.quantity` und `item.measuring_unit_name ?? 'Gramm'` zusammensetzt. Die Detailseite nutzt `components/supply/IngredientList.tsx` mit Portionslogik (Primärportion nach `rank`, Gramm als Sekundärzeile). Zwei getrennte Darstellungen derselben Daten sind der Kern des Fehlers.

## Goals / Non-Goals

**Goals:**
- Dieselben Zutatendaten werden in Vorschau und Detailseite gleich dargestellt.
- Kein geratenes „Gramm“ als Rückfall.

**Non-Goals:**
- Keine Änderung der Speicherlogik und der Normierung auf eine Portion.
- Keine Neugestaltung der Vorschau-Seite.

## Decisions

- **Gemeinsamen Formatter extrahieren.** Die Mengenformatierung (Portionsname, Gramm-Sekundärzeile, Pluralisierung) wird aus `IngredientList.tsx` in eine kleine Util-Funktion verschoben und von der Tabelle genutzt. Alternative „Tabelle durch `IngredientList` ersetzen“ wurde verworfen, weil die Vorschau Status-Spalte („vorhanden/neu“) und kompakte Tabellenform braucht.
- **Einheit aus Portion vor Messeinheit.** Hat das Item eine `portion_id` oder einen `portion_name`, ist der Portionsname die Einheit. Sonst `measuring_unit_name`. Fehlt beides, wird „—“ gezeigt.
- **Regression über Testfälle aus dem Produktivtest.** Spaghetti (1 Portion trocken, 100 g), Zwiebel (0,31 mittelgroße Zwiebel, 80 g/Portion), Olivenöl (0,46 EL), Salz (0,42 Prise) werden als Testdaten übernommen.

## Risks / Trade-offs

- [Formatter-Änderung beeinflusst Detailseite] → Verhalten der Detailseite per bestehender Tests absichern, Formatter nur verschieben, nicht ändern.
- [Items ohne Portionsdaten in der Vorschau] → „—“ statt falscher Einheit, kein Absturz.

## Migration Plan

Keine. Reine Frontend-Änderung.

## Open Questions

Keine.
