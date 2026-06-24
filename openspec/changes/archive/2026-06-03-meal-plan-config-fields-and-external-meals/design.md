# Technical Design: Configurable Day-Part Factors and External Meals

## Context
In den Pfadfinderlagern und -gruppenstunden werden Essenspläne (`MealPlan`) verwendet, um Mahlzeiten zu planen, Nährwerte im Cockpit zu überwachen und Einkaufslisten zu generieren.
Derzeit sind die prozentualen Tagesanteile (`day_part_factors`) für jeden Mahlzeitentyp (z.B. Frühstück = 25%, Mittagessen = 35%, Abendessen = 30%, Snack = 10%) global fest im Code verdrahtet (`MEAL_TYPE_DAY_FACTORS`). Dies verhindert individuelle Anpassungen pro Essensplan.
Zudem gibt es keine Möglichkeit, Mahlzeiten als "extern" zu kennzeichnen (z.B. wenn die Gruppe auswärts isst oder Lunchpakete erhält), oder deren Kalorien manuell einzupflegen. Dies führt zu unvollständigen Tagesbilanzen und störenden Ampel-Warnungen im Cockpit.

## Goals / Non-Goals

### Goals:
- **Konfigurierbare Tagesanteile**: Ein Essensplan soll eigene Gewichtungen für Frühstück, Mittag, Abend, Snack und Dessert haben können.
- **Externe Mahlzeiten**: Einzelne Mahlzeiten können als "extern" markiert werden. Sie erhalten ein optionales Feld für manuell eingegebene Ist-Kalorien (`external_energy_kcal`).
- **Nährstoff-Cockpit-Integration**:
  - Die manuellen Kalorien einer externen Mahlzeit fließen in die tägliche Energiebilanz ein.
  - Alle anderen Nährwerte einer externen Mahlzeit werden als neutral (0) gewertet.
  - Das Cockpit für die externe Mahlzeit selbst zeigt sich neutral (Soll-Wert = Ist-Wert, Status grün, keine Warnungen).
- **Abwärtskompatibilität**: Bestehende Pläne und Mahlzeiten müssen nahtlos weiter funktionieren und Standard-Gewichtungen erhalten.

### Non-Goals:
- Manuelle Erfassung anderer Nährwerte (Proteine, Fette etc.) für externe Mahlzeiten ist nicht erforderlich; nur Kalorien (`external_energy_kcal`) werden manuell gepflegt.
- Automatische Anpassung von Einkaufslisten-Mengen bei externen Mahlzeiten (da externe Mahlzeiten typischerweise keine Rezepte/Zutaten verknüpft haben, ist dies implizit gelöst).

## Decisions

### 1. Datenmodell für `day_part_factors`
Wir speichern die anpassbaren Faktoren als `JSONField` direkt auf dem `MealPlan` Model.
- **Wahl**: `JSONField` auf `MealPlan`.
- **Rationale**: Erlaubt einfache Erweiterung um zukünftige Mahlzeitentypen ohne Schema-Änderung.
- **Alternative**: Eine 1:N Tabelle `MealPlanDayPartFactor` oder separate Spalten für jeden Typ (`breakfast_factor`, `lunch_factor`, etc.). Diese wären starrer und würden die DB-Struktur unnötig verkomplizieren.

### 2. Datenmodell für `external_energy`
Wir speichern den Energiewert in Kilojoule (`external_energy_kj`) in der Datenbank, um der Konvention "Alle Energie-Werte in der DB als kJ" treu zu bleiben, präsentieren und empfangen diesen Wert in APIs und Formularen jedoch ausschließlich als Kilokalorien (`external_energy_kcal`).
- **Wahl**: `external_energy_kj` als nullable `FloatField` auf `Meal`, mit einer Pydantic/Zod-Schicht für `external_energy_kcal`.
- **Rationale**: Hält das Datenmodell konsistent zu `cached_energy_kj` etc. im restlichen System.
- **Alternative**: Speichern als `external_energy_kcal` direkt in der DB. Dies würde die systemweite Einheitlichkeit verletzen und bei späteren SQL-Aggregations-Abfragen Konvertierungsfehler begünstigen.

### 3. Propagierung von Plan-Faktoren auf Mahlzeiten
Wenn die `day_part_factors` eines `MealPlan` aktualisiert werden, aktualisieren wir automatisch die `day_part_factor` Felder aller zugehörigen Mahlzeiten, deren Faktor noch dem alten Standardwert entsprach.
- **Wahl**: Intelligenter Abgleich beim `save()` des `MealPlan` Models.
- **Rationale**: Verhindert, dass manuell editierte Faktoren einzelner Mahlzeiten überschrieben werden, während allgemeine Änderungen am Plan-Standard komfortabel auf alle unberührten Mahlzeiten übertragen werden.

---

## Technical Details & Schema Changes

### Affected Files
- **Backend**:
  - `backend/planner/models/meal_plan.py` (Models `MealPlan`, `Meal`)
  - `backend/planner/schemas/meal_plan.py` (Pydantic-Schemas)
  - `backend/planner/api/meal_plan.py` (API-Endpoints)
  - `backend/recipe/services/nutrition_aggregation.py` (Aggregationen & Cockpit)
  - `backend/recipe/services/suggestion_service.py` (Suggestions & Regeln)
- **Frontend**:
  - `frontend-food/src/schemas/mealPlan.ts` (Zod-Schemas)
  - `frontend-food/src/components/planner/SettingsPanel.tsx` (Plan-Konfiguration)
  - `frontend-food/src/components/planner/MealSlot.tsx` (Mahlzeiten-Details & Checkbox)

### Database Migrations
Ein neues Migrations-Skript für `planner` wird generiert:
1. `MealPlan.day_part_factors` (JSONField, default `default_day_part_factors`).
2. `Meal.is_external` (BooleanField, default `False`).
3. `Meal.external_energy_kj` (FloatField, null `True`, blank `True`).

### API Endpoints Change Documentation

#### 1. `MealPlan` Schemas
- `MealPlanOut` & `MealPlanDetailOut`:
  - `day_part_factors: dict[str, float]`
- `MealPlanCreateIn` & `MealPlanUpdateIn`:
  - `day_part_factors: dict[str, float] | None = None`

#### 2. `Meal` Schemas
- `MealOut`:
  - `is_external: bool`
  - `external_energy_kcal: float | None`
- `MealUpdateIn`:
  - `day_part_factor: float | None`
  - `is_external: bool | None`
  - `external_energy_kcal: float | None`

---

## Risks / Trade-offs

- **[Risk]** User gibt ungültige Keys oder Werte für `day_part_factors` ein.
  - **Mitigation**: Validierung im Pydantic- und Zod-Schema: Die Summe aller Faktoren muss nicht zwingend 1.0 ergeben (z.B. wenn Snacks flexibel sind), aber jeder Faktor muss im Bereich `[0.0, 1.0]` liegen, und die erlaubten Keys sind auf die `MealTypeChoices` beschränkt.
- **[Risk]** Runden-Ungenauigkeiten bei der kJ/kcal-Konvertierung.
  - **Mitigation**: Wir runden `external_energy_kcal` im Serializer immer auf eine Dezimalstelle (`round(val, 1)`), um Float-Fehler zu vermeiden.

## Migration Plan
1. Backend: Migration generieren und ausführen (`uv run python manage.py makemigrations` & `migrate`).
2. Backend: Logik implementieren und Unit-Tests ausführen.
3. Frontend: Zod-Schemas synchronisieren.
4. Frontend: SettingsPanel und Meal-Editor anpassen.
5. Verifikation via Linter und Typcheck.
