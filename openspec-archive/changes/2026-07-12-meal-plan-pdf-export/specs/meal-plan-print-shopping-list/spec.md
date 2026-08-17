## REMOVED Requirements

### Requirement: Integrated shopping list at document end
**Reason**: Die Einkaufsliste wandert in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo sie erheblich erweitert wird: Kategorisierung nach RetailSection, Frisch-Marker, Pro-Tag + Gesamtsumme. Die Aggregationslogik aus `mealPlanPrintUtils.ts` wird in Python neu implementiert.
**Migration**: Einkaufsliste wird im WeasyPrint-Template mit Python-Aggregationslogik in `pdf_export.py` neu umgesetzt. Der Parameter `exclude_shopping_list` steuert die Sichtbarkeit.
