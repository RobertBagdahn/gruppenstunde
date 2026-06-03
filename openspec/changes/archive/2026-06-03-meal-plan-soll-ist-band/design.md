## Context

Aktuell werden im Mahlzeitenplaner Nährwert- und Energieregeln sowie Budgets über das Vorschlagssystem bewertet. Die Soll-Werte oder Bänder (z. B. 2000 kcal / Tag, angepasst um den PAL-Aktivitätsfaktor) sind im Frontend hartkodiert oder basieren auf unvollständigen Annahmen. Dies verhindert eine präzise, einheitliche und dynamische Darstellung des Erfüllungsgrades ("Ist vs. Soll").

Durch diesen Entwurf wird das Backend zur alleinigen "Soll-Quelle" (Single Source of Truth), indem bei jeder Regelauswertung die Soll-Bänder (`min_green`, `max_green`, `target_mid`) mitgeliefert werden. Das Frontend visualisiert diese Daten flexibel und einheitlich über eine neue `SollIstBar`-Komponente.

## Goals / Non-Goals

**Goals:**
- Dynamische Bereitstellung von Soll-Bändern (`min_green`, `max_green`, `target_mid`) in der API.
- Abschaffung aller hartkodierten Soll-Berechnungen (z. B. `8368 kJ` / `2000 kcal` x PAL) im Frontend.
- Erstellung einer wiederverwendbaren `SollIstBar`-Komponente für visuelle Prozentbalken mit Ampelstatus.
- Erweiterung des Nährstoff-Tabs um einen Tag-Selektor (einzelne Tage des Plans) und einen Gesamt-Plan-Toggle.
- Erweiterung der Kosten-Auswertung (Budget) um Soll-Ist-Visualisierungen.

**Non-Goals:**
- Änderung der Tabellenstruktur in der Datenbank (keine neuen Tabellenspalten oder Models nötig).
- Änderung der zugrunde liegenden Speicherlogik (Energie bleibt intern als `energy_kj` in DB gespeichert).

## Decisions

1. **API-Erweiterung in Suggestions**:
   Wir erweitern `SuggestionOut` um die Felder `min_green`, `max_green` und `target_mid`.
   *Rationale*: Dies ermöglicht es dem Frontend, für alle regelbasierten Benachrichtigungen/Vorschläge die genauen Grenzwerte direkt auszulesen und grafisch darzustellen. Bei Event-Regeln (Tagesdurchschnitt) werden die Grenzwerte automatisch durch die Anzahl der Plantage geteilt, um die Skalierung pro Tag korrekt abzubilden.

2. **Zentralisierung der Regelauswertung in `_evaluate_rules`**:
   Wir fügen `min_green`, `max_green` und `target_mid` direkt in die Auswertung von `_evaluate_rules` in `nutrition_aggregation.py` ein, um Konsistenz zwischen backendseitigen Services und Tests zu wahren.

3. **Optionaler `date` Filter für `nutrition-summary`**:
   Der API-Endpunkt `/api/meal-plans/{meal_plan_id}/nutrition-summary/` erhält einen optionalen `date` Query-Parameter.
   *Rationale*: Damit kann die gleiche Aggregationslogik sowohl für den gesamten Plan als auch für einzelne Tage genutzt werden, ohne neuen Code zu duplizieren. Das Frontend nutzt dies für den neuen Tag-Auswahl-Filter im Nährwerte-Tab.

4. **Relative SollIstBar im Frontend**:
   Die neue Komponente `SollIstBar` stellt den Ist-Wert und den Soll-Wert (oder Soll-Band) grafisch dar. Sie berechnet den Erfüllungsgrad dynamisch und färbt den Fortschrittsbalken passend zum Ampelstatus (`green`, `yellow`, `red`).

## Risks / Trade-offs

- **[Risk]**: Keine Regeln für bestimmte Nährstoffe aktiv.
  - *Mitigation*: Wenn für einen Nährstoff keine Regel existiert, liefert das System die reinen Nährstoffmengen (Ist-Werte) ohne Soll-Band. Die UI fängt dies ab und blendet in dem Fall die `SollIstBar` aus bzw. zeigt nur den absoluten Ist-Wert an.

- **[Risk]**: Event-Regeln mit `nutri_class` (Nutri-Score) skalieren nicht linear über Tage.
  - *Mitigation*: In `_evaluate_admin_rules` wird der Nutri-Score nicht durch die Anzahl der Tage geteilt. Wir stellen sicher, dass dies auch für die Soll-Werte gilt.

## Migration Plan

1. Backend: API-Schemas anpassen (Pydantic).
2. Backend: `nutrition_aggregation.py` und `suggestion_service.py` anpassen.
3. Backend: `nutrition-summary` Endpoint um optionalen `date` Filter erweitern.
4. Frontend: Zod-Schema synchronisieren.
5. Frontend: `SollIstBar` Komponente erstellen.
6. Frontend: `NutritionView` (in `MealEventDetailPage.tsx`) und `SuggestionCard.tsx` anpassen.
