## Why

Rezepte benötigen neben Lebensmitteln und Equipment auch Verbrauchs- und Hilfsmaterialien wie Zahnstocher, Holzspieße oder Backpapier. Das bestehende `ContentMaterialItem`-Modell und Admin-Inlines sind für Rezepte nicht als vollständiger Food-Frontend- und API-Workflow verfügbar.

Dadurch können wichtige Rezeptbedarfe nicht strukturiert gespeichert, geprüft, angezeigt oder durch KI vorgeschlagen und übernommen werden.

## What Changes

- Rezepte erhalten einen eigenen strukturierten Bereich für Materialien.
- Zutaten, Materialien und Equipment werden in API und UI getrennt dargestellt.
- Authentifizierte berechtigte Nutzer können Rezeptmaterialien hinzufügen, bearbeiten, sortieren und entfernen.
- Mengen bleiben für Materialien als flexible Anzeigeangabe erhalten, zum Beispiel `30 Stück` oder `1 Rolle`.
- Rezeptdetailseite, Rezeptbearbeitung, Wizard und relevante Exporte zeigen Materialien an.
- Die KI kann Rezeptmaterialien separat von Zutaten und Equipment vorschlagen.
- KI-Vorschläge werden vor der Übernahme angezeigt und erst nach Nutzerbestätigung gespeichert.
- Equipment-Vorschläge werden gegen das Equipment-Modell und Material-Vorschläge gegen das Material-Modell aufgelöst.
- Pydantic- und Zod-Schemas werden synchron erweitert.
- Bestehende Rezeptmaterialien aus Admin-Daten werden ohne Verlust sichtbar und bearbeitbar.

## Capabilities

### New Capabilities

- `recipe-materials`: Vollständige Speicherung, API-Verwaltung, Anzeige und KI-Übernahme von Rezeptmaterialien.

### Modified Capabilities

- `recipe`: Rezeptbedarfe werden um einen strukturierten Materialbereich neben Zutaten und Equipment erweitert.

## Impact

- Backend-Apps `recipe`, `supply` und `content`.
- `ContentMaterialItem`, Content-Type-Routen, Rezeptschemas und Berechtigungslogik.
- Food-Frontend-Rezeptdetailseite, Edit- und Wizard-Komponenten sowie neue Query-/Mutation-Hooks.
- PDF-/Druck-Templates und gegebenenfalls Einkaufs-/Packlisten-Export; diese Änderung erzeugt keine Lebensmittelpreise für Materialien.
- Eine Migration ist nur erforderlich, wenn zusätzliche Rezept-spezifische Felder oder Indizes benötigt werden; das bestehende Generic-FK-Modell soll bevorzugt wiederverwendet werden.
