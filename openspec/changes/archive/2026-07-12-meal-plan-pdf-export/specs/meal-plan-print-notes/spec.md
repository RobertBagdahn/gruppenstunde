## REMOVED Requirements

### Requirement: Hybrid notes area integration
**Reason**: Die Notizbereiche (Inline-Boxen neben Mahlzeiten, Tagesende-Linien) wandern in den server-seitigen PDF-Export (`meal-plan-pdf-export`), wo sie via Query-Parameter `include_notes` steuerbar sind. Das Design (3–4 cm breite Box, hellgrauer Hintergrund, „Notizen"-Label) bleibt erhalten.
**Migration**: Notizbereiche werden im WeasyPrint-Template neu implementiert. Der `include_notes`-Parameter steuert die Sichtbarkeit.
