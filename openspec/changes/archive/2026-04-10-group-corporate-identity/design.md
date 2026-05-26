## Context

`UserGroup` in `profiles/models/groups.py` hat aktuell nur organisatorische Felder (Name, Slug, Beschreibung, Hierarchie, Beitrittslogik). Es gibt keinerlei Branding-Felder. E-Mails werden als Plain-Text über `django.core.mail.send_mail()` verschickt (`event/services/mail.py`), und der PDF-Export in `event/services/export.py` verwendet hardcoded ReportLab-Farben. Logo-Uploads laufen über die bestehende GCS-Integration (`gs://gruppenstunde-media/`).

Jede Gruppe (Stamm) soll eine eigene Corporate Identity pflegen können, die dann in E-Mails, PDFs und Registrierungsseiten verwendet wird.

## Goals / Non-Goals

**Goals:**
- CI-Datenmodell: Farben, Logo, Textbausteine (Slogan, Anrede, Impressum, Zahlungsdaten, Unterschrift) pro Gruppe
- Frontend-Verwaltungsseite mit Color Picker, Logo-Upload und Textbaustein-Formularen
- HTML-E-Mail-Template-System das CI-Daten der Gruppe einbindet
- Einladungs-PDF mit Gruppen-Branding (Logo, Farben, Textbausteine)
- Testdaten für Gruppen mit verschiedenen CI-Konfigurationen

**Non-Goals:**
- Bestehende Teilnehmerlisten-PDFs werden **nicht** auf CI umgestellt (nur neue Exports)
- Kein Custom-CSS oder benutzerdefinierte Schriftarten
- Kein WYSIWYG-E-Mail-Editor (Template ist fix, nur Daten werden eingesetzt)
- Keine CI-Vererbung über Gruppen-Hierarchie (jede Gruppe hat ihre eigene CI oder keine)
- Keine Instagram-Export-Anpassung

## Decisions

### 1. Separates `GroupCorporateIdentity`-Model statt Felder auf `UserGroup`

**Entscheidung:** Ein eigenes `GroupCorporateIdentity`-Model mit `OneToOneField` zu `UserGroup`.

**Begründung:** `UserGroup` hat bereits 12 Felder. 8+ neue CI-Felder würden das Model aufblähen. Ein separates Model ermöglicht saubere Trennung: `group.corporate_identity` als optionaler Zugriff. Wenn keine CI konfiguriert ist, existiert einfach kein CI-Objekt (statt 8 leere Felder).

**Alternative:** Alle Felder direkt auf `UserGroup`. Einfacher, aber schlechtere Separation of Concerns.

**Betroffene Dateien:**
- `backend/profiles/models/groups.py` — neues Model `GroupCorporateIdentity`
- `backend/profiles/models/__init__.py` — re-export
- `backend/profiles/schemas/groups.py` — neue Schemas `GroupCorporateIdentityOut`, `GroupCorporateIdentityIn`
- `backend/profiles/api/groups.py` — neue Endpunkte

### 2. CI-Felder im Detail

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `group` | OneToOneField(UserGroup) | Zugehörige Gruppe |
| `primary_color` | CharField(max_length=7) | Hex-Farbe, Default `#4a3a6b` |
| `secondary_color` | CharField(max_length=7) | Hex-Farbe, Default `#e8e4f0` |
| `logo` | ImageField | Upload via GCS, max 500KB, WebP-Konvertierung |
| `slogan` | CharField(max_length=200) | Motto/Slogan |
| `greeting_text` | TextField | Anrede-Textbaustein für Briefe/E-Mails |
| `footer_text` | TextField | Impressum/Kontakt-Fußzeile |
| `payment_info` | TextField | Zahlungsdaten (Konto, PayPal etc.) |
| `signature_text` | TextField | Unterschrift-Text für Briefe |

### 3. Django-Templates für HTML-E-Mails statt Third-Party

**Entscheidung:** Django's Template-Engine (`render_to_string`) mit HTML-Templates in `backend/event/templates/event/email/`.

**Begründung:** Django-Templates sind bereits verfügbar, keine neue Dependency nötig. Inline-CSS für E-Mail-Kompatibilität. Ein Base-Template mit CI-Variablen (Logo-URL, Farben, Footer), spezifische Templates erben davon.

**Template-Struktur:**
- `email/base.html` — Basis mit Header (Logo + Farbe), Content-Block, Footer (Impressum + Zahlungsdaten)
- `email/event_mail.html` — Manueller E-Mail-Versand an Teilnehmer
- `email/registration_confirmation.html` — Anmeldebestätigung
- `email/invitation.html` — Event-Einladung

**API-Änderung:** `MailService.send_mail()` und `send_registration_confirmation()` in `event/services/mail.py` nutzen `send_mail(html_message=...)` mit Plain-Text-Fallback.

### 4. Einladungs-PDF mit ReportLab

**Entscheidung:** Neuer Service `event/services/invitation_pdf.py` nutzt ReportLab (bereits als Dependency vorhanden).

**Begründung:** ReportLab ist bereits für Teilnehmer-Export im Einsatz. Einladungs-PDF unterscheidet sich stark (Briefformat, hochkant A4, Logo-Header, Fließtext) und bekommt daher einen eigenen Service.

**PDF-Aufbau:**
1. **Header:** Logo (links) + Stammesname + Slogan (rechts), farbige Linie in `primary_color`
2. **Body:** Event-Name, Datum/Ort, Einladungstext (Markdown → ReportLab Paragraphs)
3. **Optionale Sektionen:** Packliste (wenn verknüpft), Buchungsoptionen mit Preisen
4. **Footer:** Impressum, Zahlungsdaten, Unterschrift

**Neue API-Endpunkte:**
- `GET /api/events/{slug}/invitation-pdf/` — PDF-Download
- `POST /api/events/{slug}/send-invitation/` — PDF als E-Mail-Anhang an eingeladene Gruppen/User

### 5. CI-Integration in Event-Kontext

**Entscheidung:** Events erhalten ihre CI von der **ersten eingeladenen Gruppe** (`event.invited_groups.first()`). Wenn keine Gruppe eingeladen ist, wird ein neutrales Inspi-Default-Styling verwendet.

**Begründung:** Ein Event gehört nicht direkt zu einer Gruppe (kein FK), aber über `invited_groups` lässt sich die Zugehörigkeit ableiten. In der Praxis wird ein Stammeslager/Heimabend fast immer von genau einem Stamm veranstaltet.

**Alternative:** Neues Feld `event.organizing_group` als expliziter FK. Wäre sauberer, erfordert aber Schema-Migration auf dem Event-Model. Kann als späterer Schritt nachgezogen werden.

### 6. Frontend: Gruppen-Einstellungsseite

**Entscheidung:** Neue Route `/groups/{slug}/settings/corporate-identity` als Tab in den Gruppeneinstellungen.

**Betroffene Dateien (Frontend):**
- `frontend/src/features/groups/components/CorporateIdentityForm.tsx` — Formular
- `frontend/src/features/groups/components/CorporateIdentityPreview.tsx` — Live-Vorschau
- `frontend/src/features/groups/api/corporateIdentity.ts` — TanStack Query Hooks
- `frontend/src/features/groups/schemas/corporateIdentity.ts` — Zod-Schemas

**UI-Komponenten:**
- Color Picker: Custom-Komponente basierend auf `input[type=color]` + shadcn/ui Popover
- Logo-Upload: Bestehende Upload-Komponente wiederverwenden
- Textbausteine: Standard shadcn/ui Textarea + Input Felder
- Vorschau: Stilisierte E-Mail/Brief-Vorschau mit eingesetzten CI-Daten

## Risks / Trade-offs

**[E-Mail-Rendering-Inkonsistenz]** → HTML-E-Mails rendern unterschiedlich in verschiedenen Clients. Mitigation: Nur Inline-CSS verwenden, tabellenbasiertes Layout, keine modernen CSS-Features. Testing mit populären Clients (Gmail, Outlook, Apple Mail).

**[Logo-Qualität in PDFs]** → Hochgeladene Logos können niedrige Auflösung haben. Mitigation: Empfehlung für Mindestgröße (300x300px) im Upload-Dialog, PNG/SVG bevorzugt.

**[Gruppen-CI-Zuordnung bei Events]** → `invited_groups.first()` ist fragil bei mehreren eingeladenen Gruppen. Mitigation: In Phase 1 akzeptabel, da Events typischerweise von einem Stamm organisiert werden. Langfristig `organizing_group` FK hinzufügen.

**[Migration]** → Neues Model `GroupCorporateIdentity`, keine Daten-Migration nötig (Tabelle ist neu leer). Bestehende Gruppen funktionieren ohne CI weiterhin mit Default-Styling.

**Datenbank-Migration:**
- `profiles`: Neue Tabelle `profiles_groupcorporateidentity`
- Keine Änderungen an bestehenden Tabellen
- Rollback: `migrate profiles <vorherige_migration>`
