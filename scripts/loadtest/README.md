# Lastprobe Gruppeneinkauf

`shopping_group.py` simuliert mehrere Handys auf einer geteilten Einkaufsliste (Spec: `food-runtime-capacity`, „Lastprobe vor Kapazitätsänderungen“). Jedes Gerät tritt über den Einladungslink bei, fragt den Pulse ab und lädt bei geänderter Marke das kompakte Board (Einkaufsmodus, Standard `--mode board`) oder die ganze Liste (`--mode detail`). Gerät 1 hakt in festem Takt Einträge ab und stellt sie am Ende wieder her.

Standard: 6 Geräte, Pulse alle 5 s, 1 Abhaken je 10 s, 10 Minuten. Bestanden bei 0 × HTTP 429, p95 von `sync_board` unter 1 s und p95 von `detail_full` unter 3 s (eine Schwelle gilt nur, wenn der Endpunkt benutzt wurde). Exit-Code 0 bzw. 1.

## Lokaler, produktionsnaher Stack

Zugangsdaten sind die Entwicklungswerte aus `.env.example`; eine Wegwerf-Datenbank hält die Entwicklungsdaten sauber.

```bash
export PGPASSWORD=inspi DB_NAME=inspi_loadtest DJANGO_SECRET_KEY=loadtest
psql -h localhost -U inspi -d postgres -c "create database inspi_loadtest"
psql -h localhost -U inspi -d inspi_loadtest -c "create extension if not exists vector; create extension if not exists pg_trgm; create extension if not exists unaccent"
cd backend
uv run python manage.py migrate
uv run python manage.py seed_loadtest_shopping_list --items 50 --sources-per-item 3   # prints list_id and invite_token
uv run gunicorn inspi.wsgi:application --bind 127.0.0.1:8123 --workers 2 --threads 1 --timeout 300
```

In einem zweiten Terminal:

```bash
cd backend
uv run python ../scripts/loadtest/shopping_group.py --base-url http://127.0.0.1:8123 --invite-token <invite_token>
```

Danach Server beenden und `drop database inspi_loadtest` ausführen.

Zwei Gunicorn-Worker entsprechen den zwei Request-Slots, die am 16.10.2026 produktiv waren (2 Instanzen × Concurrency 1). Für andere Limits `--workers` und `--threads` an `deploy.yml` anpassen.

## Grenzen

- **Kein Cloud-Run-Verhalten:** Lokal wartet Gunicorn, statt abzuweisen; HTTP 429 entsteht nur auf Cloud Run. Lokal zeigt die Probe die Wartezeit (p95), nicht die Abweisungen.
- **Fixture nicht repräsentativ:** Die Fixture hat je Eintrag 1 Packung und 3 Quellen und ergibt ca. 1 KB je Eintrag. Die Liste vom 16.10. war 527 KB groß und brauchte 5–9 s; lokal dauert der Vollabruf 0,2 s. Absolute Werte sind nicht vergleichbar, nur Vorher/Nachher auf demselben Stack. Mit `--sources-per-item` lässt sich die Liste schwerer machen.
- **Produktion** nur außerhalb der Nutzungszeit, nur nach ausdrücklichem OK und mit `--confirm-production`; die Probe ändert Häkchen der Liste (und stellt sie wieder her).

## Tests der Auswertung

```bash
cd backend
uv run pytest -p no:django -c /dev/null --rootdir ../scripts/loadtest ../scripts/loadtest
```
