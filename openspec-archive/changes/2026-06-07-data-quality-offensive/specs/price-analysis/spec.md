# price-analysis Specification

## Purpose
Defines statistical price anomaly detection for ingredients and the batch AI price re-evaluation workflow.

## ADDED Requirements

### Requirement: Preisausreißer-Erkennung
Das System SHALL Zutaten mit auffälligen `price_per_kg`-Werten identifizieren und in einer Liste darstellen.

#### Scenario: Statistische Ausreißer pro RetailSection
- **WHEN** `GET /api/admin/data-quality/ingredients/price-analysis/` aufgerufen wird
- **THEN** SHALL das System pro RetailSection Mittelwert und Standardabweichung von `price_per_kg` berechnen
- **THEN** SHALL Zutaten mit |Z-Score| > 2.5 als Ausreißer markiert werden
- **THEN** SHALL die Antwort enthalten: `{items: [{id, name, price_per_kg, retail_section, z_score, anomaly_type: "high"|"low"|"missing"}]}`
- **THEN** SHALL die Liste nach |Z-Score| absteigend sortiert sein

#### Scenario: Fehlende Preise
- **WHEN** eine Zutat `price_per_kg = NULL` hat
- **THEN** SHALL sie mit `anomaly_type: "missing"` in der Liste erscheinen
- **THEN** SHALL sie vor den Ausreißern (niedrig/hoch) einsortiert werden

#### Scenario: RetailSection mit zu wenig Zutaten
- **WHEN** eine RetailSection weniger als 5 Zutaten mit Preis hat
- **THEN** SHALL der Z-Score nicht berechnet werden (zu kleine Stichprobe)
- **THEN** SHALL stattdessen globaler Mittelwert/StdDev verwendet werden

#### Scenario: Filter nach Anomalie-Typ
- **WHEN** `GET /api/admin/data-quality/ingredients/price-analysis/?anomaly_type=missing` aufgerufen wird
- **THEN** SHALL nur Zutaten ohne Preis zurückgegeben werden

### Requirement: Batch AI-Preisbewertung
Das System SHALL eine Batch-Bewertung von Zutatenpreisen via Gemini AI ermöglichen.

#### Scenario: AI-Bewertung anfordern
- **WHEN** Staff-User `POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` mit `{ingredient_ids: [1, 2, 3]}` aufruft
- **THEN** SHALL das System für jede Zutat einen Gemini-Call mit Name, RetailSection, Nährwerten und bestehenden Preisinformationen durchführen
- **THEN** SHALL die Antwort eine Liste mit `{ingredient_id, current_price, suggested_price, reasoning}` zurückgeben
- **THEN** SHALL die Antwort einen Batch-Token enthalten, der für das spätere Anwenden benötigt wird

#### Scenario: AI-Bewertung mit Rate-Limit
- **WHEN** das Gemini Rate-Limit erreicht ist
- **THEN** SHALL die Anfrage mit 429 und einer Retry-After-Info fehlschlagen
- **THEN** SHALL die Fehlermeldung die verbleibende Wartezeit enthalten

#### Scenario: Leere Auswahl
- **WHEN** `ingredient_ids` leer ist
- **THEN** SHALL ein 400-Fehler zurückgegeben werden

### Requirement: AI-Preisvorschläge anwenden
Das System SHALL das Anwenden der KI-Preisvorschläge ermöglichen.

#### Scenario: Einzelne Vorschläge anwenden
- **WHEN** Staff-User `PATCH /api/admin/data-quality/ingredients/price-analysis/apply/` mit `{items: [{ingredient_id: 1, price_per_kg: "3.49"}]}` aufruft
- **THEN** SHALL `price_per_kg` der angegebenen Zutat auf den neuen Wert gesetzt werden
- **THEN** SHALL `updated_by` auf den ausführenden User gesetzt werden
- **THEN** SHALL die Antwort die aktualisierten Zutaten-IDs enthalten

#### Scenario: Ungültiger Preis
- **WHEN** ein `price_per_kg` <= 0 oder > 1000 gesendet wird
- **THEN** SHALL ein 422-Validierungsfehler zurückgegeben werden

#### Scenario: Nur Staff darf anwenden
- **WHEN** ein nicht-Staff-User den Apply-Endpoint aufruft
- **THEN** SHALL ein 403-Fehler zurückgegeben werden

### Requirement: Preisanalyse UI mit Batch-Auswahl
Die Preisanalyse-UI SHALL eine Checkbox-basierte Auswahl und einen "Mit KI bewerten" Button bieten.

#### Scenario: Zutaten auswählen
- **WHEN** Staff-User die Preisanalyse-Seite aufruft
- **THEN** SHALL jede Zutat eine Checkbox haben
- **THEN** SHALL ein "Alle auswählen" / "Auswahl aufheben" Toggle existieren
- **THEN** SHALL ein "Mit KI bewerten (X)" Button die Anzahl ausgewählter Zutaten anzeigen

#### Scenario: KI-Bewertung durchführen
- **WHEN** Staff-User auf "Mit KI bewerten" klickt
- **THEN** SHALL ein Ladeindikator erscheinen
- **THEN** SHALL nach Abschluss eine Vergleichstabelle mit Spalten "Aktuell", "KI-Vorschlag", "Begründung" erscheinen

#### Scenario: Vorschläge übernehmen
- **WHEN** die Vergleichstabelle angezeigt wird
- **THEN** SHALL jede Zeile einen "Übernehmen"-Button haben
- **THEN** SHALL ein "Alle übernehmen"-Button alle Vorschläge auf einmal anwenden
- **THEN** SHALL ein "Verwerfen"-Button die Tabelle schließen ohne Änderungen
