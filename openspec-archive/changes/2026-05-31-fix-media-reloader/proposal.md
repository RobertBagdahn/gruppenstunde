## Why

Wenn das Backend ein AI-generiertes Bild in den lokalen `/media/`-Ordner schreibt, erkennt der Django StatReloader die Dateiänderung und startet den Server neu. Das killt den laufenden HTTP-Request und der Vite-Proxy meldet "socket hang up". Der gleiche Effekt tritt bei allen Bild-Uploads auf. Das Problem lässt sich lösen, indem der `/media/`-Ordner aus dem Reloader ausgeschlossen wird.

## What Changes

- Django `runserver`-Konfiguration anpassen: `/media/`-Ordner vom StatReloader-Watching ausschließen
- Alternativ/zusätzlich: Media-Ordner außerhalb des Projektverzeichnisses legen, damit der Reloader ihn nie sieht

## Capabilities

### New Capabilities

_Keine neuen Capabilities — rein infrastruktureller Fix._

### Modified Capabilities

_Keine Spec-Änderungen._

## Impact

- **Backend**: `inspi/settings/local.py` — `MEDIA_ROOT` ggf. anpassen
- **Backend**: `manage.py` oder Custom-RunserverCommand — Reloader-Exclude konfigurieren
- **Keine Schema-Änderungen** (weder Pydantic noch Zod)
- **Keine Migrations**
- **Betroffene Apps**: Keine direkt — betrifft nur die Dev-Server-Konfiguration
