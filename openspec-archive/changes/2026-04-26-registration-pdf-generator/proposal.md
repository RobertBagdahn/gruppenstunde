## Why

Pfadfinder-Gruppenführer erstellen regelmäßig Anmeldeformulare für Fahrten, Lager und Aktionen. Diese PDFs folgen immer dem gleichen Muster (Header, Event-Details, Zusatzinfos, Packliste, Formular, Einverständniserklärung), werden aber jedes Mal manuell in Word/Google Docs zusammengebaut. Ein YAML-gesteuerter PDF-Generator mit Textbausteinen, Presets und optionaler KI-Textgenerierung reduziert den Aufwand pro Anmeldung auf ~25 Zeilen YAML.

## What Changes

- Neues standalone Python-Script (`backend/documents/generate.py`) das aus YAML-Konfiguration Anmelde-PDFs generiert (via `uv run python`)
- PDF-Builder-Modul (`backend/documents/pdf_builder.py`) mit reportlab Platypus für Layout und Rendering
- Seiten-Optimizer der Whitespace, Schriftgröße und Ränder automatisch anpasst um eine konfigurierte Ziel-Seitenanzahl einzuhalten (Fehler wenn unmöglich)
- Textbaustein-System mit Defaults für Greetings, Zusatzinfos, Consent-Texte (Template-Variablen aus Event-Daten)
- Packlisten-Presets (wanderung, lager_haus, minimal) und Formularfeld-Presets (standard, extended)
- Optionale KI-Textgenerierung (Google Gemini) für thematische Events (z.B. Motto "Römer", "Harry Potter")
- YAML-basierte Event-Konfiguration mit strukturierten Daten (Datum, Uhrzeit, Ort, Gebühr) statt fertiger Strings
- Asset-Ordner für Logos und ggf. Fonts

## Capabilities

### New Capabilities
- `registration-pdf`: YAML-gesteuerte PDF-Generierung für Pfadfinder-Anmeldeformulare mit Textbausteinen, Presets, Seiten-Optimizer und optionaler KI-Textgenerierung

### Modified Capabilities
_(keine — komplett neue, standalone Funktionalität)_

## Impact

- **Backend**: Neues Verzeichnis `backend/documents/` mit standalone Script, kein Einfluss auf bestehende Django-Apps
- **Dependencies**: `reportlab` (bereits in pyproject.toml), `pyyaml` (muss hinzugefügt werden), `google-genai` (bereits vorhanden, optional für KI-Texte)
- **Django-Apps**: Keine betroffen — standalone Script ohne Django-Abhängigkeit (Gemini-SDK direkt, nicht über Django)
- **Pydantic/Zod-Schemas**: Keine Änderungen — kein API-Endpunkt in Phase 1
- **Migrations**: Keine
- **Spätere Integration**: Event-App kann `pdf_builder` importieren um aus Event-Model-Daten PDFs zu generieren
