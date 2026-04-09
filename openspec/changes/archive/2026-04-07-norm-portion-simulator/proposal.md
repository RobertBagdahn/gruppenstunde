## Why

Pfadfinder-Gruppenführer müssen Rezeptmengen an unterschiedliche Gruppen anpassen — Kinder brauchen weniger als Jugendliche oder Erwachsene. Die bestehende `NormPerson`-Logik im Backend (`norm_person_service.py`) berechnet bereits geschlechts-, alters- und aktivitätsabhängige Energiebedarfe, ist aber weder über eine API erreichbar noch im Frontend nutzbar. Ein Normportion-Simulationstool macht diese Berechnung für Gruppenführer interaktiv zugänglich: Graphen zeigen Energiebedarf und Normfaktor nach Alter/Geschlecht/Aktivität, und die Portionenskalierung wird transparent nachvollziehbar.

## What Changes

- **Neuer API-Endpunkt** für Normperson-Berechnungen: Energiebedarf (TDEE), BMR, Normfaktor, Gewicht und Größe nach Alter, Geschlecht und Aktivitätslevel (PAL)
- **Neuer API-Endpunkt** für Bulk-Berechnung: Normfaktor-Kurven über alle Alter (0–99) für m/w bei gegebenem Aktivitätslevel — für die Graph-Darstellung
- **Neue Frontend-Seite** `/tools/norm-portion-simulator`: Interaktives Simulationstool mit:
  - Graphen für Energiebedarf (kJ) nach Alter, getrennt nach männlich/weiblich
  - Graphen für Normfaktor nach Alter, getrennt nach männlich/weiblich
  - Auswahl des Aktivitätslevel (PAL) als Steuerelement
  - Anzeige der Referenz-Normperson (15 Jahre, männlich, PAL 1.5)
  - Einzelberechnung: Alter + Geschlecht + Aktivität → Normfaktor + Details
- **Integration in die Tools-Navigation**: Neuer Eintrag im Tools-Bereich

## Capabilities

### New Capabilities
- `norm-portion-simulator`: Interaktives Frontend-Tool zur Visualisierung und Simulation von Normportionen basierend auf Alter, Geschlecht und Aktivitätslevel. Beinhaltet API-Endpunkte für Einzel- und Bulk-Berechnungen sowie die Frontend-Seite mit Graphen und Eingabesteuerung.

### Modified Capabilities
<!-- Keine bestehenden Specs werden in ihren Requirements verändert. Die bestehende norm_person_service.py wird lediglich durch neue API-Endpunkte exponiert. -->

## Impact

- **Backend (`supply` App)**:
  - Neue API-Endpunkte in `backend/supply/api/` (neuer Router oder Erweiterung des bestehenden)
  - Neue Pydantic-Schemas in `backend/supply/schemas/` für Normfaktor-Responses
  - Bestehender `norm_person_service.py` wird genutzt (keine Änderung nötig)
  - Keine Datenbankmigrationen erforderlich (reine Berechnung, kein neues Model)
- **Frontend**:
  - Neue Zod-Schemas in `frontend/src/schemas/` für Normfaktor-Daten
  - Neue TanStack Query Hooks in `frontend/src/api/`
  - Neue Seite `frontend/src/pages/tools/NormPortionSimulatorPage.tsx`
  - Chart-Bibliothek: recharts (bereits im Projekt oder als neue Dependency)
  - Neue Route `/tools/norm-portion-simulator` in `App.tsx`
  - Tools-Navigation aktualisieren
- **Keine Breaking Changes**, keine Migrationen, keine bestehenden APIs betroffen
