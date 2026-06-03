## Why

Das Cockpit zur Mahlzeitenplanung zeigt bisher nur Ist-Werte und einen Ampelstatus an. Die Soll-Werte (z.B. der Energiebedarf von 8368 kJ multipliziert mit dem PAL-Faktor) sind im Frontend hartkodiert. Um eine flexible, genaue und dynamische Visualisierung (z. B. relative Fortschrittsbalken "Ist / Soll" und Ampelfarben) zu ermöglichen, müssen die Soll-Bänder (min_green, max_green und ein abgeleiteter Mittelwert) direkt aus der Backend-Regelauswertung stammen. Auf diese Weise verschwinden hartkodierte Frontend-Berechnungen und wir etablieren eine einzige, konsistente "Soll-Quelle" (Single Source of Truth) im Backend.

## What Changes

- **Soll-Band aus Backend (B-Kern)**:
  - Das Backend-Cockpit (`_evaluate_rules`) gibt für jede Regel-Evaluierung zusätzlich die Soll-Grenzwerte `min_green` und `max_green` sowie einen abgeleiteten `target_mid` Wert aus.
  - Das Cockpit-Schema im Backend (`RuleOut` oder `EvaluationOut` / `CockpitOut`) wird erweitert, um diese Felder an das Frontend zu liefern.
  - Veraltete Frontend-Berechnungen (wie die statische `8368 kJ / 2000 kcal`-Logik in `getCoverageStatus`) werden vollständig abgeschafft.
  - Eine neue, wiederverwendbare Frontend-Komponente `SollIstBar` visualisiert das Verhältnis von Ist zu Soll (Mittelwert/Zielwert), inklusive farblichem Fortschrittsbalken und Ampelstatus.
  - Die Preis-Auswertung wird analog als Soll/Ist visualisiert, wobei das Soll aus dem Budget der `price_total`-Regel stammt.
  - Im Nährwerte-Tab wird ein Gesamt-Plan-Toggle und eine Tag-Auswahl (z. B. ein Tagessummen-Vergleich) integriert, um Nährwerte flexibel im Detail oder in Summe zu sichten.

## Capabilities

### New Capabilities

- `meal-plan-soll-ist-band`: Liefert Soll-Bänder (`min_green`, `max_green`, `target_mid`) im Cockpit-API-Output und stellt diese Werte als relative Fortschrittsbalken (`SollIstBar`) im Meal-Plan Frontend dar.

### Modified Capabilities

- `meal-cockpit`: Erweitert die API-Antwort der Cockpit-Regelbewertung um die Soll-Band-Felder.
- `meal-plan-frontend`: Ersetzt absolute Nährwert- und Energie-Anzeigen durch die relative `SollIstBar`-Visualisierung und führt eine Tag-/Gesamtplan-Auswahl im Nährstoff-Dashboard ein.

## Impact

- **Backend**:
  - `recipe/services/nutrition_aggregation.py` (`_evaluate_rules`): Hinzufügen von `min_green`, `max_green` und `target_mid` zu den Evaluations-Objekten.
  - API-Schemas (`recipe/schemas/rules.py` oder `planner/schemas/meal_plan.py`): Anpassung der Pydantic-Response-Modelle.
- **Frontend**:
  - `frontend-food/src/schemas/mealPlan.ts` (Zod-Schemas für Cockpit/Evaluations synchronisieren).
  - Erstellung der React-Komponente `SollIstBar`.
  - Anpassung von `MealEventDetailPage.tsx`, `NutritionView` und `TableView.tsx` für relative Soll/Ist-Visualisierungen.
