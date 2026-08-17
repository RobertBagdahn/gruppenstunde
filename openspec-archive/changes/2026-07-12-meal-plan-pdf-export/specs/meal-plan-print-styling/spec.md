## REMOVED Requirements

### Requirement: Greyscale + green accent color scheme
**Reason**: Das Farbsystem wandert in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo es via WeasyPrint-CSS im Django-Template neu umgesetzt wird. Das Design (Greyscale für Text/Border, Grün für Day-Header) bleibt identisch.
**Migration**: Farbsystem wird im `meal_plan_pdf.css` mit WeasyPrint-kompatiblen CSS-Farbangaben neu umgesetzt. `print-color-adjust: exact` für WeasyPrint.
