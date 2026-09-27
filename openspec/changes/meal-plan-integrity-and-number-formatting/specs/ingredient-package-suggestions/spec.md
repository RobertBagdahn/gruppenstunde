## ADDED Requirements

### Requirement: KI-Vorschläge für Packungen und Flüssigkeitsdaten
Das System SHALL für genutzte Zutaten (in mindestens einem nicht archivierten Rezept oder Essensplan verwendet, nicht gelöscht) ohne Standardpackung einen Batch-KI-Lauf anbieten, der je Zutat vorschlägt:
- übliche Handelspackung (Name, Gewicht bzw. Volumen, z. B. „500-g-Packung“, „400-g-Dose“, „1-l-Packung“),
- `physical_viscosity` (`solid`, `liquid`, `beverage`),
- `physical_density` für Flüssigkeiten.

Der Lauf MUST den vorhandenen Batch-Mechanismus des Food-Datencockpits nutzen (15 Zutaten je Aufruf, `DEFAULT_TEXT_MODEL`), vorab die geschätzten Kosten anzeigen und SHALL Vorschläge nur speichern, nicht anwenden.

#### Scenario: Vorschläge erzeugen
- **GIVEN** ein Staff-Nutzer im Cockpit
- **WHEN** er „Packungen vorschlagen“ für 638 genutzte Zutaten startet
- **THEN** zeigt das System vorab die geschätzte Anzahl Aufrufe (43) und speichert danach je Zutat einen Vorschlag mit Konfidenz

#### Scenario: Nicht-Staff
- **WHEN** ein angemeldeter Nicht-Staff-Nutzer den Endpunkt aufruft
- **THEN** antwortet die API mit HTTP 403

#### Scenario: Anonym
- **WHEN** ein nicht angemeldeter Nutzer den Endpunkt aufruft
- **THEN** antwortet die API mit HTTP 403

### Requirement: Freigabe der Vorschläge im Cockpit
Staff MUST Vorschläge im Cockpit einzeln oder gesammelt freigeben, bearbeiten oder verwerfen können. Erst die Freigabe legt die `Package` (`rank=1`) an und setzt Viskosität und Dichte; manuell gepflegte Werte SHALL nie überschrieben werden. Die Liste MUST paginiert sein (`page`, `page_size`, Standard 50) und sich nach Konfidenz, Warengruppe und Status filtern lassen (URL-State).

#### Scenario: Gesammelte Freigabe
- **WHEN** Staff „Alle mit Konfidenz ≥ 80 % übernehmen“ wählt
- **THEN** werden für diese Zutaten Packungen angelegt, und die Einkaufsliste zeigt sie sofort

#### Scenario: Vorhandene Packung
- **WHEN** eine Zutat bereits eine manuell gepflegte Standardpackung hat
- **THEN** erzeugt der Lauf keinen Vorschlag für sie
