## ADDED Requirements

### Requirement: Wizard-Einstieg über Route und Button

Das System SHALL einen Full-Page Wizard unter `/meal-plans/new` bereitstellen. Der Einstieg erfolgt über den Button „Neuer Essensplan" in der Essensplan-Liste (`MealEventListPage`). Der Button ersetzt den bisherigen Dialog-basierten Create-Flow.

#### Scenario: Authentifizierter User öffnet Wizard
- **WHEN** ein authentifizierter User den Button „Neuer Essensplan" auf `/meal-plans` klickt
- **THEN** wird zu `/meal-plans/new` navigiert und der Wizard in Schritt 1 geöffnet

#### Scenario: Nicht-authentifizierter User öffnet Wizard
- **WHEN** ein nicht-authentifizierter User `/meal-plans/new` aufruft
- **THEN** wird die UnauthGate-Komponente mit Login-Aufforderung angezeigt

### Requirement: Wizard-Schritte

Der Wizard SHALL aus 3-4 Schritten bestehen:
1. **Basic Settings**: Name, Personenanzahl, Start-/Enddatum, Ernährungstags
2. **Strategy**: Auswahl der Befüllungs-Strategie (Leer / Referenz / KI)
3. **AI Prompt** (nur bei KI-Strategie): Freitext-Prompt + Generierungs-Button + Vorschau
4. **Cockpit**: Zusammenfassung aller Einstellungen + Erstellen-Button

#### Scenario: Wizard durchläuft alle Schritte
- **WHEN** ein User den Wizard öffnet und alle Schritte nacheinander mit gültigen Eingaben durchläuft
- **THEN** kann er im Cockpit auf „Essensplan erstellen" klicken

#### Scenario: Navigation zwischen Schritten
- **WHEN** ein User in Schritt 2 oder 3 ist und auf „Zurück" klickt
- **THEN** wird der vorherige Schritt mit allen getätigten Eingaben angezeigt

### Requirement: Einfach/Erweitert-Toggle

Der Wizard SHALL in Schritt 1 einen Toggle „Einfach / Erweitert" anbieten. Im Einfach-Modus werden nur Name, Personen, Start/Ende-Datum und Ernährungstags angezeigt. Im Erweitert-Modus werden zusätzlich Beschreibung, Reservefaktor, Budget pro Person/Tag, Tagesanteil-Faktoren, Standard-Essenszeiten, Sichtbarkeit und Ist-Vorlage-Flag angezeigt.

#### Scenario: Einfach-Modus zeigt Kernfelder
- **WHEN** der User den Wizard öffnet und der Toggle auf „Einfach" steht
- **THEN** werden nur die Felder Name, Personen, Start/Ende-Datum und Ernährungstags angezeigt

#### Scenario: Erweitert-Modus zeigt alle Felder
- **WHEN** der User den Toggle auf „Erweitert" umschaltet
- **THEN** werden zusätzlich Beschreibung, Reservefaktor, Budget, Tagesanteil-Faktoren, Standard-Essenszeiten, Sichtbarkeit und Ist-Vorlage sichtbar

### Requirement: Drei Befüllungs-Strategien

Der Wizard SHALL in Schritt 2 drei Strategien zur Auswahl stellen:
- **Leer**: Es wird nur das Grundgerüst (Tage + leere Mahlzeiten-Slots) erstellt
- **Referenz**: Ein bestehender Plan wird komplett kopiert (Deep Copy mit Datum-Offset)
- **KI**: Ein Freitext-Prompt wird an Gemini gesendet, der existierende Rezepte vorschlägt

#### Scenario: Strategie Leer ausgewählt
- **WHEN** ein User „Leeren Plan erstellen" auswählt
- **THEN** wird bei der Erstellung nur das Grundgerüst (Tage + Mahlzeiten) ohne Rezepte angelegt

#### Scenario: Strategie Referenz ausgewählt
- **WHEN** ein User „Aus Referenz kopieren" auswählt und einen Quell-Plan aus einer Dropdown-Liste wählt
- **THEN** wird beim Klick auf „Erstellen" der `POST /api/meal-plans/{id}/duplicate/`-Endpoint mit den Wizard-Settings aufgerufen

#### Scenario: Strategie KI ausgewählt
- **WHEN** ein User „KI generieren lassen" auswählt
- **THEN** wird Schritt 3 (AI Prompt) eingeblendet

### Requirement: localStorage-Persistenz

Der Wizard-Zustand SHALL bei jedem Step-Wechsel in `localStorage` unter dem Schlüssel `meal-plan-wizard` persistiert werden. Bei erfolgreicher Erstellung oder explizitem Abbrechen SHALL der Eintrag gelöscht werden. Beim Laden des Wizards SHALL geprüft werden, ob ein gespeicherter Zustand existiert und ob die Version kompatibel ist.

#### Scenario: Browser-Refresh erhält Zustand
- **WHEN** ein User in Schritt 2 Daten eingegeben hat und den Browser refreshed
- **THEN** wird der Wizard mit allen vorherigen Eingaben in Schritt 2 fortgesetzt

#### Scenario: Erfolgreiche Erstellung löscht Persistenz
- **WHEN** ein User einen Essensplan erfolgreich erstellt hat
- **THEN** wird der localStorage-Eintrag `meal-plan-wizard` gelöscht

#### Scenario: Inkompatible Version verwirft Persistenz
- **WHEN** ein gespeicherter Zustand mit einer älteren Version im localStorage existiert
- **THEN** wird der Zustand verworfen und der Wizard startet neu

### Requirement: Cockpit-Zusammenfassung

Der letzte Schritt SHALL eine lesbare Zusammenfassung aller Einstellungen anzeigen:
- Name, Personen, Zeitraum, Budget (falls gesetzt), Ernährungstags
- Gewählte Strategie mit Details (Quell-Plan-Name bei Referenz, generierte Tage bei KI, leerer Plan-Hinweis bei Leer)

#### Scenario: Cockpit zeigt alle Einstellungen
- **WHEN** ein User den Cockpit-Schritt erreicht
- **THEN** werden Name, Personen, Zeitraum, Ernährungstags und die gewählte Strategie mit Details angezeigt

#### Scenario: Cockpit bei Referenz-Strategie zeigt Quell-Plan
- **WHEN** ein User die Referenz-Strategie gewählt hat und im Cockpit ist
- **THEN** wird der Name des Quell-Plans angezeigt

#### Scenario: Cockpit bei Leer-Strategie zeigt Hinweis
- **WHEN** ein User die Leer-Strategie gewählt hat und im Cockpit ist
- **THEN** wird der Hinweis „Der Plan wird ohne vorbefüllte Rezepte erstellt" angezeigt

### Requirement: Wizard erstellt Essensplan

Der Wizard SHALL beim Klick auf „Essensplan erstellen" im Cockpit den entsprechenden Create- oder Duplicate-API-Call ausführen. Bei Erfolg SHALL der User zur Detail-Seite des neuen Plans navigiert werden.

#### Scenario: Leere-Plan-Erstellung ruft Create-API auf
- **WHEN** ein User im Cockpit bei Strategie „Leer" auf „Essensplan erstellen" klickt
- **THEN** wird `POST /api/meal-plans/` mit allen Wizard-Settings aufgerufen

#### Scenario: Referenz-Plan-Erstellung ruft Duplicate-API auf
- **WHEN** ein User im Cockpit bei Strategie „Referenz" auf „Essensplan erstellen" klickt
- **THEN** wird `POST /api/meal-plans/{id}/duplicate/` mit neuen Settings aufgerufen

#### Scenario: KI-Plan-Erstellung ruft Create-API mit generierten Rezepten auf
- **WHEN** ein User im Cockpit bei Strategie „KI" auf „Essensplan erstellen" klickt
- **THEN** wird zuerst `POST /api/meal-plans/` aufgerufen, dann werden die generierten Rezepte via `POST /api/meal-plans/{id}/meals/{mealId}/wizard-items/` zugeordnet

#### Scenario: Erfolgreiche Erstellung navigiert zur Detail-Seite
- **WHEN** die Erstellung erfolgreich war
- **THEN** wird der User zu `/meal-plans/{id}` weitergeleitet

#### Scenario: Fehler bei Erstellung zeigt Toast
- **WHEN** die Erstellung fehlschlägt
- **THEN** wird ein roter Toast mit der Fehlermeldung angezeigt
- **AND** der User bleibt im Cockpit und kann es erneut versuchen
