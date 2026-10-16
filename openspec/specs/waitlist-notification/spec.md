# Waitlist Notification

## Purpose
Automatische E-Mail-Benachrichtigung an den nächsten Wartelisten-Eintrag, wenn ein Platz frei wird.

## Requirements
### Requirement: E-Mail an den nächsten Wartelisten-Eintrag
`WaitlistService.notify_next()` SHALL eine deutschsprachige E-Mail an die E-Mail-Adresse des `WaitlistEntry.user` senden. Der Betreff MUST „Platz frei bei {event_name}“ lauten; der Inhalt MUST Event-Name, Buchungsoption, die Frist von 48 Stunden und einen Link zur Event-Seite enthalten.

#### Scenario: Platz wird frei
- **GIVEN** ein Event mit einem Wartelisten-Eintrag
- **WHEN** `notify_next()` aufgerufen wird
- **THEN** erhält der Nutzer des nächsten Eintrags eine E-Mail mit Betreff „Platz frei bei {event_name}“
- **AND** die E-Mail nennt Buchungsoption, 48-Stunden-Frist und den Link zur Event-Seite

### Requirement: Benachrichtigungszeitpunkt und Fehlerbehandlung
`notified_at` SHALL erst nach erfolgreichem E-Mail-Versand gesetzt werden. Schlägt der Versand fehl (z. B. ungültige E-Mail-Adresse), MUST der Fehler geloggt werden, ohne dass der Aufruf abbricht.

#### Scenario: Versand schlägt fehl
- **WHEN** der E-Mail-Versand an den nächsten Eintrag fehlschlägt
- **THEN** bleibt `notified_at` leer
- **AND** der Fehler wird geloggt und der Aufruf endet ohne Exception

### Requirement: Auslöser der Benachrichtigung
Die Benachrichtigung SHALL intern über `WaitlistService` ausgelöst werden, ohne eigenen API-Endpunkt. `notify_next()` MUST bei der Stornierung einer Registrierung und beim Ablauf der 48-Stunden-Frist eines vorherigen Eintrags (`expire_stale_entries()`) aufgerufen werden.

#### Scenario: Stornierung
- **WHEN** eine Registrierung storniert wird und dadurch ein Platz frei wird
- **THEN** wird `notify_next()` aufgerufen

#### Scenario: Frist abgelaufen
- **WHEN** `expire_stale_entries()` einen Eintrag mit abgelaufener 48-Stunden-Frist verfallen lässt
- **THEN** wird `notify_next()` für den nächsten Eintrag aufgerufen
