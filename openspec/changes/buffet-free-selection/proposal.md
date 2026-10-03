## Why

Der Buffet-Builder kann bei Mahlzeitentypen ohne passende Vorlage in einem endlosen Ladezustand hängen, und seine rollengebundene Auswahl verhindert die Nutzung sichtbarer, nicht getaggter Zutaten und Rezepte. Eine verlässliche Vollsuche, zusätzliche Buffet-Rollen und passende Vorlagen machen Buffets über alle Mahlzeitentypen hinweg nutzbar, ohne Sichtbarkeits- und Berechtigungsregeln aufzuweichen.

## What Changes

- Beheben sichtbarer Lade-, Fehler- und Leerzustände sowie Bereitstellen eines Fallbacks für Mahlzeitentypen ohne passende Vorlage.
- Rollen-Tags werden im Builder zu Favoriten statt einer Auswahlpflicht; sichtbare Zutaten und Rezepte ohne Rollen-Tag können einer gewählten Rolle zugeordnet und gespeichert werden.
- Neuer Suchendpunkt mit Rollen-Favoriten-Ranking, relevanten Zutaten und Rezepten, Namens-/Alias-Suche und erweiterbarer Suche für Backzutaten und Gewürze.
- Gespeicherte Buffets liefern genügend Item-Daten, um freie Auswahlen nach erneutem Öffnen zu beschriften.
- Zehn zusätzliche Buffet-Rollen, ein erweitertes Vorlagenangebot sowie „Freies Buffet“ und „Getränkebuffet“ für alle Mahlzeitentypen einschließlich Getränke.
- Food-Frontend erhält eine stets sichtbare Suche pro Rolle, eigene-Auswahl-Markierung, Fehler-/Leerzustände und passende Vorlagenauswahl.
- Deklarative, idempotente Datenanreicherung mit Dry-Run, Namensprüfung, Merge-Service und Bericht; Produktionsänderungen werden ausschließlich nach separater Freigabe angewendet.
- Neue Zutaten und Rezepte können in einer Staff-Vorschlagsmaske der Datenqualität durch KI vorgeschlagen oder manuell erfasst, bearbeitet und geprüft werden; vor Freigabe wird ein schreibfreier Mapping-Test angezeigt.
- Plausible Dubletten- und Zuordnungskandidaten werden vollständig zur Prüfung angeboten. Bestätigte Mappings werden nicht ohne separaten Dry-Run und ausdrückliche Betriebsfreigabe angewendet.
- Die Vollsuche erhält Kontext für Mahlzeittyp und Filter für Item-Art, Rezepttyp, Nicht-Standalone-Zutaten und Alkohol. Die Alkohol-Ausblendung startet deaktiviert.
- Frühstück bleibt ein eigener, bevorzugter Modus mit seiner bestehenden Frühstücksvorlage und wird nicht durch „Freies Buffet“ ersetzt.

## Capabilities

### New Capabilities
- `buffet-catalog-search`: Sichtbare Zutaten und Rezepte rollenübergreifend finden, ranken und nach Item-Art, Rezepttyp, Nicht-Standalone-Zutaten und Alkohol filtern.
- `buffet-data-quality-proposals`: Staff können KI- und manuelle Vorschläge für Zutaten, Rezepte und Buffet-Zuordnungen pflegen, testen und als Mapping freigeben.

### Modified Capabilities
- `buffet-builder`: Auswahl ohne Rollen-Tag, restaurierbare freie Items, Vollsuche, Fallback-/Fehlerzustände und Unterstützung aller Mahlzeitentypen.
- `buffet-roles`: Zehn neue Rollen; mehrere Rollen je Zutat/Rezept sind zulässig.
- `buffet-templates`: Mehr Vorlagen, universelles Freies Buffet, Getränkebuffet und Getränke-Rolle in jeder Vorlage.
- `buffet-data-cleanup`: Erweiterte deklarative Zuordnungen, Dublettenbereinigung, Kandidatenbericht und sichere Dry-Run-/Freigabegrenzen.
- `data-quality-dashboard`: Staff-only-Einstieg zur Buffet-Vorschlags- und Mapping-Prüfmaske.

## Impact

- **Backend:** `supply`-Katalog/API/Schemas und Rollen-Migration; `planner`-Buffet-Service, State-/Response-Schemas und Template-Seed; Staff-only-Vorschlags-API und persistierte Vorschlagsdaten im Datenqualitätsbereich; bestehende Merge-Services aus `supply` und `recipe`.
- **Frontend:** ausschließlich `frontend-food/`, insbesondere Buffet-Builder, Buffet-API-/Zod-Schemas, `MealSlot`, `MealActionsMenu`, Rollenanzeige sowie die Datenqualitäts-Zutatenansicht mit Vorschlags-/Prüfmaske.
- **Daten:** Rollen- und Template-Seeds/Migrationen sowie ein überprüfbares Mapping für bestehende Zutaten und Rezepte. Neue Katalogeinträge erfordern Status-/Nährwertprüfung.
- **API-Vertrag:** neuer Suchendpunkt `GET /api/supply/buffet-catalog/search/`; Pydantic- und Zod-Schemas müssen synchron bleiben.
- **Betrieb:** keine automatische Prod-Ausführung. Mapping- und Merge-Änderungen werden zunächst als Dry-Run-Plan ausgegeben; Apply auf Prod ausschließlich nach expliziter Freigabe gemäß `docs/prod-runbook.md`.
