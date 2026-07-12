## REMOVED Requirements

### Requirement: Standard body text typography
**Reason**: Die Typografie (12pt Body, 16pt Meal-Types, 18pt Day-Headers, Sans-Serif) wandert in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo sie via WeasyPrint-CSS im Django-Template neu umgesetzt wird. Die Schriftgrößen bleiben identisch.
**Migration**: Typografie wird im `meal_plan_pdf.css` mit WeasyPrint-kompatiblen CSS-Schriftgrößen (`font-size: 12pt` etc.) neu umgesetzt. Font: Source Sans Pro (wie bereits in `pdf_export.py` verwendet).
