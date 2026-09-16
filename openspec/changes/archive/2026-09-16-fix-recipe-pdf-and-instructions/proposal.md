## Why

Der Rezept-PDF-Export verwendet immer die gespeicherte Normportion, bietet keine Personenzahl im Exportdialog und ignoriert strukturierte `RecipeStep`-Einträge. Gleichzeitig werden freie Beschreibung und echte Zubereitungsschritte im UI unter einer missverständlichen gemeinsamen Überschrift geführt.

Dadurch unterscheiden sich Rezeptdetailseite, Kochmodus, Rezept-PDF und Planer-Exporte bei denselben Rezeptdaten.

## What Changes

- Der PDF-Dialog erhält eine eigene Personenzahl und übergibt sie an den Export.
- Zutatenmengen und Nährwerte werden im PDF auf die gewählte Personenzahl skaliert, ohne die gespeicherte Normportion zu verändern.
- Das PDF enthält Beschreibung und strukturierte Zubereitungsschritte als getrennte Abschnitte.
- Strukturierte Schritte werden inklusive Reihenfolge, Sektionen, Dauer, Platzhalterauflösung und Schritt-Zutaten exportiert; fehlende strukturierte Schritte fallen auf Markdown zurück.
- Das UI benennt freie Inhalte als `Beschreibung` und strukturierte Inhalte als `Zubereitungsschritte`.
- Rezeptdetailseite und Kochmodus zeigen strukturierte Schritte auch lesenden Nutzern konsistent an.
- Direkte Gramm-Rezeptitems, Notizen und stückartige Portionsanzeigen werden im PDF korrekt berücksichtigt.
- Page-Format, Metadaten, Allergene und Nährwertberechnung des PDFs werden gegen den tatsächlichen Context synchronisiert.
- Cooking-Schedule- und relevante Meal-Plan-Exports verwenden dieselbe Zubereitungspriorität.
- Pydantic- und Zod-Schemas sowie PDF-/Workflowtests werden aktualisiert.

## Capabilities

### New Capabilities

- `recipe-pdf-serving-context`: Exportdialog und Backend unterstützen eine temporäre Zielpersonenzahl für Rezept-PDFs.
- `recipe-instruction-presentation`: Beschreibung und strukturierte Zubereitungsschritte werden in allen Rezeptansichten und Exporten konsistent dargestellt.

### Modified Capabilities

- `recipe-pdf-export`: Mengen, Nährwerte, direkte Items, Schritte und Metadaten werden vollständig und auf die Zielpersonenzahl skaliert exportiert.
- `recipe/structured-instructions`: Strukturierte Schritte werden als kanonischer Schrittinhalt für lesende Ansichten und Exporte verarbeitet, ohne die freie Beschreibung zu verwechseln.
- `cooking-schedule-pdf-export`: Zubereitungsschritte werden analog zum Rezept-PDF aus strukturierten Daten mit Markdown-Fallback erzeugt.

## Impact

- Backend-Apps `recipe` und `planner`, insbesondere PDF-Services, Templates, Schritt-Resolver und APIs.
- Food-Frontend: `PdfExportDialog`, `RecipeDetailPage`, `RecipeCookingMode`, `EditRecipePage`, Wizard-Schritte und Rezeptschemas.
- Neue Query-Parameter und Pydantic/Zod-Felder für Exportpersonenzahl und konsistente Schrittinhalte.
- Keine Änderung an der gespeicherten Normportions-Invariante; nur der Exportkontext wird temporär skaliert.
