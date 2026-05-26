# Registration PDF Generator

Generiert Anmelde-PDFs für Pfadfinder-Veranstaltungen aus YAML-Konfiguration.

## Schnellstart

```bash
# Aus dem Backend-Verzeichnis:
uv run python documents/generate.py documents/templates/sippentippel_2026.yaml
```

Das PDF wird unter `documents/output/sippentippel_2026.pdf` generiert.

### Eigenen Ausgabepfad setzen

```bash
uv run python documents/generate.py documents/templates/event.yaml --output meine_anmeldung.pdf
```

## YAML-Schema

### Pflichtfelder

```yaml
event:
  name: "Sippentippel"              # Name der Veranstaltung
  start_date: 2026-05-29            # Startdatum (YYYY-MM-DD)
  end_date: 2026-05-31              # Enddatum
  meeting_point: "Bahnhof XY"       # Treffpunkt
  fee: 25.00                        # Beitrag in Euro
  registration_deadline: 2026-05-22 # Anmeldefrist

participants:
  type: "Sipplinge"                 # Teilnehmergruppe
```

### Optionale Felder

```yaml
event:
  type: "sippentippel"       # Steuert Standard-Textbausteine
                              # (sippentippel, lager, hajk, stammeslager,
                              #  heimabend_special, aktionstag, default)
  location: "Königswinter"   # Ort
  area: "das schöne Siebengebirge"  # Gebiet/Region
  theme: "Harry Potter"      # Motto (aktiviert KI-Texte wenn texts: "ai")
  start_time: "16:30"        # Uhrzeit Treffpunkt
  end_time: "15:00"          # Uhrzeit Rückkehr
  return_point: null         # Rückkehr-Ort (Standard: = meeting_point)
  fee_note: "passend in bar" # Hinweis zum Beitrag
  registration_method: ""    # Wie anmelden

group:
  name: "Stamm XY"
  logo: "assets/logos/stamm_logo.png"  # Pfad relativ zu documents/

layout:
  pages: 1                   # Ziel-Seitenanzahl (1-4)
```

### Texte

Drei Quellen, gesteuert über `texts:`-Sektion:

| Wert | Bedeutung |
|------|-----------|
| `"default"` | Textbaustein passend zum `event.type` |
| `"zelt_wanderung"` | Spezifischer Baustein-Key |
| `"ai"` | KI-generiert (ideal für Motto-Events) |
| `"Eigener Text..."` | Wörtlich übernommen |

```yaml
texts:
  greeting: "default"              # Begrüßung
  additional_info: "zelt_wanderung" # Zusatzinfos
  consent: "default"               # Einverständnis

signup_note: "Per WhatsApp an Marcel"  # Anmelde-Hinweis (italic)
```

### Packlisten-Presets

| Key | Inhalt |
|-----|--------|
| `wanderung` | Schuhe, Regenjacke, Schlafsack, Isomatte, Wechselkleidung, Krankenkassenkarte, Kluft, Hygiene |
| `lager_haus` | Schlafsack, Bettwäsche, Wechselkleidung, Krankenkassenkarte, Kluft, Hygiene, Sonnencreme |
| `minimal` | Wechselkleidung, Krankenkassenkarte, Kluft |

```yaml
packlist: "wanderung"        # Preset oder eigene Liste
packlist_extra:              # Zusätzliche Items
  - "Taschenmesser"
```

### Formularfeld-Presets

| Key | Felder |
|-----|--------|
| `standard` | Name, Geburtsdatum, Telefon, Essgewohnheiten, Allergien |
| `extended` | + Adresse, E-Mail, Schwimmfähigkeit |

```yaml
form_fields: "standard"      # Preset oder eigene Feldliste
```

#### Eigene Felder definieren

```yaml
form_fields:
  - type: "text_line"
    label: "Name"
    same_line_with: "Geburtsdatum"  # optional: zweites Feld auf gleicher Zeile
  - type: "text_line"
    label: "Telefon"
  - type: "checkboxes"
    label: "Essgewohnheiten"
    options: ["vegetarisch", "Vegan"]
    has_other: true
    other_label: "sonstiges"
  - type: "text_area"
    label: "Allergien und Besonderheiten"
    lines: 2
```

## Verzeichnisstruktur

```
backend/documents/
├── generate.py          # CLI: uv run python documents/generate.py <yaml>
├── pdf_builder.py       # reportlab Layout-Engine
├── text_resolver.py     # Textbaustein + KI-Auflösung
├── page_optimizer.py    # Seiten-Optimizer
├── schema.py            # Pydantic YAML-Validierung
├── defaults/
│   ├── text_blocks.yaml # Begrüßungen, Infos, Consent
│   ├── packlists.yaml   # Packlisten-Presets
│   └── form_fields.yaml # Formularfeld-Presets
├── assets/logos/        # Stammes-Logos (PNG)
├── templates/           # Beispiel-YAMLs
└── output/              # Generierte PDFs
```

## Seiten-Optimizer

Der Optimizer passt Layout-Parameter automatisch an, damit der Inhalt auf die gewünschte Seitenanzahl passt. Reihenfolge (unsichtbar → sichtbar):

1. Absatzabstand (4-8mm)
2. Blockabstand (3-12mm)
3. Zeilenhöhe (1.1-1.4x)
4. Schriftgröße (9-12pt)
5. Überschrift (14-20pt)
6. Seitenränder (15-25mm)

Bei Erfolg:
```
✓ PDF generiert: output/sippentippel.pdf (1 Seite)
  Optimiert: Schriftgröße 11pt → 10.5pt, Absatzabstand 6mm → 5mm
```

Bei Fehler:
```
✗ Inhalt passt nicht auf 1 Seite(n) (minimum: 1.3 Seiten).
  Empfehlung: layout.pages auf 2 setzen oder Texte kürzen.
```
