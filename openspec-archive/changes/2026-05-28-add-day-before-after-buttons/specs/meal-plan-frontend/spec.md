## MODIFIED Requirements

### UI: Quick-Add Day Buttons

- Der Tagesplan zeigt einen "Tag davor"-Button oberhalb der Tagesliste
- Der Tagesplan zeigt einen "Tag danach"-Button unterhalb der Tagesliste
- Beide Buttons sind nur sichtbar wenn mindestens ein Tag existiert
- "Tag davor" erstellt einen Tag mit Datum = erster sichtbarer Tag minus 1
- "Tag danach" erstellt einen Tag mit Datum = letzter sichtbarer Tag plus 1
- Bei Fehler (z.B. Tag existiert bereits) wird ein Toast angezeigt
- Nach erfolgreichem Hinzufügen wird die Tagesliste aktualisiert
