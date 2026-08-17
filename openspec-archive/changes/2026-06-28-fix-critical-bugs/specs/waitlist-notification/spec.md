# Waitlist Notification

## Description

Automatische E-Mail-Benachrichtigung an den nächsten Wartelisten-Eintrag, wenn ein Platz frei wird.

## Requirements

- `WaitlistService.notify_next()` sendet eine E-Mail an die E-Mail-Adresse des `WaitlistEntry.user`
- E-Mail enthält: Event-Name, Buchungsoption, Frist (48h), Link zur Event-Seite
- E-Mail wird auf Deutsch versendet
- Betreff: "Platz frei bei {event_name}"
- `notified_at` wird erst nach erfolgreichem E-Mail-Versand gesetzt
- Bei Fehler (z.B. ungültige E-Mail): Loggen, nicht crashen

## API

- Kein neuer API-Endpunkt — die Logik wird intern in `WaitlistService` aufgerufen
- Trigger: `notify_next()` wird aufgerufen bei:
  - Stornierung einer Registrierung (neuer Platz frei)
  - Ablauf der 48h-Frist eines vorherigen Eintrags (`expire_stale_entries()`)
