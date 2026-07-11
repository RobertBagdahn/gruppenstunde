## Context

Nutzer pflegen Einkaufslisten im `shopping`-Modul (WebSocket-basiert, rollenbasierter Zugriff Owner/Admin/Editor/Viewer). Viele `Ingredient`-Datensätze haben bereits `nan_art_id_rewe` gepflegt (siehe `backend/data/food/supply_ingredient.json`). REWEs Warenkorb-API (`shop.rewe.de` / `www.rewe.de/shop/api/...`) ist nicht öffentlich dokumentiert; Reverse-Engineering (siehe Recherche in dieser Change-Session) hat ergeben:

- Ein Artikel wird per `POST /shop/api/baskets/listings/{listingId}` hinzugefügt, wobei `listingId` die Form `{menge}-{articleId}-{sessionUuid}` hat.
- `articleId` ist marktabhängig und unterscheidet sich vom `nan` (Inspi-ID). Die Auflösung passiert serverseitig beim Rendern der Produktdetailseite (PDP) und ist im eingebetteten `<script id="pdpr-propstore...">`-JSON enthalten (`productData.articleId`). Es gibt keinen separaten REST-Resolver-Endpoint.
- Die für einen Warenkorb gültige `sessionUuid` lässt sich direkt aus `window.ReweBasket.listingIdToQuantityLookup` auf der Basket-Seite auslesen (Keys enthalten die UUID), sofern der Warenkorb mindestens einen Artikel enthält. Ist der Warenkorb leer, muss die UUID stattdessen aus einer frisch geladenen PDP gezogen werden.
- Da diese API nicht für Drittanbieter-Automatisierung vorgesehen ist, läuft die gesamte REWE-Interaktion bewusst **client-seitig im Browser des Nutzers** (Bookmarklet, ausgeführt im REWE-Tab), niemals server-seitig aus Inspi heraus. Inspi verarbeitet oder speichert keine REWE-Zugangsdaten.

## Goals / Non-Goals

**Goals:**
- Ein Klick im offenen REWE-Tab (Bookmarklet) überträgt alle gematchten Artikel einer Inspi-Einkaufsliste automatisiert in den REWE-Warenkorb.
- Inspi liefert nur Daten (Artikel-Liste, Mapping, Status), REWE-Requests werden ausschließlich im Browser des Nutzers mit dessen eigener Session ausgeführt.
- Nicht gematchte Artikel (kein `nan_art_id_rewe`) werden klar kommuniziert, ohne den restlichen Vorgang zu blockieren.
- Doppeltes Hinzufügen wird durch persistenten Export-Status pro Artikel vermieden (Anzeige, kein Hard-Block).

**Non-Goals:**
- Kein automatischer Checkout, keine Liefertermin-/Timeslot-Auswahl.
- Keine serverseitige Speicherung von REWE-Zugangsdaten, Cookies oder Sessions.
- Keine Live-Produktsuche/PDP-Fetching im Inspi-Backend (das passiert ausschließlich client-seitig im Bookmarklet gegen `rewe.de`, nicht gegen Inspi).
- Keine Unterstützung für andere Lieferdienste als REWE in diesem Change.
- Keine Chrome-Extension-Distribution (Bookmarklet-Ansatz reicht für den aktuellen Scope).

## Decisions

### 1. Bookmarklet statt Chrome Extension
Ein Bookmarklet wird im REWE-Tab ausgeführt und holt sich die Liste per `fetch()` von Inspi. Das ist einfacher zu bauen und zu verteilen als eine Extension, erfordert aber, dass der Nutzer den Vorgang manuell im REWE-Tab anstößt (kein automatisches Tab-Fokussieren von Inspi aus möglich). Für den aktuellen Scope (Einzelnutzer/kleine Gruppe) ist das akzeptabel.
*Alternative verworfen*: Chrome Extension mit Content Script + Background Worker hätte automatisches Tab-Ansprechen von Inspi aus ermöglicht, aber deutlich mehr Erstaufwand (Manifest, Build, Distribution) für den aktuellen Bedarf.

### 2. Kurzlebiger Export-Token statt statischem API-Key
Das Bookmarklet authentifiziert sich mit einem serverseitig erzeugten, ca. 5 Minuten gültigen Token (kein Klartext-API-Key im Bookmarklet-Code). Reduziert das Risiko bei Kompromittierung des Bookmarklet-Codes (z.B. wenn er in einer öffentlichen Lesezeichenleiste sichtbar wird).
*Alternative verworfen*: Statischer, einmalig erzeugter API-Key direkt im Bookmarklet-Code — einfacher, aber dauerhaft gültig und im Klartext exponiert.

### 3. Hybrid-Matching für `articleId`
Reihenfolge: (a) gepflegtes `nan_art_id_rewe`-Mapping, (b) Live-Suche über `/shop/api/products?search=...` im Bookmarklet, (c) Fallback: PDP-Fetch + `propstore`-Parsing. Alle drei Schritte laufen im Bookmarklet gegen `rewe.de`, Inspi liefert nur den `nan`.
*Alternative verworfen*: Nur gepflegtes Mapping — würde bei fehlendem/veraltetem Mapping ganz ausfallen, ohne Fallback-Chance.

### 4. Session-UUID aus bestehendem Basket-State, kein separater Endpoint
Das Bookmarklet liest `window.ReweBasket.listingIdToQuantityLookup` auf der Basket-Seite, statt einen (nicht öffentlich dokumentierten) `GET /shop/api/baskets/{basketId}` aufzurufen, für den man ohnehin zuerst die `basketId` bräuchte. Das ist robuster, da direkt im DOM des offenen Tabs verfügbar.
*Fallback*: Ist der Warenkorb leer, lädt das Bookmarklet kurz eine beliebige PDP per `fetch()` und zieht die UUID aus dem propstore.

### 5. Additive Datenmodell-Änderung statt Modifikation bestehender Requirements
Das neue Export-Status-Feld auf `ShoppingListItem` wird als rein additive Erweiterung behandelt (kein Eingriff in bestehende `display_quantity`/`natural_portions`-Requirements der `shopping-list`-Capability). Migration fügt ein nullable Feld (z.B. `rewe_added_at: DateTimeField(null=True, blank=True)`) hinzu.

### 6. Rate-Limiting im Client, nicht im Backend
Die künstliche Verzögerung zwischen `POST /shop/api/baskets/listings/{listingId}`-Calls (ca. 300-800ms) wird im Bookmarklet implementiert, da diese Calls nie durch das Inspi-Backend laufen.

## Risks / Trade-offs

- **[Risiko] REWE erkennt automatisierte Requests als Bot-Verhalten und blockt/rate-limitet die Session.** → Mitigation: Verzögerung zwischen Calls, Nutzung der echten Browser-Session/Cookies (kein separater HTTP-Client), Scope bewusst auf geringes Volumen (private/kleine Gruppen-Nutzung) beschränkt.
- **[Risiko] REWE ändert intern die Struktur von `listingId`, `propstore` oder Basket-State ohne Vorankündigung (undokumentierte API).** → Mitigation: Bookmarklet-Logik in einer einzelnen, leicht austauschbaren JS-Datei kapseln; Fehler pro Artikel granular anzeigen statt Gesamtabbruch, damit Teilausfälle sichtbar und einzeln behebbar sind.
- **[Risiko] Export-Token wird abgefangen (z.B. über Browser-History/Logs) und missbraucht.** → Mitigation: Kurze Gültigkeit (5 Min), Token ist nur lesend und auf eine einzelne Einkaufsliste beschränkt, kein Zugriff auf andere Inspi-Daten oder REWE-Zugangsdaten.
- **[Trade-off] Bookmarklet erfordert manuellen Trigger im REWE-Tab statt nahtlosem Ein-Klick-Erlebnis von Inspi aus.** → Akzeptiert für aktuellen Scope; spätere Migration zu einer Extension ist möglich, ohne dass sich die Backend-Endpoints ändern müssen.
- **[Risiko] Falsches Produkt-Matching (Live-Suche liefert falschen Treffer) führt zu falschem Artikel im Warenkorb.** → Mitigation: Bevorzugung des gepflegten Mappings vor Live-Suche; Report-Callback protokolliert, welcher Match-Weg genutzt wurde, um spätere Mapping-Pflege zu erleichtern.

## Migration Plan

1. Backend: Migration für neues `rewe_added_at`-Feld auf `ShoppingListItem` (nullable, keine Datenmigration nötig).
2. Backend: Neue Endpoints (Token-Erzeugung, Artikel-Export, Report-Callback) additiv hinzufügen, keine bestehenden Routen ändern.
3. Frontend: Neue UI-Komponente in der Einkaufslisten-Detailansicht ergänzen (kein Eingriff in bestehende Views).
4. Bookmarklet-Code als statische Dokumentation/Datei bereitstellen (kein Deployment-Schritt im klassischen Sinn).
5. Rollback: Da rein additiv, genügt das Deaktivieren/Entfernen der neuen UI-Komponente und Endpoints; das nullable DB-Feld kann unangetastet bleiben oder in einer Folge-Migration entfernt werden.

## Open Questions

- Genaues Format und Ablageort des Bookmarklet-Codes (z.B. `backend/static/` vs. Dokumentationsseite im Frontend).
- Ob der Report-Callback zusätzlich den genutzten Match-Weg (Mapping/Suche/PDP-Fallback) persistieren soll, um `nan_art_id_rewe`-Mappings später automatisiert zu vervollständigen.
- Rollenbeschränkung: Soll der REWE-Export für alle Rollen (Owner/Admin/Editor/Viewer) einer Einkaufsliste verfügbar sein, oder nur ab einer bestimmten Rolle?
