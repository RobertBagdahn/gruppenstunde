## REMOVED Requirements

### Requirement: Page numbering in footer
**Reason**: Die CSS-Counter-basierte Seitennummerierung (`counter(page-counter)`, `counter(pages)`) wandert in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo sie via WeasyPrint-CSS (`@page` rules, `content: counter(page)`) umgesetzt wird.
**Migration**: Footer mit „Seite X von Y" und Plan-Referenz wird im WeasyPrint-Template neu implementiert. Kein Browser-CSS mehr nötig.
