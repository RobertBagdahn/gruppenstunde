## REMOVED Requirements

### Requirement: 1-Screen Breakfast Builder Layout
**Reason**: Ersetzt durch den rollenbasierten Buffet-Builder für alle Mahlzeitentypen; die vier festen Sektionen trennen weder süß/herzhaft noch Soßen.
**Migration**: `buffet-builder` – Requirement „Builder-Oberfläche für alle Mahlzeiten“. `BreakfastQuickBuilder` wird entfernt, `BuffetBuilder` im MealSlot eingebunden.

### Requirement: Automatic Standard Servings Calculation
**Reason**: Die Frontend-Berechnung speicherte Gruppenmengen mit Portions-Einheiten und wurde doppelt skaliert.
**Migration**: `buffet-builder` – Requirement „Mengenberechnung im Backend“ und „Speichern und Vorschau“.

### Requirement: Optional Expert Mode Toggle
**Reason**: Nie umgesetzt; der 6-Schritt-Assistent bleibt als eigener Weg bestehen, der Builder zeigt kcal und Kosten direkt aus der Backend-Vorschau.
**Migration**: Keine; für Feinjustierung weiterhin `/meal-plans/:id/meals/:mealId/breakfast-wizard`.
