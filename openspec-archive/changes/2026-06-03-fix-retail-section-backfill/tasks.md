## 1. Keyword-Stammdaten ergänzen

- [x] 1.1 In `supply/services/retail_section_mapping.py` fehlende/zu generische Keywords ergänzen: `SCHAFSKAESE`/`SCHAFSKÄSE` → "Milchprodukte & Käse", `PFLANZENOEL`/`PFLANZENÖL` → "Öle & Soßen", weitere Singular-Varianten wo nötig
- [x] 1.2 Verifizieren, dass `TOMATE` (Singular) und `MÜSLI` über bestehende Keywords matchen; sonst ergänzen

## 2. Backfill-Command

- [x] 2.1 `supply/management/commands/backfill_retail_sections.py` anlegen
- [x] 2.2 Über alle Zutaten mit leerer `retail_section` iterieren und `get_retail_section(name, description)` anwenden
- [x] 2.3 Nur leere Felder füllen (gesetzte niemals überschreiben); Speichern via `bulk_update` mit `--batch-size`
- [x] 2.4 `--dry-run`-Flag: geplante Zuordnungen ausgeben, nicht speichern
- [x] 2.5 Abschluss-Report: Anzahl zugeordnet, Anzahl weiterhin ohne Treffer (mit Namensliste)

## 3. Neuanlage-Pfad verifizieren

- [x] 3.1 Prüfen, dass bei `IngredientCreate`-API und Imports (`import_legacy_food`, `import_inspi_data`) `retail_section` automatisch gesetzt wird; falls Lücke, schließen

## 4. Tests

- [x] 4.1 Mapping-Test für neue Keywords (Schafskäse, Pflanzenöl, Tomate, Müsli)
- [x] 4.2 Command-Test: Zutat ohne Abteilung wird korrekt zugeordnet
- [x] 4.3 Command-Test: idempotent (zweiter Lauf ohne Änderungen)
- [x] 4.4 Command-Test: gesetzte Abteilung wird nicht überschrieben
- [x] 4.5 Command-Test: `--dry-run` speichert nicht

## 5. Ausführung

- [x] 5.1 Auf Staging `--dry-run` laufen lassen und Zuordnungen sichten
- [x] 5.2 Command ohne Dry-Run ausführen; Einkaufsliste prüfen (Müsli, Pflanzenöl, Schafskäse, Tomate nicht mehr "Sonstiges")
