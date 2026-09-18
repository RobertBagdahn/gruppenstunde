## Why

Die Portions-KI liefert aktuell nicht zuverlässig nutzbare Vorschläge. Vorschläge werden bei kleinen Abweichungen in Einheiten oder bei weniger als vier Ergebnissen verworfen, während historische `Stück`-Daten fachlich als Gramm behandelt werden. Dadurch zeigt der Dialog häufig nur unvollständige Standardportionen oder kann keine guten Portionen übernehmen.

## What Changes

- Die Portions-KI erhält einen klaren Vertrag für typische Portionen, Stück-/Verpackungsportionen und physische Grammgewichte.
- KI-Einheiten werden robust gegen bekannte Schreibweisen und Synonyme aufgelöst, ohne ungültige Einheiten stillschweigend zu akzeptieren.
- Vorschläge werden einzeln, nachvollziehbar und mit verständlichen Gründen im Dialog angezeigt; brauchbare Ergebnisse werden nicht wegen einer starren Mindestanzahl verworfen.
- Bestehende gewichtete Portionen bleiben geschützt; ungewichtete und semantisch fehlerhafte Portionen werden kontrolliert ersetzt oder zur manuellen Klärung markiert.
- Backend-Pydantic- und Frontend-Zod-Verträge werden synchronisiert und der Flow erhält Tests für typische Lebensmittel, Stückportionen, leere/teilweise KI-Antworten, veraltete Vorschauen und Übernahmefehler.
- Eine Datenmigration korrigiert die fachliche Zuordnung von stückartigen Einheiten und verhindert, dass neue KI-Portionen wieder als Gramm-Portionen mit falscher Semantik angelegt werden.

## Capabilities

### New Capabilities

- `reliable-ai-portion-generation`: Robuste, fachlich nachvollziehbare KI-Erzeugung und Bestätigung typischer Ingredient-Portionen.

### Modified Capabilities

- `portion-magic-wand`: Der bestehende Vorschau- und Übernahmevertrag wird um robuste Einheitenauflösung, partielle Ergebnisse und klare Zustände für unvollständige Vorschläge erweitert.
- `piece-portion-mapping`: Die fachliche Darstellung und Berechnung stückartiger Portionen wird mit der Portions-KI und den MeasuringUnit-Daten konsistent gemacht.
- `measuring-unit-cleanup`: Die Bereinigung darf keine falsche Gramm-Semantik für stückartige Portionen erzeugen und muss die KI-Einheitenauflösung berücksichtigen.

## Impact

- Backend: `backend/supply/services/portion_magic_wand.py`, Portion-/MeasuringUnit-Modelle und Services, API- und Pydantic-Schemas, Datenmigrationen sowie Supply-Tests.
- Food-Frontend: Portionsdialog auf `IngredientDetailPage.tsx`, `supply.ts`-Zod-Schemas, API-Hook und UI-/Integrationstests.
- Bestehende Portionen und Rezeptreferenzen müssen migrationssicher erhalten bleiben; gewichtete Portionen dürfen nicht automatisch überschrieben werden.
- Keine neue externe Abhängigkeit ist vorgesehen. Die bestehende Gemini-Integration bleibt der KI-Anbieter.
