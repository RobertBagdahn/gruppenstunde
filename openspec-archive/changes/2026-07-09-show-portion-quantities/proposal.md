## Why

Der Frühstücksassistent (Breakfast Wizard) und der Essensplan-Editor zeigen Zutatenmengen ausschließlich in Gramm an (z.B. „85g"). Nutzer:innen im Lager-/Küchenalltag denken aber in Portionen — „1,7 Scheiben Brot", „0,1 Packung Aufstrich". Die dafür nötigen Portionsdaten (`Scheibe`, `Packung`, `Stück` mit `weight_g` und `priority`) existieren im Katalog bereits, werden aber in den Wizard-Schritten und im Essensplan (für Gramm-basierte Items) nicht genutzt. Das führt zu unnötigem Kopfrechnen beim Einkaufen und Portionieren.

## What Changes

- Neue geteilte Berechnungs-/Formatierfunktion, die aus Gramm + den Portionsdaten einer Zutat einen Zusatz-Hinweis erzeugt: `"85g · ≈ 1,7 Scheiben"` (Gramm zuerst, 1 Nachkommastelle, deutsches Komma).
- Auswahl der Portion: die Portion mit `priority = 1` (bzw. niedrigstem `priority`-Wert) wird immer als primärer Zusatz-Hinweis verwendet, sofern vorhanden. Eine zweite Portionsart (z.B. Packung) wird zusätzlich angezeigt, wenn sie sinnvoll unterscheidbar ist (anderer Name, `weight_g > 0`).
- Werte unter 0,1 Portionen werden ausgeblendet (nur Gramm bleibt sichtbar).
- Anwendung des Hinweises in:
  - `StepBasis.tsx` (Brot-Slider-Details und Gesamtsumme)
  - `StepBelag.tsx` (Belag-Slider-Details)
  - `StepCockpit.tsx` (Zusammenfassungstabelle, inkl. Zeilensummen)
  - `MealSlot.tsx` (Essensplan-Editor) für Gramm-basierte Zutaten-Items (bisher nur „85g", jetzt zusätzlich Portionshinweis analog zum bestehenden Portion-Zweig)
  - `IngredientDetailPage.tsx`: Reihenfolge auf „Gramm zuerst" vereinheitlicht (bisher „Portion (≈ Gramm)")
  - `ShoppingView.tsx`: Anzeige nutzt, wo vorhanden, den benannten Portionstyp (z.B. „Scheiben") statt nur generischer „N×125g"-Zählung
- Getränke (ml-Mengen) erhalten dieselbe Behandlung mit Tasse/Schuss-Portionen.
- Fehlt eine passende Portion für eine Zutat, erscheint ein oranger, anklickbarer Hinweis (analog zu `has_missing_weight`), der zur Zutat-Bearbeitungsseite verlinkt, um die Portion zu ergänzen.
- Die Portionsanzeige ist rein informativ und rein abgeleitet: Speicherung und Eingabe bleiben in Gramm (`quantity_g`). Beim „Normalisieren" (Skalieren auf Soll-kcal) aktualisiert sich der Hinweis automatisch, da er live aus Gramm berechnet wird.
- Neue Unit-Tests für die Gramm→Portion-Umrechnungslogik (analog zu `breakfastCalc.test.ts`).

## Capabilities

### New Capabilities
- `portion-quantity-hint`: Geteilte Frontend-Logik und UI-Konvention, um neben einer Gramm-Menge automatisch einen abgeleiteten Portionshinweis (Scheibe/Packung/Stück/Tasse/Schuss) anzuzeigen, inkl. Rundungs-, Schwellwert- und Fallback-Regeln bei fehlenden Portionsdaten.

### Modified Capabilities
- `breakfast-wizard`: StepBasis, StepBelag und StepCockpit zeigen zusätzlich zur Gramm-Menge den abgeleiteten Portionshinweis.
- `quantity-display-formatting`: Ergänzung um die Konvention „Gramm zuerst, Portion sekundär" als Referenzimplementierung für weitere Anzeigeorte.
- `shopping-list-package-display`: Anzeige nutzt den benannten Portionstyp (z.B. „Scheiben") statt ausschließlich generischer „N×125g"-Zählung, wenn eine passende benannte Portion existiert.

## Impact

- **Frontend (`frontend-food/src`)**:
  - Neu: `lib/portionQuantityHint.ts` (+ `portionQuantityHint.test.ts`) mit der Kernlogik (Portion nach `priority` wählen, Rundung, Schwellwert 0,1, deutsches Zahlenformat).
  - Geändert: `pages/planning/breakfast/StepBasis.tsx`, `StepBelag.tsx`, `StepCockpit.tsx`, `pages/planning/MealSlot.tsx`, `pages/ingredients/IngredientDetailPage.tsx`, `pages/planning/ShoppingView.tsx`.
  - Kein neues Zod-Schema nötig — `BreakfastPortionSchema` (`priority`, `weight_g`, `name`) liefert bereits alle nötigen Felder.
- **Backend**: keine Migrationen nötig. Ggf. Prüfung, ob `breakfast_catalog.py` die Portionen bereits nach `priority` sortiert zurückgibt (falls nicht: kleine Anpassung der Sortierung in der API-Response).
- Keine Breaking Changes — rein additive, abwärtskompatible Anzeige-Erweiterung.
