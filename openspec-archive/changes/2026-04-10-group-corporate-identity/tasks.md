## 1. Backend: CI-Datenmodell & Migration

- [x] 1.1 `GroupCorporateIdentity` Model in `backend/profiles/models/groups.py` erstellen (OneToOneField zu UserGroup, Felder: primary_color, secondary_color, logo, slogan, greeting_text, footer_text, payment_info, signature_text)
- [x] 1.2 Re-export in `backend/profiles/models/__init__.py` hinzufügen
- [x] 1.3 Migration erstellen und ausführen (`uv run python manage.py makemigrations profiles && uv run python manage.py migrate`)

## 2. Backend: CI Pydantic-Schemas

- [x] 2.1 `GroupCorporateIdentityOut` Schema in `backend/profiles/schemas/groups.py` erstellen (alle CI-Felder + logo_url)
- [x] 2.2 `GroupCorporateIdentityIn` Schema erstellen (alle CI-Felder ohne logo, mit Hex-Color-Validierung)
- [x] 2.3 `UserGroupDetailOut` erweitern um optionales `corporate_identity: GroupCorporateIdentityOut | None`

## 3. Backend: CI API-Endpunkte

- [x] 3.1 `GET /api/groups/{slug}/corporate-identity/` Endpunkt in `backend/profiles/api/groups.py` (gibt CI oder Defaults zurück)
- [x] 3.2 `PUT /api/groups/{slug}/corporate-identity/` Endpunkt (create/update, nur Gruppen-Admins)
- [x] 3.3 `POST /api/groups/{slug}/corporate-identity/logo/` Endpunkt (Logo-Upload mit 500KB-Validierung)
- [x] 3.4 `DELETE /api/groups/{slug}/corporate-identity/logo/` Endpunkt (Logo entfernen)

## 4. Backend: CI-Helper-Funktion

- [x] 4.1 `get_event_ci(event)` Helper in `backend/event/services/ci_helper.py` erstellen (resolves CI für Event über invited_groups)
- [x] 4.2 Default-CI-Datenstruktur definieren (Inspi-Defaults für Events ohne Gruppen-CI)

## 5. Backend: HTML-E-Mail-Templates

- [x] 5.1 `backend/event/templates/event/email/base.html` erstellen (Inline-CSS, tabellenbasiert, Header mit Logo/Farbe, Content-Block, Footer)
- [x] 5.2 `backend/event/templates/event/email/event_mail.html` erstellen (extends base, für manuellen Mail-Versand)
- [x] 5.3 `backend/event/templates/event/email/registration_confirmation.html` erstellen (extends base, Teilnehmerliste, Zahlungsinfos)
- [x] 5.4 `backend/event/templates/event/email/invitation.html` erstellen (extends base, Event-Details, Einladungstext)

## 6. Backend: MailService auf HTML umstellen

- [x] 6.1 `MailService.send_mail()` in `backend/event/services/mail.py` umbauen: CI laden, HTML-Template rendern, `send_mail(html_message=...)` mit Plain-Text-Fallback
- [x] 6.2 `MailService.send_registration_confirmation()` umbauen: CI laden, HTML-Template rendern
- [x] 6.3 Content-Approval-E-Mails in `backend/content/services/email_service.py` auf HTML-Base-Template umstellen

## 7. Backend: Einladungs-PDF-Service

- [x] 7.1 `InvitationPdfService` in `backend/event/services/invitation_pdf.py` erstellen (ReportLab, A4 Portrait, CI-Header, Event-Details, Footer)
- [x] 7.2 Markdown-zu-ReportLab-Paragraph-Konvertierung für `invitation_text` implementieren
- [x] 7.3 Optionale Sektionen einbauen: Packliste (wenn verknüpft), Buchungsoptionen mit Preisen

## 8. Backend: Einladungs-PDF API-Endpunkte

- [x] 8.1 `GET /api/events/{slug}/invitation-pdf/` Endpunkt in `backend/event/api/` erstellen (PDF-Download, nur Manager)
- [x] 8.2 `POST /api/events/{slug}/send-invitation/` Endpunkt erstellen (PDF als E-Mail-Anhang an Gruppen/User)

## 9. Backend: Tests

- [x] 9.1 pytest Tests für `GroupCorporateIdentity` Model (CRUD, Validierung, Defaults)
- [x] 9.2 pytest Tests für CI API-Endpunkte (GET/PUT/POST/DELETE, Auth-Checks, 403 für Nicht-Admins)
- [x] 9.3 pytest Tests für `get_event_ci()` Helper (mit/ohne Gruppen, mit/ohne CI)
- [x] 9.4 pytest Tests für HTML-E-Mail-Rendering (Template rendert, CI-Werte eingesetzt, Plain-Text-Fallback)
- [x] 9.5 pytest Tests für Einladungs-PDF (generiert PDF, enthält CI-Daten, 403 für Nicht-Manager)

## 10. Frontend: Zod-Schemas (sync mit Pydantic)

- [x] 10.1 `GroupCorporateIdentitySchema` und `GroupCorporateIdentityFormSchema` in `frontend/src/features/groups/schemas/corporateIdentity.ts` erstellen
- [x] 10.2 `UserGroupDetailSchema` erweitern um optionales `corporateIdentity`

## 11. Frontend: TanStack Query Hooks

- [x] 11.1 `useGroupCorporateIdentity(slug)` Query-Hook erstellen (GET CI)
- [x] 11.2 `useUpdateGroupCorporateIdentity(slug)` Mutation-Hook erstellen (PUT CI)
- [x] 11.3 `useUploadGroupLogo(slug)` Mutation-Hook erstellen (POST Logo)
- [x] 11.4 `useDeleteGroupLogo(slug)` Mutation-Hook erstellen (DELETE Logo)
- [x] 11.5 `useDownloadInvitationPdf(eventSlug)` Hook erstellen
- [x] 11.6 `useSendInvitation(eventSlug)` Mutation-Hook erstellen

## 12. Frontend: CI-Verwaltungsseite

- [x] 12.1 `CorporateIdentityForm.tsx` Komponente erstellen (Color Picker, Logo-Upload, Textfelder mit shadcn/ui)
- [x] 12.2 `CorporateIdentityPreview.tsx` Komponente erstellen (Live-Vorschau E-Mail/Brief)
- [x] 12.3 Route `/groups/{slug}/settings/corporate-identity` einrichten und in Gruppen-Navigation integrieren
- [x] 12.4 Color-Picker-Komponente bauen (input[type=color] + shadcn/ui Popover + Hex-Input)

## 13. Frontend: Event-Einladungs-PDF Integration

- [x] 13.1 "Einladung herunterladen" Button im Event-Management-Bereich hinzufügen
- [x] 13.2 "Einladung verschicken" Dialog mit Empfänger-Auswahl (Gruppen/User) hinzufügen

## 14. Seed Data

- [x] 14.1 Management Command `seed_corporate_identity` in `backend/profiles/management/commands/` erstellen
- [x] 14.2 3 Gruppen mit diversen CI-Konfigurationen anlegen (Windrose/grün, Nordlicht/blau, Feuerfuchs/orange)
- [x] 14.3 Placeholder-Logos programmatisch generieren (Pillow: farbige Kreise mit Initialen)
- [x] 14.4 Realistische deutsche Textbausteine (Anrede, Impressum, Zahlungsdaten, Unterschrift) einfügen
