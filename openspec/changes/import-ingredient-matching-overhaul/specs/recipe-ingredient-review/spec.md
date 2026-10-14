## ADDED Requirements

### Requirement: Zutat per Knopfdruck anlegen
Jede Review-Zeile ohne bestätigte Zutat SHALL eine Aktion „Zutat anlegen“ anbieten, auch wenn Kandidaten existieren. Die Aktion MUST über `POST /api/recipes/ingredient-review/new-ingredient-draft/` einen Entwurf erzeugen: normalisierter Name ohne Menge, Einheit und Zusätze; Nährwerte, Portionen und Aliase per Zauberstab-Anreicherung; Menge umgerechnet auf die Entwurfsportion. Alle Felder MUST im bestehenden Editor überschreibbar sein. Nichts MUST vor dem finalen Speichern des Rezepts persistiert werden. Nur angemeldete Nutzer DÜRFEN den Endpunkt nutzen (sonst 401).

#### Scenario: Entwurf auf Abruf
- **GIVEN** ein angemeldeter Nutzer und die offene Zeile `Frischer Ingwer: ca. 60–80 g` mit Kandidaten
- **WHEN** er „Zutat anlegen“ wählt
- **THEN** öffnet der Editor einen Entwurf mit Name `Ingwer`, Nährwerten, Portion und umgerechneter Menge für 70 g

#### Scenario: Nicht angemeldet
- **GIVEN** ein nicht angemeldeter Besucher
- **WHEN** er den Entwurfs-Endpunkt aufruft
- **THEN** antwortet die API mit 401

#### Scenario: Gemini nicht verfügbar
- **WHEN** die Anreicherung fehlschlägt
- **THEN** öffnet der Editor einen Entwurf nur mit Name und Menge und einem Hinweis, die Werte selbst einzutragen

### Requirement: Dubletten-Check vor dem Anlegen
Vor dem Bestätigen eines Entwurfs SHALL das System den Entwurfsnamen gegen den Katalog matchen. Existiert ein Treffer oder ein Kandidat ≥ 0,7, MUST der Dialog „Vorhandene Zutat verwenden?“ mit diesen Zutaten anbieten; der Nutzer MAY trotzdem neu anlegen.

#### Scenario: Ähnliche Zutat existiert
- **GIVEN** der Entwurfsname lautet `Ingwer` und `Ingwer` existiert
- **WHEN** der Nutzer den Entwurf bestätigen will
- **THEN** wird `Ingwer` zur Auswahl angeboten

### Requirement: Geschätzte Mengen sind sichtbar
Eine Review-Zeile mit vorbelegter Standardmenge SHALL `quantity_estimated=true` tragen und in der Oberfläche „geschätzt“ anzeigen. Eine geteilte Kombizeile MUST die Originalzeile in `source_line` tragen.

#### Scenario: Prise geschätzt
- **WHEN** `Salz und Pfeffer` ohne Menge geteilt wird
- **THEN** zeigen beide Zeilen 1 Prise mit Kennzeichnung „geschätzt“ und die Originalzeile
