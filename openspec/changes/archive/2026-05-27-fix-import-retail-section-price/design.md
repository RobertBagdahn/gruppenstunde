## Context

Der `import_inspi_data`-Command importiert ~5000+ Zutaten aus REWE-Daten. Die Beschreibung jeder Zutat enthält eine REWE-Unterkategorie (z.B. "SCHOKOLADE BIS 100 G", "ITALIENISCHE TEIGWAREN", "GEMUESE DOSE"). Diese muss auf die 30 existierenden `RetailSection`-Einträge gemappt werden.

Aktueller Stand im Import (Zeile 443-444 von `import_inspi_data.py`):
```python
# Resolve retail_section FK (not in fixture data, but might be set)
retail_section = None
```

## Goals / Non-Goals

**Goals:**
- REWE-Unterkategorien aus `description` auf `RetailSection` mappen
- `price_per_kg` korrekt aus `metainfo` übernehmen (funktioniert bereits — Problem sind nur manuell angelegte Ingredients)
- Batch-Command zum Nachpflegen existierender Ingredients ohne `retail_section`

**Non-Goals:**
- Kein AI-Service für Kategorie-Zuweisung (zu langsam für Bulk)
- Keine neuen RetailSections anlegen
- Keine Preis-Schätzung für Ingredients ohne `price_per_kg`

## Decisions

1. **Keyword-basiertes Mapping**: Ein Dict mappt REWE-Kategorien-Strings (aus dem letzten `-`-Segment der Description) auf `RetailSection`-IDs. Fallback: `retail_section = None` (nicht "Sonstiges" als FK).

2. **Mapping als eigenes Modul**: `supply/services/retail_section_mapping.py` — wiederverwendbar für Import und Batch-Nachpflege.

3. **Batch-Nachpflege als separater Management-Command**: `assign_retail_sections` iteriert über Ingredients mit `retail_section=None` und wendet das Mapping an.

4. **Import-Fix inline**: `_import_ingredients_and_portions` ruft das Mapping auf, bevor `Ingredient` gespeichert wird.

## Risks / Trade-offs

- **Unvollständiges Mapping**: ~400 REWE-Kategorien müssen auf 30 RetailSections gemappt werden. Einige werden nicht matchen → bleiben `None`. Das ist akzeptabel.
- **Erneuter Import nötig**: Existierende Ingredients werden nicht automatisch gefixt. Der Batch-Command muss manuell laufen.
