## 1. Backend: Datenmodell & Migration

- [x] 1.1 Neues Feld `rewe_added_at` (nullable DateTimeField) auf `ShoppingListItem` in `backend/shopping/models.py` ergänzen
- [x] 1.2 Migration erzeugen und anwenden (`uv run manage.py makemigrations shopping`, `uv run manage.py migrate`)
- [x] 1.3 Neues Modell/Cache-Eintrag für Export-Token (Token-String, `shopping_list_id`, `user_id`, `expires_at`) in `backend/shopping/models.py` oder als Cache-basierte Lösung (z.B. Django Cache mit TTL) entwerfen und implementieren

## 2. Backend: Schemas

- [x] 2.1 Pydantic-Schema `ReweExportTokenResponse` (Token, Export-URL, Ablaufzeit) in `backend/shopping/schemas.py`
- [x] 2.2 Pydantic-Schema `ReweExportItem` (ingredient_name, nan_art_id_rewe, order_quantity, unit, already_added_at, matched: bool) in `backend/shopping/schemas.py`
- [x] 2.3 Pydantic-Schema `ReweExportListResponse` (Liste von `ReweExportItem`, shopping_list_id, shopping_list_name) in `backend/shopping/schemas.py`
- [x] 2.4 Pydantic-Schema `ReweReportRequest` (Liste erfolgreicher item_ids, Liste fehlgeschlagener item_ids mit Fehlergrund) in `backend/shopping/schemas.py`

## 3. Backend: API-Endpunkte

- [x] 3.1 `POST /api/shopping-lists/{id}/rewe-export-token` — erzeugt Token für authentifizierten Nutzer mit Zugriffsrecht auf die Liste (403 ohne Zugriffsrecht, 401 ohne Auth) in `backend/shopping/api.py`
- [x] 3.2 `GET /api/shopping-lists/rewe-export/{token}` — liefert `ReweExportListResponse` bei gültigem Token, 401 bei abgelaufenem/unbekanntem Token, in `backend/shopping/api.py`
- [x] 3.3 Mengenberechnung im Export-Endpoint: bestehende Rundungslogik (`supply/utils.py: build_package_display`, `get_shopping_portion`) wiederverwenden, um `order_quantity` zu bestimmen
- [x] 3.4 `POST /api/shopping-lists/rewe-export/{token}/report` — verarbeitet `ReweReportRequest`, setzt `rewe_added_at` für erfolgreiche Items, ignoriert Item-IDs außerhalb der referenzierten Liste, in `backend/shopping/api.py`
- [x] 3.5 Sicherstellen, dass kein Endpoint REWE-Zugangsdaten/Cookies entgegennimmt oder loggt

## 4. Backend: Tests

- [x] 4.1 Test: Token-Erzeugung erfolgreich für berechtigten Nutzer
- [x] 4.2 Test: Token-Erzeugung schlägt fehl (401 ohne Auth, 403 ohne Rolle)
- [x] 4.3 Test: Export-Endpoint liefert korrekte Artikel-Daten inkl. gerundeter Menge
- [x] 4.4 Test: Export-Endpoint mit abgelaufenem/ungültigem Token gibt 401
- [x] 4.5 Test: Artikel ohne `nan_art_id_rewe` wird als `matched=False` markiert
- [x] 4.6 Test: Report-Callback aktualisiert `rewe_added_at` korrekt
- [x] 4.7 Test: Report-Callback ignoriert Item-IDs fremder Listen

## 5. Frontend: UI-Komponente

- [x] 5.1 Neue Komponente "REWE-Export" in der Einkaufslisten-Detailansicht (Ort je nach bestehender Struktur: `frontend-food` oder `frontend`)
- [x] 5.2 TanStack-Query-Hook zur Token-Erzeugung (`useReweExportToken`)
- [x] 5.3 Anzeige des Bookmarklet-Links/Codes mit Kopier-Button und kurzer Anleitung ("Im REWE-Tab ausführen")
- [x] 5.4 Anzeige des Export-Status pro Artikel (bereits übertragen / nicht gematcht / offen) basierend auf bestehender Listendarstellung
- [x] 5.5 Zod-Schemas für `ReweExportItem`/`ReweExportListResponse` synchron zu den Backend-Pydantic-Schemas ergänzen

## 6. Bookmarklet-Implementierung

- [x] 6.1 Bookmarklet-JS erstellen: Token aus URL/Parameter lesen, `GET /api/shopping-lists/rewe-export/{token}` aufrufen
- [x] 6.2 Session-UUID-Ermittlung: `window.ReweBasket.listingIdToQuantityLookup` auslesen und UUID extrahieren
- [x] 6.3 Fallback für leeren Warenkorb: PDP per `fetch()` laden und `articleId`/UUID aus `pdpr-propstore`-Script-Tag parsen
- [x] 6.4 Matching-Logik implementieren: (a) vorhandenes `nan_art_id_rewe` direkt nutzen falls articleId bekannt, (b) sonst `GET /shop/api/products?search=...`, (c) sonst PDP-Fetch + propstore-Parsing
- [x] 6.5 `POST /shop/api/baskets/listings/{listingId}` pro Artikel mit 300-800ms Verzögerung zwischen Calls
- [x] 6.6 Fehlerbehandlung pro Artikel (Fehler anzeigen, Vorgang für restliche Artikel fortsetzen)
- [x] 6.7 Zusammenfassenden Report im Bookmarklet-UI (Popup/Overlay) anzeigen: X von Y erfolgreich, nicht gematchte Artikel mit Link zur manuellen REWE-Suche
- [x] 6.8 Nach Abschluss `POST /api/shopping-lists/rewe-export/{token}/report` an Inspi senden
- [x] 6.9 Bookmarklet-Code als statische Ressource/Dokumentation ablegen (Ort gemäß offener Frage in design.md klären)

## 7. Manuelles End-to-End-Testen

- [ ] 7.1 Mit echter, kleiner Testliste (1-2 günstige Artikel) im echten REWE-Konto durchtesten
- [ ] 7.2 Szenario leerer Warenkorb testen (PDP-Fallback für UUID)
- [ ] 7.3 Szenario nicht gematchter Artikel testen (kein `nan_art_id_rewe`)
- [ ] 7.4 Szenario abgelaufener Token testen
- [ ] 7.5 Doppel-Export testen (Artikel bereits übertragen, erneuter Lauf)
