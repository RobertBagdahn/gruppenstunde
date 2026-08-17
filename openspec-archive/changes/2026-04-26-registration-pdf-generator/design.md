## Context

Pfadfinder-Gruppenführer erstellen pro Jahr dutzende Anmelde-PDFs für Fahrten, Lager und Aktionen. Diese folgen einem festen Schema aber werden jedes Mal manuell in Word/Docs gebaut. Das Projekt hat bereits `reportlab>=4.2` als Dependency und `google-genai` für KI-Features. Es gibt kein bestehendes PDF-Generierungssystem.

Das Script ist standalone (kein Django nötig), lebt in `backend/documents/` und wird mit `uv run python backend/documents/generate.py <yaml>` aufgerufen.

## Goals / Non-Goals

**Goals:**
- Standalone PDF-Generator: YAML rein, PDF raus
- Strukturierte Daten (Datum, Uhrzeit, Ort) statt fertige Strings — Formatierung wird generiert
- Textbaustein-System mit Template-Variablen (`{event.name}`, `{participants.type}`)
- Presets für Packlisten, Formularfelder, Consent-Texte
- Seiten-Optimizer der auf eine konfigurierte Seitenanzahl passt (Whitespace → Font-Size → Ränder)
- Optionale KI-Textgenerierung für thematische/Motto-Events
- Saubere Trennung: `pdf_builder.py` kann später von Event-App importiert werden

**Non-Goals:**
- Kein API-Endpunkt (Phase 1 ist CLI-only)
- Kein Django-Management-Command (standalone)
- Keine Frontend-UI
- Kein interaktiver Vorschau-Modus
- Keine Datenbank-Anbindung

## Decisions

### 1. Verzeichnisstruktur

```
backend/documents/
├── generate.py              # CLI entry point
├── pdf_builder.py           # reportlab Layout-Engine
├── text_resolver.py         # Textbaustein + KI-Auflösung
├── page_optimizer.py        # Seiten-Constraint-Optimizer
├── schema.py                # Pydantic Models für YAML-Validierung
├── defaults/
│   ├── text_blocks.yaml     # Greeting, Additional Info, Consent
│   ├── packlists.yaml       # wanderung, lager_haus, minimal
│   └── form_fields.yaml     # standard, extended
├── assets/
│   └── logos/               # Stammes-Logos (PNG)
├── templates/
│   └── sippentippel_2026.yaml  # Beispiel-Event
└── README.md                # Anleitung
```

**Rationale:** Eigenes Verzeichnis statt Django-App, weil standalone und keine Models/Migrations nötig. `defaults/` trennt wiederverwendbare Bausteine von Event-spezifischen Templates.

### 2. YAML-Schema mit strukturierten Daten

Event-Daten als Rohdaten, nicht als fertige Strings:

```yaml
event:
  name: "Sippentippel"
  type: "sippentippel"          # steuert Default-Textbaustein
  location: "Königswinter"
  area: "das schöne Siebengebirge"
  start_date: 2026-05-29
  start_time: "16:30"
  end_date: 2026-05-31
  end_time: "15:00"
  meeting_point: "Bahnhof Korschenbroich"
  return_point: null             # Default: = meeting_point
  fee: 25.00
  fee_note: "passend in bar mitbringen oder vorab überweisen"
  registration_deadline: 2026-05-22
  registration_method: "Am Heimabend abgeben oder per WhatsApp an Marcel"

participants:
  type: "Sipplinge"

group:
  name: "Stamm Sugambrer"
  logo: "assets/logos/stamm_logo.png"
```

Strings wie `"Freitag, 29.05.2026 bis Sonntag, 31.05.2026"` werden aus `start_date`/`end_date` im Code generiert (deutsche Wochentage, Datumsformat).

**Rationale:** Strukturierte Daten erlauben konsistente Formatierung und sind wiederverwendbar (z.B. wenn Event-App später Daten liefert).

### 3. Text-Auflösung (3 Stufen)

```python
# In texts: Sektion des YAML
texts:
  greeting: "default"           # → Textbaustein für event.type
  additional_info: "zelt_wanderung"  # → spezifischer Baustein-Key
  consent: "default"            # → Standard-Consent
  # Oder:
  greeting: "Mein eigener Text" # → wörtlich übernommen
  # Oder:
  additional_info: "ai"         # → KI generiert
```

Auflösungslogik in `text_resolver.py`:
1. Wenn Wert ein bekannter Preset-Key ist → Template laden und Variablen ersetzen
2. Wenn `"ai"` → Prompt mit Event-Daten an Gemini senden
3. Sonst → wörtlich übernehmen

**Rationale:** Maximale Flexibilität bei minimalem YAML. Defaults reduzieren Tippaufwand, KI ermöglicht individuelle Formulierungen für Motto-Events.

### 4. KI-Textgenerierung

Nur wenn explizit `"ai"` gesetzt. Prompt wird aus Event-Daten zusammengebaut:

```
Du schreibst einen {block_type} für eine Pfadfinder-Anmeldung.
Event: {event.name} in {event.location}
Datum: {formatted_date_range}
Motto/Thema: {event.theme}  (falls gesetzt)
Teilnehmer: {participants.type}
Schreibe 3-5 Sätze. Sachlich, freundlich, an Eltern gerichtet.
```

Verwendet `google-genai` SDK direkt (kein Django nötig, ADC für Auth).

### 5. Seiten-Optimizer

```yaml
layout:
  pages: 1  # oder 2
```

Algorithmus:
1. Render mit Default-Parametern (Font 11pt, Absatzabstand 6mm, Ränder 20mm)
2. Wenn Seitenanzahl != Ziel: Optimieren
3. Stellschrauben in Prioritätsreihenfolge (unsichtbar → sichtbar):
   - Absatzabstand (±2mm, Step 0.5mm)
   - Block-Abstände (±3mm, Step 1mm)
   - Zeilenhöhe/Leading (11-14pt, Step 0.5pt)
   - Schriftgröße Body (9-12pt, Step 0.5pt)
   - Schriftgröße Header (14-20pt, Step 1pt)
   - Seitenränder (15-25mm, Step 1mm)
4. Constraint: Blöcke werden **nie** über Seitenumbruch getrennt (reportlab `KeepTogether`)
5. Bei 2 Seiten: Umbruch vor dem Formular-Block
6. Wenn nach allen Stellschrauben nicht passt → **Fehler mit Meldung**

**Rationale:** Benutzer soll Seitenanzahl bestimmen, nicht das Layout manuell anpassen. Binary-Search pro Stellschraube wäre effizienter als lineare Steps, aber bei max ~20 Iterationen pro Schraube ist linear schnell genug.

### 6. Optimizer-Logging

Jeder Lauf zeigt:
```
✓ PDF generiert: output/anmeldung.pdf (1 Seite)
  Optimiert: Schriftgröße 11pt → 10.5pt, Absatzabstand 6mm → 5mm
```

Oder bei Fehler:
```
✗ Fehler: Inhalt passt nicht auf 1 Seite (minimum: 1.3 Seiten)
  Empfehlung: layout.pages auf 2 setzen oder Texte kürzen
```

### 7. Pydantic-Validierung des YAML

`schema.py` definiert Pydantic-Models die das YAML validieren bevor der Builder startet. Fehler in der YAML-Datei werden sofort gemeldet (fehlende Pflichtfelder, ungültige Datumsformate, unbekannte Preset-Keys).

## Risks / Trade-offs

- **[Reportlab-Limitierung]** Platypus hat kein echtes "Probe-Rendering" für Höhenmessung. → Mitigation: `flowable.wrap()` gibt benötigte Höhe zurück ohne PDF zu schreiben. Damit kann der Optimizer Gesamthöhe berechnen.
- **[KI-Texte unvorhersagbar]** Gemini könnte zu lange/kurze Texte generieren. → Mitigation: Prompt enthält Längen-Constraint ("3-5 Sätze"), Optimizer passt Layout trotzdem an.
- **[YAML-Komplexität]** Schema könnte für Nicht-Entwickler schwer sein. → Mitigation: README mit Copy-Paste-Beispiel, Beispiel-Templates, Pydantic-Validierung mit klaren Fehlermeldungen.
- **[Font-Verfügbarkeit]** reportlab built-in Fonts (Helvetica, Times) sind limitiert. → Mitigation: Reicht für Phase 1. Custom Fonts können später in `assets/fonts/` hinzugefügt werden.
