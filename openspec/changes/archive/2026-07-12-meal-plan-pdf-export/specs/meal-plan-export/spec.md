## REMOVED Requirements

### Requirement: Meal Plan PDF Export
**Reason**: Vollständig ersetzt durch `meal-plan-pdf-export`. Der bisherige 120-Zeilen-Stub implementierte Exchange-Splits und Einkaufsliste nicht — `meal-plan-pdf-export` liefert ein vollständiges PDF mit Deckblatt, Personenliste, kategorisierter Einkaufsliste, Allergen-Matrix, Nährwert-Übersicht und Running Headers.
**Migration**: Die API-Route `GET /api/meal-plans/{id}/export/pdf/` bleibt bestehen, wird aber komplett neu implementiert. Query-Parameter erweitern sich um `exclude_shopping_list`, `exclude_nutrition`, `compact_mode`, `page_format`.
