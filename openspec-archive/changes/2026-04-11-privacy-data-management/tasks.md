## 1. Backend: Privacy Data Collectors

- [x] 1.1 Erstelle `backend/profiles/services/privacy.py` mit `PrivacyDataCollector` Basisklasse und `PrivacyService` Orchestrator
- [x] 1.2 Implementiere `ProfilePrivacyCollector` in `profiles/services/privacy.py` — sammelt UserProfile, UserPreference, GroupMembership Daten
- [x] 1.3 Implementiere `EventPrivacyCollector` in `event/services/privacy.py` — sammelt Person, Participant, Registration, Payment, CustomFieldValue Daten
- [x] 1.4 Implementiere `ContentPrivacyCollector` in `content/services/privacy.py` — sammelt Content (als Autor), Comments, Emotions, Views, SearchLogs
- [x] 1.5 Implementiere `PlannerPrivacyCollector` in `planner/services/privacy.py` — sammelt Planner, PlannerCollaborator, MealEvent Daten
- [x] 1.6 Implementiere `PackingListPrivacyCollector` in `packinglist/services/privacy.py` — sammelt PackingList Daten
- [x] 1.7 Implementiere `ShoppingPrivacyCollector` in `shopping/services/privacy.py` — sammelt ShoppingList, ShoppingListCollaborator Daten
- [x] 1.8 Registriere alle Collectors im PrivacyService (z.B. in `profiles/apps.py` ready())

## 2. Backend: Pydantic Schemas

- [x] 2.1 Erstelle `backend/profiles/schemas/privacy.py` mit `DataOverviewSchema` und allen Sub-Schemas (ProfileDataSchema, CategorySchema, etc.)
- [x] 2.2 Erstelle `DeleteAccountRequestSchema` mit Passwort- und Bestätigungstext-Validierung
- [x] 2.3 Exportiere neue Schemas in `backend/profiles/schemas/__init__.py`

## 3. Backend: API-Endpunkte

- [x] 3.1 Erstelle `GET /api/auth/privacy/data-overview/` in `backend/core/api.py` — ruft PrivacyService.collect_user_data() auf
- [x] 3.2 Erstelle `POST /api/auth/privacy/data-export/` in `backend/core/api.py` — generiert JSON-Download mit Content-Disposition Header
- [x] 3.3 Erstelle `POST /api/auth/privacy/delete-account/` in `backend/core/api.py` — validiert Passwort, ruft PrivacyService.anonymize_user() auf, beendet Session

## 4. Backend: Anonymisierungs-Logik

- [x] 4.1 Implementiere `anonymize()` in `ProfilePrivacyCollector` — leert alle Profil-Felder, löscht Profilbild aus Cloud Storage, löscht GroupMembership/JoinRequests
- [x] 4.2 Implementiere `anonymize()` in `EventPrivacyCollector` — anonymisiert Person/Participant-Daten (Namen → "Gelöscht", Kontakt → "")
- [x] 4.3 Implementiere `anonymize()` in `ContentPrivacyCollector` — löscht Views/SearchLogs/Emotions, anonymisiert Comments (author_name → "Gelöscht")
- [x] 4.4 Implementiere `anonymize()` in Planner/PackingList/Shopping Collectors — löscht eigene Einträge
- [x] 4.5 Implementiere User-Anonymisierung in `PrivacyService.anonymize_user()` — wrapped alles in `transaction.atomic()`, deaktiviert User, setzt unusable password

## 5. Backend: Data Retention Management-Command

- [x] 5.1 Erstelle `backend/content/management/commands/cleanup_analytics.py` mit `--retention-months` und `--dry-run` Argumenten
- [x] 5.2 Implementiere Batch-Löschung (10.000 pro Batch) für ContentView und SearchLog

## 6. Backend: Tests

- [x] 6.1 Schreibe pytest Tests für `GET /api/auth/privacy/data-overview/` (authentifiziert, nicht authentifiziert, leere Kategorien)
- [x] 6.2 Schreibe pytest Tests für `POST /api/auth/privacy/data-export/` (Download-Header, Metadaten, Auth-Check)
- [x] 6.3 Schreibe pytest Tests für `POST /api/auth/privacy/delete-account/` (korrektes Passwort, falsches Passwort, Guest-Account, fehlende Bestätigung, Session-Invalidierung)
- [x] 6.4 Schreibe pytest Tests für `cleanup_analytics` Command (Standard-Retention, Custom-Retention, Dry-Run, Batch-Löschung)

## 7. Frontend: Zod Schemas & API-Hooks

- [x] 7.1 Erstelle `frontend/src/features/profile/api/privacy.ts` mit Zod-Schemas (dataOverviewSchema, deleteAccountRequestSchema) und API-Funktionen
- [x] 7.2 Erstelle `frontend/src/features/profile/hooks/usePrivacy.ts` mit TanStack Query Hooks (useDataOverview, useDataExport, useDeleteAccount)

## 8. Frontend: Privacy Page

- [x] 8.1 Erstelle `frontend/src/pages/profile/PrivacyPage.tsx` mit drei Abschnitten (Datenübersicht, Export, Konto löschen)
- [x] 8.2 Implementiere Datenübersicht-Abschnitt — kategorisierte Auflistung mit Zählern und aufklappbaren Details
- [x] 8.3 Implementiere Daten-Export-Abschnitt — Button mit Ladeindikator, Download-Trigger
- [x] 8.4 Implementiere Konto-Löschen-Abschnitt — Roter Gefahrenbereich mit mehrstufigem Bestätigungsdialog (Warnung → Passwort → Bestätigungstext → Button)

## 9. Frontend: Navigation & Routing

- [x] 9.1 Füge Route `/profile/privacy` in `frontend/src/App.tsx` hinzu (PrivacyPage, authentifiziert)
- [x] 9.2 Erweitere Profil-Navigation in `frontend/src/components/Layout.tsx` um "Meine Daten & Datenschutz" Eintrag
- [x] 9.3 Aktualisiere `frontend/src/pages/DatenschutzPage.tsx` — Verlinkung auf `/profile/privacy` für authentifizierte Nutzer

## 10. Integration & Abschluss

- [x] 10.1 Manueller Test: Datenübersicht mit echten Testdaten prüfen
- [x] 10.2 Manueller Test: JSON-Export herunterladen und Inhalt verifizieren
- [x] 10.3 Manueller Test: Konto-Löschung durchführen und Anonymisierung in DB prüfen
- [x] 10.4 Mobile-Ansicht (320px) für Privacy-Seite testen
