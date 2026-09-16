## Why

Rezeptimporte und KI-Mengenschätzungen behandeln zählbare Lebensmittel wie Zwiebeln, Brötchen oder Knoblauchzehen teilweise als Gramm oder fallen bei fehlendem Gewicht still auf `1 g` zurück. Dadurch werden Rezeptanzeige, Preise, Nährwerte, Einkaufslisten und Portionierung gleichzeitig unzuverlässig.

Die fachliche Entscheidung ist: „Stück“ bleibt ein Portionsname; `Portion.weight_g` bleibt die technische Berechnungsbasis. Fehlende oder abweichende Stückgewichte müssen aber kontrolliert durch KI vorgeschlagen und vom Nutzer bestätigt werden.

## What Changes

- **BREAKING**: Unbekannte Stück-/Portionsangaben dürfen nicht mehr still auf Gramm oder `1 g` zurückfallen.
- Stückartige Angaben werden als benannte Portionen mit einem physischen `weight_g` modelliert; ein neuer MeasuringUnit-Typ für Stück wird nicht eingeführt.
- KI-Importe und KI-Mengenschätzungen liefern für Stückportionen einen expliziten Gewichtsvorschlag sowie den Status „Bestätigung erforderlich“.
- Bereits vorhandene passende Stückportionen werden wiederverwendet.
- Weicht ein KI-Vorschlag von einer vorhandenen Stückportion ab, entscheidet der Nutzer zwischen bestehender Portion und neuer Portion.
- Bestätigte Größenvarianten wie „kleines Brötchen“, „mittleres Brötchen“ und „großes Brötchen“ werden als getrennte Portionen angelegt.
- Der Rezepteditor zeigt die fachliche Portionsmenge und den technischen Grammwert gemeinsam und verwendet keine unsicheren `1`-Fallbacks.
- Preis-, Nährwert-, Meal-Plan- und Einkaufslistenberechnungen verwenden weiterhin die bestätigte Portionengewichtsbasis.
- Pydantic- und Zod-Schemas erhalten die benötigten Gewichtsvorschlags-, Bestätigungs- und Herkunftsfelder.
- Regressionstests decken Import, manuelles Hinzufügen, KI-Mengenschätzung, Portionenwechsel, Anzeige, Preise, Nährwerte und Einkaufslisten ab.

## Capabilities

### New Capabilities

- `piece-portion-mapping`: Sichere Zuordnung, Bestätigung und Anzeige von stückartigen Rezeptportionen mit technischer Grammbasis.

### Modified Capabilities

- `piece-unit-type`: Die bisherige Entfernung von Stück aus dem MeasuringUnit-System wird durch die Portionsnamen- und Gewichtsbasis-Regel ersetzt.
- `portion-data-integrity`: Implizite 1-g-Gewichte für unbestätigte stückartige Portionen werden verboten.
- `recipe-quantity-display`: Fachliche Portionsnamen und technische Grammäquivalente werden gemeinsam und konsistent angezeigt.

## Impact

- Backend-Apps `supply`, `recipe`, `planner` und `shopping`.
- Dienste `unit_resolution`, `portion_knowledge`, URL-/Textimport, Rezept-KI, Mengenschätzung, Rezeptcache, Preis- und Einkaufsberechnung.
- Food-Frontend: `InlineIngredientEditor`, Rezeptwizard, Rezeptdetailseite, Portionendialoge und Zutatendetailseite.
- Pydantic-Schemas in `backend/recipe/schemas` und `backend/supply/schemas`; zugehörige Zod-Schemas in `frontend-food/src/schemas`.
- Neue Migrationen beziehungsweise Datenkorrekturen für Portion-Metadaten; bestehende Migrationen werden nicht geändert.
