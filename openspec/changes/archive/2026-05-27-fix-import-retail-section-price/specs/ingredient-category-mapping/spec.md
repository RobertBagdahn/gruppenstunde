## Capability: ingredient-category-mapping

### Requirements

1. **Mapping-Modul** (`supply/services/retail_section_mapping.py`):
   - Funktion `get_retail_section_from_description(description: str) -> RetailSection | None`
   - Extrahiert das letzte Segment nach ` - ` aus der Description
   - Normalisiert (uppercase, strip) und sucht im Keyword-Mapping
   - Keyword-Mapping: Dict[str, int] wo Key ein Substring ist und Value die RetailSection-ID

2. **Keyword-Mapping** (Auszug der wichtigsten Zuordnungen):
   - SCHOKO*, PRALIN*, FRUCHTGUMMI, WAFFELN, BONBON* → 11 (Süßigkeiten)
   - TEIGWAREN, NUDEL* → 15 (Nudeln und Reis)
   - GEMUESE*, OLIVEN, GURKEN → 2 (Gemüse) / 8 (Konserven) je nach "DOSE"/"KONSERVEN"
   - TK-* → 7 (Tiefkühlkost)
   - JOGHURT, QUARK, PUDDING, MILCH* → 4 (Milchprodukte)
   - TEE, KAFFEE → 12 (Kaffee und Tee)
   - PIZZA, FERTIG* → 16 (Fertiggerichte)
   - KEKS, KNÄCKEBROT, LEBKUCHEN → 5 (Backwaren)
   - BROTAUFSTRICH, NUSS-SCHOKO-CREME → 28 (Brotaufstriche)
   - SAUCE*, DRESSING* → 18 (Saucen und Dressings)
   - GEWÜRZ*, KRÄUTER* → 13 (Gewürze)
   - KARTOFFEL* → 21 (Kartoffelprodukte)
   - WURST, SALAMI → 23 (Wurst)
   - KÄSE → 22 (Käse)
   - OBST*, TROCKENOBST → 1 (Obst)
   - KERNE, NÜSSE, ERDNÜSSE → 9 (Salzige Snacks)
   - ÖL, ESSIG → 19 (Öl und Essig)
   - MÜSLI, CEREALIEN, HAFERFLOCKEN → 20 (Müsli und Cerealien)
   - KONFITÜRE, MARMELADE → 28 (Brotaufstriche)

3. **Import-Fix**: In `_import_ingredients_and_portions`, nach Zeile 443:
   ```python
   from supply.services.retail_section_mapping import get_retail_section_from_description
   retail_section = get_retail_section_from_description(fields.get("description", ""))
   ```

4. **Batch-Command** (`assign_retail_sections`):
   - Iteriert über `Ingredient.objects.filter(retail_section__isnull=True)`
   - Wendet `get_retail_section_from_description(ing.description)` an
   - Setzt `retail_section` und speichert mit `bulk_update`
   - Output: Anzahl zugewiesener Ingredients pro RetailSection
