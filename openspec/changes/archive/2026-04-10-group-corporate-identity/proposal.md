## Why

Gruppen (Stämme) auf Inspi haben aktuell keinerlei visuelle Identität — kein Logo, keine Farben, keine Textbausteine. Dadurch wirken alle E-Mails, PDF-Exporte und Anmelde-Seiten generisch. Gruppenführer wollen ihre Kommunikation (Einladungen, Bestätigungsmails, Teilnehmerlisten) im eigenen Stammeslook verschicken, um Wiedererkennung und Professionalität zu schaffen. Die bestehende E-Mail-Infrastruktur nutzt ausschließlich Plain-Text f-Strings ohne Templates, und PDF-Exporte haben hardcoded Farben ohne Branding.

## What Changes

- **Neues CI-Datenmodell auf `UserGroup`**: Felder für Primärfarbe (Color Picker), Sekundärfarbe, Logo-Upload, Slogan/Motto, Anrede-Text, Impressum/Kontakt-Fußzeile, Zahlungsdaten-Text, Unterschrift-Text
- **CI-Verwaltung im Frontend**: Einstellungsseite pro Gruppe mit Color Picker, Logo-Upload, Textbaustein-Formularen und Live-Vorschau
- **HTML-E-Mail-Template-System**: Wiederverwendbare HTML-E-Mail-Basis mit CI-Styling (Logo, Farben, Footer), ersetzt die Plain-Text-E-Mails für Event-Kommunikation und Registrierungsbestätigungen
- **Einladungs-PDF-Generator**: Neuer PDF-Export mit Stammeslogo + Farben als Header, Event-Details, Einladungstext, optionale Packliste und Anmelde-Infos — als Download und E-Mail-Anhang
- **CI-Integration in Anmeldedaten**: Event-Registrierungsseiten und Bestätigungs-E-Mails nutzen die CI der einladenden Gruppe
- **Testdaten**: Seed-Data für Gruppen mit vollständiger CI-Konfiguration (verschiedene Farben, Logos, Textbausteine)

## Capabilities

### New Capabilities
- `group-corporate-identity`: CI-Datenmodell (Farben, Logo, Textbausteine wie Zahlungsdaten, Slogan, Anrede, Impressum) auf `UserGroup`, API-Endpunkte für CRUD, Frontend-Verwaltungsseite mit Color Picker und Vorschau
- `ci-email-templates`: HTML-E-Mail-Template-System mit CI-Styling (Logo, Farben, Footer), Integration in Event-Mail-Versand und Registrierungsbestätigungen
- `ci-invitation-pdf`: PDF-Generator für Event-Einladungen mit Gruppen-CI (Logo, Farben, Textbausteine), Download und E-Mail-Anhang-Versand
- `ci-seed-data`: Testdaten für Gruppen mit vollständiger CI-Konfiguration

### Modified Capabilities
- `event-mail`: E-Mail-Versand nutzt HTML-Templates mit CI statt Plain-Text
- `event-guest-registration`: Bestätigungsmail nutzt CI-Template der einladenden Gruppe

## Impact

- **Django Apps betroffen**: `profiles` (CI-Model-Erweiterung), `event` (PDF-Generator, E-Mail-Templates, Registrierungsflow)
- **Neue Dependencies**: Keine neuen Python-Packages nötig (ReportLab bereits vorhanden, Django-Template-Engine für HTML-Mails)
- **Pydantic-Schemas**: `UserGroupOut`, `UserGroupDetailOut`, `UserGroupUpdateIn` erweitern um CI-Felder; neue Schemas für CI-Konfiguration
- **Zod-Schemas**: Entsprechende Frontend-Schemas für CI-Daten synchron anlegen
- **Migrations**: Neue Felder auf `UserGroup` (Farben, Logo, Textbausteine), ggf. separates `GroupCorporateIdentity`-Model
- **Media-Uploads**: Logo-Dateien über bestehende GCS-Integration
- **API-Endpunkte**: Neue Endpunkte für CI-Verwaltung, erweiterter Event-Mail-Endpunkt, neuer Einladungs-PDF-Endpunkt
- **Frontend-Pages**: Neue Gruppen-Einstellungsseite, erweitertes Event-Management (PDF-Download/Versand)
