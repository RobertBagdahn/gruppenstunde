## Why

Der aktuelle Essensplaner in Inspi ist unübersichtlich und unvollständig. Die aktuelle Tabellenansicht blendet leere Zeilen/Mahlzeiten aus und bietet keinerlei Interaktivität. Dadurch können Nutzer Rezepte und Zutaten nur in der Listenansicht hinzufügen. Zudem berechnet die Einkaufsliste fehlerhafte oder extrem überhöhte Mengen, da sie Mahlzeiten-spezifische Portionen-Overrides ignoriert, direkt hinzugefügte Zutaten komplett weglässt und fehlerhafte Normalisierungen von Rezepte-Servings (wie beim "Echten Pfadfinder Chai") zu unrealistischen Multiplikationen führen.

## What Changes

- **Interaktive Tabellenansicht (Grid):** Einführung eines festen, übersichtlichen Rasters für alle 5 Mahlzeiten-Typen (Frühstück, Mittagessen, Abendessen, Snack, Dessert) über alle geplanten Tage. Jede leere Zelle bietet direkte Buttons zum Hinzufügen von Rezepten, Zutaten und Notizen.
- **Direktes Hinzufügen in der Tabelle:** Rezepte und Zutaten können direkt aus der Tabelle heraus gesucht und zugewiesen werden.
- **Inline-Editierung:** Multiplikationsfaktoren (`factor`) und Notizen können direkt in der Tabelle editiert und gelöscht werden.
- **Korrektur der Einkaufsliste:**
  - Aggregation von direkt zugeordneten Zutaten (`MealItem.ingredient`) in die Einkaufsliste.
  - Korrekte Skalierung von Zutatenmengen unter Berücksichtigung von Mahlzeiten-spezifischen Personen-Overrides (`Meal.override_portions`).
- **Anpassung der Zod-/Pydantic-Schemas & API-Endpunkte:** Erweiterung der API für nahtlose Tabellen-Interaktionen.

## Capabilities

### New Capabilities
- `meal-plan-interactive-grid`: Interaktives Raster zur Essensplanung mit festen Zeilen für alle 5 Mahlzeiten-Typen, Platzhalter-Zellen mit Schnellaktionen (Rezept, Zutat, Notiz) und Inline-Steuerung (Faktor, Löschen).
- `shopping-list-fix`: Korrigierte Aggregation und Skalierung der Einkaufsliste im Backend, inklusive direkter Zutaten und Beachtung von Mahlzeiten-Portions-Overrides.

### Modified Capabilities
Keine.

## Impact

- **Backend (Django / planner App):** `backend/supply/services/shopping_service.py` wird angepasst, um direkt zugeordnete Zutaten zu erfassen und Mahlzeiten-Overrides korrekt zu berechnen.
- **Frontend (React / frontend-food):** `frontend-food/src/pages/planning/TableView.tsx` wird komplett neu implementiert und mit Suchdialogen sowie API-Mutations verknüpft.
- **Zod- / Pydantic-Schemas:** Keine tiefgreifenden Breaking Changes an Datenmodellen, da alle Felder (`factor`, `override_portions`, `note`, `ingredient`) bereits existieren, aber in der Tabelle und der Einkaufsliste unzureichend genutzt werden.
- **Migrationen:** Keine Datenbank-Migrationen erforderlich, da die benötigten Spalten in der DB bereits existieren.
