## Why

Viele Zutaten besitzen keinen Preis. Rezept- und Meal-Plan-Kosten werden dadurch teilweise berechnet oder erscheinen je nach Verbraucher unterschiedlich. Eine KI-Schätzung kann die Datenqualität verbessern, darf aber nicht unbestätigt als globaler Zutatenpreis gespeichert werden.

## What Changes

- Fehlende oder ungültige Zutatenpreise können durch Gemini vorgeschlagen werden.
- Jeder Vorschlag enthält den geschätzten Preis pro kg, Konfidenz, Quelle/Begründung und den betroffenen Zutatenkontext.
- Nutzer können Vorschläge einzeln oder gesammelt bestätigen oder ablehnen.
- Erst bestätigte Vorschläge werden global an der Zutat als `price_per_kg` gespeichert.
- Der Ursprung des Preises (manuell, KI-geschätzt, bestätigt) wird nachvollziehbar gespeichert.
- `NULL` und `0` werden in Preisberechnung und Datenqualität einheitlich als fehlender Preis behandelt.
- Rezept- und Meal-Plan-Kosten zeigen nach Bestätigung eine vollständige oder weiterhin partielle Preisabdeckung transparent an.
- KI darf bestehende positive Preise nicht ohne explizite Nutzeraktion überschreiben.
- Pydantic- und Zod-Schemas sowie Admin-/Food-Frontend für Vorschlag, Bestätigung und Abdeckung werden synchron erweitert.

## Capabilities

### New Capabilities

- `ai-price-approval`: KI-Preisvorschläge mit Nutzerbestätigung, Herkunft und globaler Speicherung.

### Modified Capabilities

- `data-quality-dashboard`: Fehlende und auf null gesetzte Preise werden einheitlich erkannt und über den Bestätigungsworkflow bearbeitet.
- `recipe`: Rezeptpreise und Preisabdeckung unterscheiden bekannte, fehlende und KI-vorgeschlagene Preise.
- `meal-plan`: Kostenübersichten verwenden bestätigte Preise und zeigen unvollständige Abdeckung transparent an.

## Impact

- Backend-Apps `supply`, `recipe`, `planner`, `content` und gegebenenfalls `shopping`.
- Preisservice, Zutatenmodelle/Schemas, KI-Service, Datenqualitäts-API und Cacheinvalidierung.
- Food-Frontend für Zutatenverwaltung, Rezeptkosten und Meal-Plan-Kosten.
- Neue Migration für Preisquelle/-status oder ein separates Vorschlagsmodell; bestehende Preise werden nicht automatisch überschrieben.
