## Context

Der bestehende Portions-Zauberstab in `backend/supply/services/portion_magic_wand.py` ruft Gemini auf, validiert die Antwort gegen exakte Datenbanknamen und startet bei weniger als vier brauchbaren Vorschlägen einen Reparaturaufruf. Die Vorschau wird über `POST /api/ingredients/{slug}/portions/magic-wand/preview/` geladen und über denselben Preview-Token atomar angewendet.

Die Datenbasis enthält zugleich historische und fachlich uneinheitliche Portionen: stückartige Namen wurden teilweise mit der Maßeinheit Gramm gespeichert. Der bestehende `piece-portion-mapping`-Vertrag nutzt jedoch bewusst `weight_g` als physische Berechnungsbasis. Die Lösung muss deshalb die sichtbare Rezeptsemantik und die technische Grammbasis zusammenführen, ohne gewichtete produktive Daten automatisch zu überschreiben.

## Goals / Non-Goals

**Goals:**

- Typische, zutatenspezifische Portionen zuverlässig erzeugen und als einzelne Vorschläge präsentieren.
- Einheitennamen aus KI-Antworten kanonisch und deterministisch auf vorhandene `MeasuringUnit`-Datensätze abbilden.
- Positive physische Gewichte erzwingen, fehlende Gewichte aber als manuell lösbare Vorschläge sichtbar lassen.
- `Stück`, `Packung` und ähnliche Formen semantisch korrekt behandeln, während Berechnungen weiterhin `weight_g` verwenden.
- Vorschau, Apply, Pydantic-/Zod-Schemas und Tests synchron halten.
- Eine sichere Datenmigration für betroffene bestehende Datensätze bereitstellen.

**Non-Goals:**

- Kein neuer KI-Anbieter, kein Streaming und keine dauerhafte KI-Generierung im Hintergrund.
- Keine automatische Korrektur bereits gewichteter Portionen ohne explizite Benutzeraktion.
- Keine vollständige Neugestaltung des Ingredient-Detail-Layouts.
- Keine Änderung der Rezeptberechnungsformeln außerhalb der Portionsauflösung.

## Decisions

### 0. Bestätigte Produktentscheidungen

- Der Portions-Zauberstab bleibt eine einzelne Aktion und einen einzelnen Apply-Vorgang, zeigt aber zwei klar getrennte Bereiche: `Portionen` und `Packungen`.
- Ein Apply ist vollständig atomar. Ungültige IDs, veraltete Quellen, Namenskollisionen oder fehlende positive Gewichte rollen die gesamte Transaktion zurück.
- Stück-/Packungsgewichte werden mit zutatenspezifischen Regeln und KI-Kontext plausibilisiert. Eine Warnung blockiert nicht automatisch, erfordert aber eine sichtbare bewusste Auswahl beziehungsweise Bestätigung.
- Bestehende unplausible Stückportionen bleiben zunächst unverändert. Der Dialog zeigt aktuelles Gewicht, Begründung und einen separaten Ersatzvorschlag.
- Packungsnamen bleiben beschreibend und ohne Zahlen; Stückzahl und Gesamtgewicht stehen in strukturierten Feldern.
- Die Datenmigration benennt nur sicher erkennbare generische `Portion`-Einträge um und erhält IDs sowie Rezeptreferenzen.
- Backend und Food-Frontend werden nur gemeinsam aus demselben Release-Commit ausgeliefert.

### 1. Kanonische Einheitenauflösung vor fachlicher Validierung

Die Backend-Service-Schicht erhält eine kleine, deterministische Auflösung für bekannte Schreibweisen wie `g`, `gramm`, `Stk`, `Stück` und `Packung`. Aufgelöst werden darf nur auf tatsächlich vorhandene Einheiten; unbekannte Einheiten bleiben ungültig und werden mit einem verständlichen Hinweis protokolliert beziehungsweise als nicht anwendbarer Vorschlag zurückgegeben.

Alternative: Exakte Namen wie bisher akzeptieren. Das ist einfacher, führt aber dazu, dass valide KI-Antworten wegen Groß-/Kleinschreibung, Abkürzungen oder Modellvarianten verschwinden.

### 2. Keine harte Mindestanzahl als Annahme für Erfolg

Die Vorschau behält einen Reparaturversuch für unbrauchbare Antworten, verwirft aber brauchbare einzelne Ergebnisse nicht nur deshalb, weil Gemini weniger als vier Vorschläge liefert. Die fachliche Mindestanforderung ist mindestens ein vollständiger, anwendbarer Vorschlag; die UI zeigt zusätzlich an, wenn die KI weniger Varianten als erwartet liefern konnte.

Alternative: Weiterhin immer mindestens vier Ergebnisse erzwingen. Das erzeugt unnötige Retry-Kosten und erhöht das Risiko künstlicher oder doppelter Portionen.

### 3. Stückartige Portionen bleiben named portions mit `weight_g`

Die Berechnung verwendet weiterhin die bestätigte `weight_g`-Basis aus `piece-portion-mapping`. Ein Vorschlag wie `1 Stück Apfel = 150 g` wird als benannte Portion mit Menge, Einheit und physischem Gewicht gespeichert. Die Einheit `Stück` darf für neue Portionen nur verwendet werden, wenn sie als echte `PIECE`-Maßeinheit vorhanden und für die bestehende Berechnungslogik verträglich ist; andernfalls wird die etablierte technische Gramm-Basis mit einer stückartigen Portionsbezeichnung verwendet.

Alternative: Jede Stückportion ausschließlich auf eine neue `Stück`-Einheit umstellen. Das wäre semantisch attraktiv, würde aber bestehende RecipeItem-, Konversions- und Einkaufslistenpfade unnötig weit verändern.

### 4. Preview-Token schützt weiterhin vor veralteten Änderungen

Der Kontext-Hash umfasst die aktiven Portionen einschließlich Maßeinheit und Gewicht. Apply lehnt einen veralteten Token ab und sperrt die betroffenen aktiven Portionen innerhalb der Transaktion. Gewichtete Quellen bleiben unverändert; nur ungewichtete Quellen dürfen ersetzt oder explizit gelöscht werden.

### 5. Vertragserweiterung statt roher KI-Antwort

Das Backend-Schema `PortionMagicOperationOut` und das Frontend-Schema `PortionMagicOperationSchema` werden um den kanonischen Einheitenstatus beziehungsweise eine anwendbare Validierungsinformation erweitert, falls dies für die UI nötig ist. Die API bleibt auf denselben Preview-/Apply-Endpunkten; die Antwort enthält weiterhin Operationen und Zusammenfassung. Die Frontend-UI markiert unvollständige Vorschläge klar und blockiert Apply nur für ausgewählte ungültige Operationen.

### 6. Zentraler Retry für strukturierte Food-/Rezept-Extraktionen

`gemini_call` validiert bei vorhandenem `response_schema` zentral auf nichtleeren Inhalt und Pydantic-Kompatibilität. Bei einem Fehler wird genau ein zweiter Aufruf mit einem Korrekturprompt ausgeführt. Beide Versuche gehören zu einer Interaktion und erhalten einen Versuchszähler beziehungsweise Fehlergrund im Audit. Fachliche Mindestregeln wie „mindestens ein Rezeptschritt“ oder „mindestens eine Zutat“ werden je Schema definiert.

Technische freie Text-, Bild- und Embedding-Aufrufe bleiben außerhalb dieses strukturierten Extraktionsvertrags. Der technische Schutz darf zentral wiederverwendbar sein, aber fachliche Regeln werden nur für Food- und Rezeptdaten verpflichtend.

## Risks / Trade-offs

- **Historische Portionen können nicht eindeutig klassifiziert werden** → Migration nur für sicher erkennbare stückartige Einheiten/Namen; unsichere Fälle bleiben erhalten und werden als Prüfbedarf dokumentiert.
- **KI liefert weiterhin fachlich falsche Gewichte** → positives Gewicht ist nur eine technische Mindestvalidierung; rationale, Konfidenz und manuelle Bearbeitung bleiben sichtbar. Keine automatische Überschreibung gewichteter Portionen.
- **Synonymauflösung kann falsche Einheiten wählen** → Auflösung auf eine begrenzte Whitelist mit deterministischer Priorität und Tests für Konflikte.
- **Zusätzliche Preview-Aufrufe erhöhen Kosten und Latenz** → höchstens ein Reparaturversuch; kein Retry, wenn bereits mindestens ein vollständiger Vorschlag vorhanden ist.
- **Zod- und Pydantic-Verträge können auseinanderlaufen** → Contract-Tests mit identischen Preview- und Apply-Beispielen auf Backend und Food-Frontend.
- **Backend und Food-Frontend werden in falscher Reihenfolge deployt** → gemeinsamer Release-Check und Deployment aus demselben Commit; neue Enum-Werte dürfen nicht einzeln live gehen.
- **Retry akzeptiert syntaktisch valide, aber fachlich leere Daten** → schemaabhängige Mindestlängen und Pflichtfeldvalidierung nach Pydantic.

## Migration Plan

1. Bestehende Daten und Referenz-Units vor der Änderung inventarisieren; insbesondere Portionen mit Namen wie `Stück`, `Packung`, `Scheibe` und einer Gramm-Einheit erfassen.
2. Eine neue Django-Datenmigration korrigiert nur sicher identifizierbare Referenzdaten und setzt keine positiven Gewichte zurück. Rezept- und Einkaufslistenreferenzen bleiben über dieselben Portion-IDs erhalten.
3. Backend-Service, API-Schema und Tests ausrollen; danach Frontend-Zod-Schema und Dialog aktualisieren.
4. Nach Migration `uv run python manage.py makemigrations --check` und die relevanten Supply-/Food-Tests ausführen.
5. Rollback: Anwendungscode kann auf die vorherige Preview-/Apply-Version zurückgesetzt werden. Die Datenmigration ist wegen möglicher FK- und Soft-Delete-Zustände nicht blind rückwärts zu rollen; vor Ausführung ist ein Datenbank-Backup erforderlich.
6. Release-Prüfung: Backend und `frontend-food` werden aus demselben Commit gebaut. Vor dem Deploy werden Backend-Schema, Food-Zod-Schema, fokussierte Tests, `makemigrations --check` und die erforderlichen Migrationen geprüft. Danach wird zuerst die Migration sicher ausgeführt und anschließend Backend und Food-Frontend gemeinsam auf Traffic geschaltet.

## Open Questions

- Soll die Datenbank dauerhaft eine echte `Stück`-MeasuringUnit als `PIECE` führen, oder soll die bestehende technische Grammbasis für alle named piece portions verbindlich bleiben?
- Soll die UI die KI-Qualität als Konfidenz/Rationale anzeigen oder zusätzlich eine fachliche Warnung bei ungewöhnlichen Gewichten erhalten?
