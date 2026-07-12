## REMOVED Requirements

### Requirement: Day-per-page layout with page breaks
**Reason**: Die CSS-Seitenumbruch-Logik (`page-break-before: always`, `break-inside: avoid`) wandert in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo sie via WeasyPrint-CSS umgesetzt wird. Kein separates Browser-Print-CSS mehr nötig.
**Migration**: Das Layout wird im Django-Template `meal_plan_pdf.html` und dem zugehörigen `meal_plan_pdf.css` mit WeasyPrint-kompatiblem CSS neu umgesetzt. `index.css` Zeilen 260–564 werden gelöscht.
