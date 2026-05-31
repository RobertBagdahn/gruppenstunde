## Context

Lokal nutzt Django `FileSystemStorage` und schreibt Medien nach `backend/media/`. Der StatReloader überwacht das gesamte Projektverzeichnis und startet bei jeder Dateiänderung neu — auch wenn ein Bild in `/media/` geschrieben wird. Das killt laufende Requests.

## Goals / Non-Goals

**Goals:**
- AI-Bildgenerierung und Uploads funktionieren lokal ohne Server-Restart
- Minimale Änderung, kein GCS lokal nötig

**Non-Goals:**
- GCS-Integration für lokale Entwicklung
- Änderung am Production-Setup

## Decisions

**1. MEDIA_ROOT außerhalb des Projektverzeichnisses setzen**

In `local.py` den `MEDIA_ROOT` auf einen Pfad außerhalb des vom Reloader überwachten Verzeichnisses legen:

```python
MEDIA_ROOT = "/tmp/inspi-media/"
```

Das ist die einfachste Lösung: Der Reloader sieht die Dateiänderungen nicht, weil `/tmp/` nicht im Projekt liegt. Django `FileSystemStorage` funktioniert weiterhin identisch, nur der Pfad ändert sich.

**Alternative verworfen**: Custom `runserver` Command mit `--exclude-pattern` — zu komplex für das Problem.

**2. MEDIA_URL bleibt `/media/`**

Django served die Dateien weiterhin unter `/media/` via `django.conf.urls.static` im Debug-Modus. Die URL-Auflösung ändert sich nicht.

## Risks / Trade-offs

- `/tmp/` wird bei Reboot gelöscht → lokal generierte Bilder gehen verloren. Akzeptabel für Dev.
- Alternativ ein fester Pfad wie `~/.inspi/media/` falls Persistenz gewünscht ist.
