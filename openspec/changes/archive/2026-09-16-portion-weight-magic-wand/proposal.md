## Why

Aktive Portionen können derzeit ohne Gewicht gespeichert werden. Das macht insbesondere `Stück`, `Packung`, `Prise`, `Schuss`, `Esslöffel` und ähnliche Portionen für Gewicht, Preis, Nährwerte und Einkaufslisten unbrauchbar. Die bestehende Piece-Portion-Logik verhindert zwar falsche `1 g`-Fallbacks, lässt aber einen fachlich unvollständigen Datensatz im aktiven Portionsbestand zu.

Zusätzlich fehlt ein gezielter Assistent, der im Bereich „Portionen“ typische, zutatenspezifische Portionen mit vollständigen Gewichten vorschlägt. Dieser Change verbindet die harte Gewichtsvalidierung mit einem einzelnen, bestätigungspflichtigen Portions-Zauberstab.

## What Changes

- **BREAKING**: Eine aktive Portion darf nur noch mit einem positiven `weight_g` gespeichert werden.
- Das manuelle Anlegen und Bearbeiten von Portionen weist fehlende oder nicht-positive Gewichte ab.
- Der Backend-Vertrag validiert die Gewichtsregel unabhängig vom Frontend für alle relevanten Erzeugungspfade.
- Bestehende ungewichtete Portionen werden über einen Reparaturpfad geprüft: eindeutig berechenbare Werte werden automatisch ergänzt, unklare Werte erhalten einen KI-Vorschlag und müssen bestätigt oder manuell korrigiert werden.
- Die Zutaten-Detailseite erhält genau einen separaten Portions-Zauberstab im Abschnitt „Portionen“.
- Der Zauberstab sendet bei jedem Aufruf eine neue KI-Anfrage und öffnet anschließend eine Vorschau in einem Dialog.
- Die KI erhält alle verfügbaren relevanten Informationen zur Zutat, einschließlich bestehender Portionen, Packungen, Nährwerte, Eigenschaften, Aliase, Kategorien und Rezeptverwendungen.
- Bereits gewichtete Portionen werden nicht erneut vorgeschlagen oder verändert.
- Ungewichtete bestehende Portionen werden standardmäßig als Ersetzungen markiert.
- Der Zauberstab darf zusätzlich neue typische Portionen vorschlagen; jede neue Portion ist in der Vorschau einzeln auswählbar.
- Wird kein sinnvolles Gewicht vorgeschlagen, erscheint ein manuelles positives Gewichtsfeld in der Vorschau.
- Nach ausdrücklicher Bestätigung werden ausgewählte ungewichtete Portionen gelöscht und als vollständige neue Portionen angelegt. Gewichtete Portionen bleiben erhalten.
- Eine automatisch markierte Ersetzung darf abgewählt werden; die Vorschau muss dann eine gültige Folgeaktion erzwingen, damit keine ungewichtete aktive Portion bestehen bleibt.
- Pydantic- und Food-Zod-Schemas werden für Reparatur-, Vorschau- und Anwendungsantworten synchron erweitert.
- **BREAKING**: Ungewichtete aktive Portionen dürfen nicht mehr in neuen oder aktualisierten Rezeptpositionen verwendet werden.

## Capabilities

### New Capabilities

- `portion-magic-wand`: KI-gestützte Vorschau, Auswahl, manuelle Ergänzung und atomare Anwendung typischer vollständiger Portionen.

### Modified Capabilities

- `portion-data-integrity`: Aktive Portionen benötigen zwingend ein positives Gewicht; ungewichtete Bestandsdaten werden über Reparatur behandelt.
- `ingredient-portion-redesign`: Die bisher erlaubte Speicherung gewichtsloser `Packung`- oder Stückportionen wird durch eine verpflichtende Gewichtsprüfung und den Reparatur-/Vorschlagsfluss ersetzt.
- `recipe-quantity-display`: Rezeptpositionen dürfen keine ungewichteten aktiven Portionen mehr referenzieren und müssen Gewichtsstatus konsistent anzeigen.

## Impact

- Backend-Apps `supply`, `recipe`, `content` und die betroffenen Berechnungs-/Reparaturservices.
- `backend/supply/models/ingredient.py`, Portionschemas, Portions-API, KI-Services und Reparatur-Commands.
- Neue oder angepasste Django-Ninja-Endpunkte für Vorschau, Reparatur und atomare Anwendung.
- Food-Frontend `IngredientDetailPage`, neue Portions-Zauberstab-Komponenten sowie TanStack-Query-API-Hooks.
- Food-Zod-Schemas für Portionen, KI-Vorschläge, Vorschau und Apply-Ergebnisse.
- Bestehende Datenbankzeilen müssen vor oder mit dem Release auditiert werden; abhängig von der gewählten Durchsetzung kann eine Datenmigration oder ein partieller Datenreparaturlauf erforderlich sein.
- Tests für Model/API-Validierung, Reparatur, KI-Vertrag, Vorschauauswahl, Abwahlverhalten, atomare Löschung/Neuanlage und Rezeptverwendung.
