# Media Storage (Local Dev)

## Requirement

Lokal gespeicherte Medien-Dateien dürfen den Django StatReloader nicht triggern.

## Lösung

`MEDIA_ROOT` zeigt auf einen Pfad außerhalb des Projektverzeichnisses.
