## Why

Beim Einkauf am 16.10.2026 hat ein überlasteter Server die Anmeldeprüfung mit 429 abgewiesen. Die Einkaufsliste hat daraufhin „Melde dich an“ gezeigt, obwohl die Nutzer angemeldet waren. Die Abfragen wurden nicht wiederholt, weil die Wiederholung alle 4xx-Antworten ausschloss, und 429 ist eine 4xx-Antwort. Außerdem brachen Titel im Kopfband bei 320 px mitten im Wort um, und die Schriftgrößen-Tokens verschwanden, wenn eine Farbe danach kam. Die Specs beschreiben das heute nicht oder falsch (fünf statt sieben Schriftgrößen).

## What Changes

- Überlastung (429), Serverfehler (5xx) und Netzfehler bei Lesevorgängen werden automatisch bis zu zweimal mit Wartezeit wiederholt; ein `Retry-After` des Servers wird berücksichtigt. Andere 4xx-Antworten werden nicht wiederholt. Mutationen werden nie automatisch wiederholt.
- Die Anmeldeprüfung (`GET /api/auth/me/`) gilt bei nicht erreichbarer oder überlasteter Prüfung nicht als „abgemeldet“. Die Einkaufsseite zeigt „Anmeldung gerade nicht prüfbar“ mit „Erneut versuchen“.
- Die Schriftgrößen-Skala umfasst die sieben Tokens aus `tailwind.config.ts`; `cn()` behält Schriftgrößen-Tokens auch neben Farben.
- Der Titel im Kopfband der Einkaufsliste bricht bei schmalen Bildschirmen nicht mehr mitten im Wort; die Buttons rutschen darunter.

**BREAKING**: keine. Die Schriftgrößen-Skala wird korrigiert, nicht geändert; bereits verwendete Tokens bleiben.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `food-api-contracts`: automatische, begrenzte Wiederholung bei Überlastung und Serverfehlern für Lesevorgänge.
- `auth-session`: Anmeldeprüfung bei Überlastung ist keine Abmeldung.
- `food-design-system`: sieben Schriftgrößen-Tokens; Tokens bleiben in `cn()` erhalten.
- `shopping-list-views`: Kopfband der Einkaufsliste auf schmalen Bildschirmen.

## Impact

- Frontend (`frontend-food/`): `src/lib/queryRetry.ts` (neu), `src/main.tsx`, `src/api/auth.ts`, `src/lib/utils.ts`, `src/pages/shopping/ShoppingListDetailPage.tsx`.
- Tests: `src/lib/queryRetry.test.ts`, `src/lib/utils.test.ts`, `src/pages/shopping/ShoppingListDetailPage.test.tsx`, `e2e/shopping-list-search.spec.ts`.
- Backend: keine Änderung. Die Wiederholung wirkt nur auf den Client und erhöht die Last nur kurz (höchstens drei Versuche je Abfrage, Abstand 1 s bis 8 s).
- Schemas: keine Änderung.
