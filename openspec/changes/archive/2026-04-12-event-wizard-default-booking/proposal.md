## Why

Beim Erstellen eines neuen Events muss der Nutzer manuell einen Buchungstyp anlegen, obwohl fast jedes Event einen Standard-Buchungstyp mit Tagespreis benötigt. Das kostet unnötig Klicks und Zeit. Ein vorausgefüllter Standard-Buchungstyp (z.B. "Teilnahme", 15€/Tag) im Wizard Step 5 beschleunigt den häufigsten Flow und reduziert Friction.

## What Changes

- Wizard Step 5 ("Buchung") wird mit einem vorausgefüllten Standard-Buchungstyp initialisiert:
  - Name: "Teilnahme"
  - Preis: 15.00€
  - Beschreibung: "Standardbeitrag pro Tag"
  - Max Teilnehmer: 0 (unbegrenzt)
- Der Preis wird dynamisch auf Basis der Event-Dauer berechnet: `15€ × Anzahl Tage` (basierend auf `start_date` und `end_date` aus Step 3)
- Der Nutzer kann den vorausgefüllten Buchungstyp bearbeiten oder entfernen
- Wenn kein Start-/Enddatum gesetzt ist, wird der Standardpreis auf 15€ gesetzt

## Capabilities

### New Capabilities

_Keine — nutzt bestehende Buchungstyp-Infrastruktur._

### Modified Capabilities

- `event-smart-defaults`: Der Wizard füllt jetzt automatisch einen Standard-Buchungstyp vor, basierend auf der Event-Dauer.

## Impact

- **Frontend**: `eventWizardStore.ts` — Default-Buchungstyp in `defaultData.booking_options` oder dynamisch beim Navigieren zu Step 5. `StepBookingOptions.tsx` — sicherstellen, dass vorausgefüllte Optionen editierbar sind.
- **Keine Backend-Änderungen**, keine Schema-Änderungen, keine Migrationen. Die Buchungsoption wird über den bestehenden Payload-Mechanismus erstellt.
