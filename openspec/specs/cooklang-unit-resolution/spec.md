# Cooklang Unit Resolution

## Purpose
Korrekte Auflösung und Umrechnung von Einheiten beim Cooklang-Import.

## Requirements
### Requirement: Metrische Einheiten werden umgerechnet
Der Importer MUST „kg“ in Gramm umrechnen (×1000) und die MeasuringUnit „gramm“ zuweisen. „L“, „l“ und „liter“ MUST in Milliliter umgerechnet werden (×1000) mit der MeasuringUnit „milliliter“; „ml“ MUST direkt auf „milliliter“ abgebildet werden.

#### Scenario: Kilogramm
- **GIVEN** eine Cooklang-Datei mit `@Zucker{0.3%kg}`
- **WHEN** der Import läuft
- **THEN** wird ein RecipeItem mit quantity=300 und measuring_unit="gramm" erstellt

#### Scenario: Liter
- **GIVEN** eine Cooklang-Datei mit `@Wasser{12%L}`
- **WHEN** der Import läuft
- **THEN** wird ein RecipeItem mit quantity=12000 und measuring_unit="milliliter" erstellt

### Requirement: Küchen- und Gebindeeinheiten werden zugeordnet
Der Importer MUST „EL“/„el“ auf die MeasuringUnit „esslöffel“ und „TL“/„tl“ auf „teelöffel“ abbilden. „Packung“, „Paket“ und „Tüte“ MUST auf „packung“ abgebildet werden, sofern diese MeasuringUnit existiert.

#### Scenario: Packung
- **GIVEN** eine Cooklang-Datei mit `@Apfeltee{0.5%Packung}`
- **WHEN** der Import läuft und die MeasuringUnit „packung“ existiert
- **THEN** wird ein RecipeItem mit quantity=0.5 und measuring_unit="packung" erstellt

### Requirement: Nicht auflösbare Einheiten bleiben als Notiz erhalten
Bei nicht auflösbaren Einheiten MUST der Importer den Original-Einheitstext in `RecipeItem.note` speichern.

#### Scenario: Unbekannte Einheit
- **GIVEN** eine Cooklang-Datei mit `@Mehl{1%unbekannte einheit}`
- **WHEN** der Import läuft
- **THEN** wird ein RecipeItem mit measuring_unit="gramm" und note="unbekannte einheit" erstellt

### Requirement: Groß- und Kleinschreibung der Einheit ist egal
Der Importer SHALL Einheiten ohne Beachtung der Groß- und Kleinschreibung erkennen („L“ = „l“ = „Liter“).

#### Scenario: Liter in Kleinschreibung
- **GIVEN** eine Cooklang-Datei mit `@Wasser{1%liter}`
- **WHEN** der Import läuft
- **THEN** wird ein RecipeItem mit quantity=1000 und measuring_unit="milliliter" erstellt
