# Cooklang Unit Resolution

## Overview
Korrekte Auflösung und Umrechnung von Einheiten beim Cooklang-Import.

## Requirements

### MUST
- Der Importer MUSS "kg" in Gramm umrechnen (×1000) und MeasuringUnit "gramm" zuweisen
- Der Importer MUSS "L"/"l"/"liter" in Milliliter umrechnen (×1000) und MeasuringUnit "milliliter" zuweisen
- Der Importer MUSS "ml" direkt auf MeasuringUnit "milliliter" mappen
- Der Importer MUSS "EL"/"el" auf MeasuringUnit "esslöffel" mappen
- Der Importer MUSS "TL"/"tl" auf MeasuringUnit "teelöffel" mappen
- Der Importer MUSS "Packung"/"Paket"/"Tüte" auf MeasuringUnit "packung" mappen (falls vorhanden)
- Bei nicht-auflösbaren Einheiten MUSS der Original-Einheitstext in `RecipeItem.note` gespeichert werden

### SHOULD
- Der Importer SOLLTE case-insensitive matchen (L = l = Liter)

## Acceptance Criteria

- **GIVEN** eine Cooklang-Datei mit `@Zucker{0.3%kg}`
  **WHEN** der Import läuft
  **THEN** wird ein RecipeItem mit quantity=300, measuring_unit="gramm" erstellt

- **GIVEN** eine Cooklang-Datei mit `@Wasser{12%L}`
  **WHEN** der Import läuft
  **THEN** wird ein RecipeItem mit quantity=12000, measuring_unit="milliliter" erstellt

- **GIVEN** eine Cooklang-Datei mit `@Apfeltee{0.5%Packung}`
  **WHEN** MeasuringUnit "packung" existiert
  **THEN** wird ein RecipeItem mit quantity=0.5, measuring_unit="packung" erstellt

- **GIVEN** eine Cooklang-Datei mit `@Mehl{1%unbekannte einheit}`
  **WHEN** der Import läuft
  **THEN** wird RecipeItem mit measuring_unit="gramm", note="unbekannte einheit" erstellt
