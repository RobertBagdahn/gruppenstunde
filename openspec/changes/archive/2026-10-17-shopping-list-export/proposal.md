## Why

Beim gemeinsamen Einkauf am 16.10.2026 war die Einkaufsliste wegen Überlast rund eine Stunde kaum nutzbar. Das Team wünscht sich deshalb, die Liste „zum Abhaken (mit einzelnen Kategorien)“ exportieren zu können. Ein Export ist eine Rückfalllösung, wenn App oder Netz im Laden ausfallen. Außerdem kann man die Liste so in Kanäle geben, die ohnehin genutzt werden: Papier, WhatsApp, Notizen-App, Google Keep. Die Spec `shopping-list-views` verlangt bereits eine Druckansicht, im Food-Frontend gibt es auf der Einkaufsliste aber keinen Druck- oder Export-Button.

## What Changes

- Neuer Button „Liste exportieren“ im Kopfband der Einkaufslisten-Detailseite im Food-Frontend, mit drei Aktionen:
  - **Drucken oder als PDF speichern:** Druckansicht über den Browser-Druckdialog, gruppiert nach Abteilungen, mit Kästchen zum Abhaken auf Papier.
  - **Als Text teilen:** System-Teilen-Dialog (Web Share API) für WhatsApp, Notizen-App, Google Keep usw. Die Aktion erscheint nur, wenn das Gerät Teilen unterstützt.
  - **Text kopieren:** Dieselbe Textliste in die Zwischenablage.
- Exportiert werden die offenen, also nicht abgehakten Einträge, in der Reihenfolge und Gruppierung der Seite. Jeder Eintrag erscheint mit Menge, Packungsbedarf und gegebenenfalls Zuständigkeit. Kopf: Listenname, Stand (Datum und Uhrzeit) und die Zahl der offenen Einträge.
- Export ist für alle möglich, die die Liste sehen dürfen: Besitzer, alle Mitgliederrollen und Gäste. Im Einkaufsmodus ist der Button ausgeblendet.
- Kein serverseitiges PDF. Alles läuft im Browser, ohne zusätzliche Backend-Last.
- Die bestehende Anforderung „Print View“ in `shopping-list-views` wird für das Food-Frontend konkretisiert.

## Capabilities

### New Capabilities
- `shopping-list-export`: Export der Einkaufsliste als Text zum Teilen und Kopieren, mit Inhalt, Format, Rechten und Fehlerverhalten.

### Modified Capabilities
- `shopping-list-views`: Die Anforderung „Print View“ wird konkretisiert: Einstieg über „Liste exportieren“, nur offene Einträge, Kopfzeile mit Stand, Mengenangaben, Zuständigkeit, zweispaltiges A4-Layout, Freizeilen für Ergänzungen.

## Impact

- **Frontend (nur `frontend-food/`):**
  - `src/pages/shopping/ShoppingListDetailPage.tsx`: Export-Button und Menü; Seiteninhalt beim Drucken ausblenden.
  - Neue Komponenten `src/components/shopping/ShoppingListExportMenu.tsx` und `src/components/shopping/ShoppingListPrintView.tsx`.
  - Neue reine Hilfsfunktion `src/lib/shoppingListExport.ts` (Textaufbau) mit Unit-Tests.
  - `src/lib/shoppingItemDisplay.ts`: gemeinsame Mengenbeschriftung für Zeile, Druck und Text.
- **Backend:** keine Änderung, keine betroffene Django-App, keine neuen Endpunkte.
- **Schemas:** keine Pydantic- oder Zod-Änderung, da die Detailantwort alle benötigten Felder enthält.
- **Migrationen:** keine.
- **Abhängigkeiten:** keine neuen Bibliotheken (Browser-Druck statt PDF-Bibliothek).
