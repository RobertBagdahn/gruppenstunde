# Entscheidungs-Journal

Hier liegen alle Entscheidungen, die ein Mensch in Rübert getroffen hat. Die Dateien sind die Wahrheit;
die Datenbank unter `backend/var/` ist abgeleitet und darf jederzeit mit `make nuke && make rebuild`
neu aufgebaut werden. Das Journal bleibt dabei unberührt. Commits macht der Mensch, die App führt kein `git` aus.

## Format

Eine Datei je Entscheidung: `journal/<typ>/<YYYY-MM-DD>T<HHMMSS>-<kurz-id>.yaml`. Der Dateiname ohne
Endung ist die Eintrags-ID. Dateien werden nie geändert oder gelöscht. Eine geänderte Entscheidung ist
ein neuer Eintrag, dessen `supersedes` auf die ID des alten zeigt. Je Subjekt gilt der neueste Eintrag.

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `type` | ja | `case`, `quantity`, `order`, `setting`, `stockout`, `event`, `feedback` (entspricht dem Ordner) |
| `subject` | ja | Worauf sich die Entscheidung bezieht, z. B. `case:<Fall-ID>`, `quantity:<SKU>`, `setting:<Schlüssel>` |
| `choice` | ja | Die Wahl, z. B. `ausschließen`, `verwenden`, `ändern`, `zurücksetzen` |
| `value` | nein | Zahl oder Text, z. B. die geänderte Bestellmenge |
| `reason` | nein | Begründung in Worten |
| `details` | nein | Strukturierte Angaben, z. B. alle Mengen einer freigegebenen Bestellung |
| `author` | ja | Wer entschieden hat |
| `created_at` | ja | Zeitpunkt (ISO 8601, UTC) |
| `supersedes` | nein | ID des Eintrags, den dieser ersetzt |
| `is_sample` | nein | `true`, wenn die Entscheidung Beispieldaten betrifft |

## Beispiel

`journal/case/2026-05-18T090000-3fa85f64.yaml`:

```yaml
type: case
subject: case:bulk_shipping:DGW001:2026-05-14
choice: ausschließen
reason: Sammelbuchung ohne Gegenbuchung, technische Buchung
author: Robert
created_at: '2026-05-18T09:00:00Z'
```

## Verwaiste Einträge

Erzeugt ein Neuaufbau einen Fall oder Artikel nicht mehr, bleibt der Eintrag erhalten. „Daten & Läufe"
listet ihn dann als verwaist, damit ein Mensch entscheiden kann.
