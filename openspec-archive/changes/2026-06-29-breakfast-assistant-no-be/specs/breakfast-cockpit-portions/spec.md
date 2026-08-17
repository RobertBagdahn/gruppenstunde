## REMOVED Requirements

### Requirement: Cockpit zeigt Portionen statt Gramm

**Reason**: Die BE-basierte Portionsdarstellung im Cockpit entfällt komplett. Das Cockpit zeigt stattdessen die Standard-MealItem-Ansicht (Gramm, kcal, Faktor) wie jedes andere Meal auch.

**Migration**: Cockpit verwendet Standard-MealItem-Darstellung aus der MealPlan-UI.

### Requirement: Cockpit hat Summenzeilen pro Kategorie

**Reason**: Kategorie-Summen bleiben erhalten, aber basieren auf Gramm und kcal statt auf BE-basierten Portionen.

**Migration**: Summenzeilen zeigen Summe Gramm + Summe kcal pro Kategorie.

### Requirement: Kein BE-Begriff in der Anzeige

**Reason**: BE existiert nicht mehr — weder intern noch in der Anzeige. Die Regel ist damit obsolet.

**Migration**: Keine Migration nötig.
