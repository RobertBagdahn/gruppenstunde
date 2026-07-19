## MODIFIED Requirements

### Requirement: Staff-only Admin-Bereich

Das food-frontend MUST einen Admin-Bereich unter `/admin` bereitstellen, der nur für authentifizierte Staff-User zugänglich ist. Der Admin-Bereich SHALL zusätzlich zu den bestehenden Tabs (Freigaben, Abteilungen, Equipment, Ernährungstags, Tags, Regeln, KI Feedback) einen Navigationspunkt "Datenqualität" enthalten, der zu `/admin/data-quality` führt.

Der KI-Feedback-Tab SHALL über die bestehenden Vote-Metriken hinaus folgende Kosten-Visualisierungen enthalten: Übersichtskarten für Gesamtkosten und Token-Verbrauch, erweiterte Kontext-Tabelle mit Kosten-/Token-Spalten, Kosten-Verlaufschart, Zeitraum-Filter, Embedding-Toggle, Pro-User-Kosten-Tabelle mit Detail-Modal und ausklappbare Gemini-Pricing-Sektion.

#### Scenario: Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=true` auf `/admin` navigiert
- **THEN** wird die Admin-Seite mit Tab-Navigation angezeigt
- **THEN** SHALL die Tab-Navigation den Eintrag "Datenqualität" enthalten

#### Scenario: Nicht-Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=false` auf `/admin` navigiert
- **THEN** wird der User auf `/recipes` weitergeleitet

#### Scenario: Nicht-authentifizierter User greift auf Admin zu
- **WHEN** ein nicht-authentifizierter User auf `/admin` navigiert
- **THEN** wird der User auf `/login` weitergeleitet

#### Scenario: Datenqualität direkt aufrufbar
- **WHEN** Staff-User auf `/admin/data-quality` navigiert
- **THEN** SHALL das Datenqualität-Dashboard mit Zutaten/Rezepte-Auswahl geladen werden

#### Scenario: KI-Feedback-Tab zeigt Kosten
- **WHEN** Staff-User den "KI Feedback"-Tab öffnet
- **THEN** SHALL das Dashboard sechs Übersichtskarten anzeigen (Gesamt, Heute, Bewertet, Feedback-Rate, Gesamtkosten, Token-Verbrauch)
- **THEN** SHALL die Kontext-Tabelle Token- und Kosten-Spalten enthalten
- **THEN** SHALL ein Kosten-Verlaufschart sichtbar sein
- **THEN** SHALL ein Zeitraum-Dropdown und Embedding-Toggle vorhanden sein
- **THEN** SHALL eine Pro-User-Kosten-Tabelle mit klickbaren Zeilen existieren
- **THEN** SHALL eine ausklappbare "Gemini-Preise"-Sektion vorhanden sein
