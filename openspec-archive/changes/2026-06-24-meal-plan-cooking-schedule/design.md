## Context

BUG-016 (Kochplan) wurde im vorherigen Bugfix-Batch `2026-06-23-food-bugfix-2026-06` bewusst als eigener Change ausgelagert. Das Kochteam braucht eine chronologische Übersicht, wann mit welchem Rezept begonnen werden muss, damit alle Gerichte einer Mahlzeit rechtzeitig zur Servierzeit fertig sind.

Aktueller Stand der relevanten Modelle:
- `Meal.start_datetime` (nullable) ist die Servierzeit, `meal_type` der Mahlzeit-Typ.
- `Meal.override_portions` überschreibt ggf. `MealPlan.norm_portions`.
- Mahlzeiten werden pro Tag über `start_datetime__date` gruppiert.
- `Recipe.preparation_time` und `Recipe.execution_time` sind **Choice-Buckets** (`PreparationTimeChoices`, `ExecutionTimeChoices`), keine exakten Minutenwerte.
- Rezepte hängen an Mahlzeiten über die bestehende Meal→RecipeItem/Recipe-Verknüpfung (`planner` App).

Print-Routen existieren bereits als Muster: `meal-plan-print` und `recipe-print-route` (eigene Route ohne FoodLayout, alle Sektionen ausgeklappt, A4-optimiert).

## Goals / Non-Goals

**Goals:**
- Backend berechnet pro Tag eine chronologisch nach Startzeit sortierte Liste der Rezepte.
- Startzeit = Servierzeit − (preparation_time + execution_time), basierend auf Bucket-Obergrenzen.
- Interaktive Frontend-Ansicht + dedizierte Druck-Route.
- Keine Datenmigration — nur vorhandene Felder nutzen.

**Non-Goals:**
- Keine exakte Minuten-Erfassung pro Rezept (Buckets bleiben).
- Keine parallele Ressourcenplanung (Herdplatten, Personen) — nur lineare Startzeiten pro Rezept.
- Keine manuelle Umsortierung durch den Nutzer (rein berechnet).
- Keine Berücksichtigung externer Mahlzeiten (`is_external=True`) — diese haben kein Rezept zum Kochen.

## Decisions

### Entscheidung 1: Backend berechnet die Startzeiten (kein Frontend-Computing)
Das Bucket→Minuten-Mapping und die Rückwärtsberechnung leben im Backend-Service `cooking_schedule_service.py`. Das Frontend zeigt nur an.
- **Warum:** Single Source of Truth für die Zeitlogik; konsistent zwischen interaktiver Ansicht und Druck; testbar in Python.
- **Alternative (verworfen):** Berechnung im Frontend aus den vorhandenen MealPlan-Detaildaten — würde Logik duplizieren und wäre schwerer zu testen.

### Entscheidung 2: Bucket-Obergrenzen als Minuten
Mapping (konservativ, Worst-Case):
- `execution_time`: `less_30`=30, `30_60`=60, `60_90`=90, `more_90`=120
- `preparation_time`: `none`=0, `less_15`=15, `15_30`=30, `30_60`=60, `more_60`=90

Gesamt-Vorlaufzeit pro Rezept = prep-Minuten + exec-Minuten.
- **Warum:** Das Kochteam soll lieber zu früh als zu spät anfangen. Obergrenzen geben einen Sicherheitspuffer.
- **Alternative (verworfen):** Mittelwerte — realistischer im Schnitt, aber riskanter (Gericht potenziell zu spät fertig).

### Entscheidung 3: Gruppierung pro Tag
Items werden pro Kalendertag (`start_datetime__date`, lokale Zeitzone in der Anzeige) gruppiert und innerhalb des Tages nach berechneter Startzeit aufsteigend sortiert.
- **Warum:** Entspricht dem Stakeholder-Wunsch („alle Rezepte eines Tages chronologisch") und dem Küchenalltag.

### Entscheidung 4: Mahlzeiten ohne Servierzeit / externe Mahlzeiten ausschließen
Mahlzeiten ohne `start_datetime` können keine Startzeit berechnen; externe Mahlzeiten haben kein zu kochendes Rezept. Beide werden aus dem Kochplan ausgeschlossen.
- **Warum:** Eine Startzeit ohne Servierzeit ist nicht berechenbar; externe Mahlzeiten sind irrelevant fürs Kochen.

### Entscheidung 5: Portionen aus Meal/MealPlan ableiten
Portionen pro Item = `Meal.override_portions` falls gesetzt, sonst `MealPlan.norm_portions`.
- **Warum:** Konsistent mit der bestehenden Portionslogik des Essensplans.

### Entscheidung 6: Druck-Route nach bestehendem Muster
`/meal-plans/:id/cooking-schedule/print` ohne FoodLayout, alle Sektionen ausgeklappt, A4-optimiert — exakt wie `meal-plan-print`/`recipe-print-route`.
- **Warum:** Wiederverwendung des etablierten Druckmusters, konsistente UX.

## Risks / Trade-offs

- **Bucket-Obergrenzen überschätzen die Zeit** → Startzeiten sind eher zu früh. Akzeptiert (Sicherheitspuffer ist gewünscht).
- **Fehlende `start_datetime` bei Mahlzeiten** → Diese erscheinen nicht im Kochplan. Mitigation: Im Frontend Hinweis anzeigen, wenn Mahlzeiten wegen fehlender Servierzeit ausgeschlossen wurden.
- **Mehrere Rezepte mit gleicher Startzeit** → stabile Sekundärsortierung nach Rezeptname, damit die Reihenfolge deterministisch ist.

## Migration Plan

Keine Datenmigration. Reiner additiver Change (neuer Endpunkt + neue Frontend-Routen). Rollback = Endpunkt und Routen entfernen, keine DB-Auswirkungen.

## Open Questions

- Keine offenen Fragen — alle Entscheidungen mit dem Stakeholder geklärt.
