## Why

Der `import_inspi_data`-Command setzt `retail_section = None` für alle importierten Zutaten, obwohl die Quelldaten (`food.ingredient.description`) Kategorie-Informationen enthalten. Außerdem fehlt vielen Zutaten `price_per_kg`, weil sie aus manuellen Quellen stammen oder der Import den Preis nicht korrekt zuordnet. Das führt dazu, dass Einkaufslisten alle Items unter "Sonstiges" gruppieren und keine Preise anzeigen.

## What Changes

- **Import-Command fixen**: `retail_section` aus der `description` der Legacy-Daten ableiten (REWE-Kategorien wie "GEWÜRZE MISCHUNG STREUER" → RetailSection "Gewürze & Kräuter")
- **Kategorie-Mapping erstellen**: Mapping von REWE-Beschreibungskategorien zu `RetailSection`-Einträgen
- **Fehlende Preise via Referenz-Ingredient lösen**: Wenn `price_per_kg` aus `metainfo` vorhanden ist, sicherstellen dass es korrekt übernommen wird
- **Batch-Nachpflege**: Management-Command zum nachträglichen Zuweisen von `retail_section` für existierende Ingredients ohne Kategorie (via Description-Parsing oder AI-Service)

## Capabilities

### New Capabilities
- `ingredient-category-mapping`: Mapping-Logik von REWE-Beschreibungstexten zu RetailSection, inkl. Batch-Nachpflege für existierende Daten

### Modified Capabilities
- `inspi-data-import`: Import muss `retail_section` korrekt zuweisen statt immer `None` zu setzen

## Impact

- **Backend**: `core/management/commands/import_inspi_data.py` (Zeile 443-444 — retail_section Zuweisung)
- **Backend**: Neues Mapping-Modul oder Erweiterung in `supply/services/`
- **Models**: Keine Änderungen (RetailSection und Ingredient.retail_section existieren bereits)
- **Schemas**: Keine Änderungen nötig
- **Migrations**: Keine nötig
- **Frontend**: Keine Änderungen — zeigt bereits korrekt an wenn Daten vorhanden
