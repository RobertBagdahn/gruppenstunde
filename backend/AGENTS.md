# Backend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Diese Datei beschreibt nur die Backend-Implementierung.

## Implementierung

- Django 5.x mit Django Ninja und Pydantic-Schemas verwenden.
- Python-Befehle immer mit `uv run` ausführen.
- Große Apps verwenden Packages für `models`, `api` und `schemas`; Exporte über `__init__.py` erhalten.
- Geschäftslogik in Services, nicht direkt in API-Endpunkten.
- API-Endpunkte verwenden typisierte Pydantic-Responses, keine rohen Dictionaries.
- Fehler mit `ninja.errors.HttpError` und passenden HTTP-Statuscodes behandeln.
- Session-Auth prüfen; Berechtigungen serverseitig auswerten.
- Resource-Schemas mit editierbaren Inhalten liefern `can_edit` und `can_delete`; Permissions nie im Frontend berechnen.
- Rezeptbilder in API-Schemas immer als `image_url: str | None` ausgeben.
- Statische und spezifische Django-Ninja-Routen vor parametrisierten Catch-all-Routen registrieren.
- Bestehende Migrationen nie ändern; für Model-Änderungen neue Migrationen erstellen.

## API und Daten

- Listen-Endpunkte verwenden standardmäßig `page=1`, `page_size=20` und `{ items, total, page, page_size, total_pages }`.
- Pydantic-Schema nach jeder API-Änderung aktualisieren und das Frontend-Zod-Schema prüfen.
- Freitext als Markdown behandeln, kein HTML erzeugen.
- Keine Klar-IPs speichern.

## Tests und Prüfungen

- Neue oder geänderte Endpunkte mit Happy-Path und relevanten Fehlerfällen testen.
- Geschäftslogik, Signals und Management Commands gezielt testen.
- Vor Abschluss ausführen:

```bash
uv run python manage.py makemigrations --check
uv run pytest
```

- Keine `print`-Statements in Production-Code.
