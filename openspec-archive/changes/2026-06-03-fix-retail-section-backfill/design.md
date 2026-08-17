## Context

Das Keyword-Mapping (`supply/services/retail_section_mapping.py`) und die Funktion `get_retail_section(name, description)` existieren bereits und funktionieren. Das Problem ist zweigeteilt:

1. **Bestandsdaten**: Bei vielen Zutaten ist `retail_section` `null`, weil das Mapping nur beim Anlegen/Import greift, nicht rückwirkend.
2. **Lücken im Mapping**: Einzelne spezifische Keywords fehlen oder sind nur generisch abgedeckt (z.B. "Pflanzenöl" nur über "ÖL").

## Goals / Non-Goals

**Goals**
- Bestehende Zutaten ohne Abteilung nachträglich korrekt zuordnen.
- Keyword-Stammdaten so ergänzen, dass die genannten Beispiele zuverlässig matchen.
- Vorgehen idempotent und gefahrlos wiederholbar machen.

**Non-Goals**
- Keine Änderung der Einkaufslisten-Gruppierungslogik selbst.
- Kein neues UI.
- Kein Entfernen des frontend-seitigen `'Sonstiges'`-Fallbacks (bleibt Sicherheitsnetz).

## Decisions

- **Command statt Migration**: Datenkorrektur erfolgt über ein Management-Command, nicht über eine Daten-Migration. Begründung: Idempotenz, `--dry-run`, wiederholbar nach weiteren Imports. Kein Schema-Change.
- **Nur leere Felder füllen**: Das Command überschreibt niemals eine bereits gesetzte `retail_section` (Schutz manueller Zuordnungen).
- **Keyword-Ergänzung als Sicherheitsnetz**: Auch wenn das Bestandsdaten-Problem die Hauptursache ist, werden fehlende/zu generische Keywords ergänzt, damit künftige Neuanlagen direkt korrekt zuordnen.
- **Reihenfolge der Auflösung bleibt**: `get_retail_section` versucht weiterhin zuerst die Beschreibung (REWE-Kategorie), dann den Namen.

## Risks / Trade-offs

- **Falsche Treffer durch generische Keywords**: Ein zu breites Keyword (z.B. "ÖL") könnte unpassende Zutaten erfassen. Mitigation: spezifische Keywords (längster Treffer gewinnt, `_match_keywords`).
- **Performance bei vielen Zutaten**: Backfill iteriert über alle Zutaten ohne Abteilung. Mitigation: `bulk_update` in Batches.

## Migration Plan

1. Keyword-Ergänzungen in `retail_section_mapping.py`.
2. Command implementieren mit `--dry-run` und `--batch-size`.
3. Auf Staging mit `--dry-run` laufen lassen, Zuordnungen prüfen.
4. Ohne Dry-Run ausführen.

## Open Questions

- Sollen Zutaten, die nach dem Backfill weiterhin ohne Abteilung sind, in einem Report (Liste) ausgegeben werden, um die Keyword-Tabelle iterativ zu verbessern? (Empfehlung: ja, als Zusammenfassung am Ende des Commands.)
