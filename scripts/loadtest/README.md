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

## Ergebnisse vom 17.10.2026 (lokal, 2 Gunicorn-Worker, 6 Geräte, 90 s)

Die schwere Fixture (`--items 100 --sources-per-item 15`) bildet die Liste vom 16.10. gut nach: Vollabruf 468 KB (Prod: 527 KB), Median 4,75 s (Prod: 4,8 s nach `13eef0ca`). Das Board ist nur 30 KB groß.

| Fixture | Modus | Endpunkt | Requests | p50 | p95 | max | 429 | Ergebnis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| leicht (50 × 3) | `board` | `sync_board` | 54 | 0,06 s | 0,17 s | 0,18 s | 0 | bestanden |
| leicht (50 × 3) | `detail` | `detail_full` | 54 | 0,54 s | 1,20 s | 1,53 s | 0 | bestanden |
| schwer (100 × 15) | `board` | `sync_board` | 54 | 0,07 s | 0,15 s | 0,16 s | 0 | bestanden |
| schwer (100 × 15) | `detail` | `detail_full` | 40 | 4,75 s | 9,40 s | 13,79 s | 0 | **fehlgeschlagen** (p95 über 3 s) |

Im Detail-Modus stieg auch das Abhaken auf p50 3,61 s und der Pulse auf p95 4,92 s, weil die zwei Worker mit den Vollabrufen belegt waren. Im Board-Modus blieben beide bei 0,19 s bzw. 0,10 s. Das Board entlastet also genau den Engpass vom 16.10.; die 429 selbst entstehen nur auf Cloud Run (siehe Grenzen).

## Grenzen

- **Kein Cloud-Run-Verhalten:** Lokal wartet Gunicorn, statt abzuweisen; HTTP 429 entsteht nur auf Cloud Run. Lokal zeigt die Probe die Wartezeit (p95), nicht die Abweisungen.
- **Fixture:** Die leichte Standard-Fixture (1 Packung, 3 Quellen je Eintrag, ca. 1 KB je Eintrag) ist viel kleiner als die Liste vom 16.10. (527 KB). Für realistische Last `--items 100 --sources-per-item 15` verwenden. Absolute Werte bleiben lokal, vergleichbar ist Vorher/Nachher auf demselben Stack.
- **Produktion** nur außerhalb der Nutzungszeit, nur nach ausdrücklichem OK und mit `--confirm-production`; die Probe ändert Häkchen der Liste (und stellt sie wieder her).

## Tests der Auswertung

```bash
cd backend
uv run pytest -p no:django -c /dev/null --rootdir ../scripts/loadtest ../scripts/loadtest
```
