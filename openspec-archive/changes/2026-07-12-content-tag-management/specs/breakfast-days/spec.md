## REMOVED Requirements

### Requirement: Frühstückstag-Tags auf Rezepten

**Reason**: "Frühstückstage" war ein Missverständnis — Tags (deutsch für Tage) wurden mit content-Tags verwechselt. Die Funktionalität wird komplett entfernt.

**Migration**: Die Backend-API (`/api/supply/breakfast-days/`), der Frontend BreakfastDayManager und der Admin-Tab werden ersatzlos gelöscht. Bestehende breakfast_day-Tags in der Datenbank können über `/api/admin/tags/` bereinigt werden.

### Requirement: Frühstückstag-Verwaltung (CRUD)

**Reason**: Entfällt mit der Entfernung des Frühstückstage-Features.

**Migration**: Die Tag-Verwaltung erfolgt über den neuen Tag-Admin-Tab.

### Requirement: Frühstückstag-API

**Reason**: Entfällt. Die API-Endpunkte unter `/api/supply/breakfast-days/` werden gelöscht.

**Migration**: Tag-CRUD über `/api/admin/tags/`.

### Requirement: Frühstückstag-Filter im RecipeSearchDialog

**Reason**: Entfällt mit der Entfernung des Frühstückstage-Features.

**Migration**: Der RecipeSearchDialog zeigt keine Frühstückstag-Filter-Pills mehr an.

### Requirement: Frühstückstage im Recipe-Edit-Formular

**Reason**: Entfällt mit der Entfernung des Frühstückstage-Features.

**Migration**: Die "Frühstückstage"-Sektion im Recipe-Edit-Formular wird entfernt.
