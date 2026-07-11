## Why

Nutzer pflegen Einkaufslisten (`shopping` App) mit Mengenangaben pro Zutat, müssen die Artikel aber danach manuell im REWE Onlineshop suchen und einzeln in den Warenkorb legen. Viele `Ingredient`-Datensätze haben bereits ein `nan_art_id_rewe`-Feld gepflegt. Ziel ist es, diesen manuellen Schritt zu automatisieren: Ein im REWE-Tab ausgeführtes Bookmarklet holt sich die aktuelle Einkaufsliste von Inspi und legt die gematchten Artikel automatisch in den REWE-Warenkorb.

Da REWEs Warenkorb-API nicht offiziell/öffentlich dokumentiert ist, läuft die Automatisierung bewusst client-seitig im Browser des Nutzers (Bookmarklet im offenen REWE-Tab), nicht server-seitig aus dem Inspi-Backend heraus. Das Backend liefert nur die Daten (Liste + Mapping), niemals REWE-Zugangsdaten oder REWE-Requests selbst.

## What Changes

- Neuer Export-Endpoint in der `shopping` App, der für eine Einkaufsliste einen kurzlebigen, personengebundenen Token erzeugt und darüber eine kompakte Artikel-Liste (Ingredient-Name, `nan_art_id_rewe`, `quantity_g`/`unit`, gerundete Bestellmenge) ausliefert.
- Neues UI-Element in der Einkaufslisten-Ansicht ("REWE-Export"), das den Bookmarklet-Code/-Link bereitstellt und pro Liste einen frischen Token-Link generiert.
- Neues `rewe_export_token` Datenmodell (oder Cache-Eintrag) mit kurzer Gültigkeit (z.B. 5 Minuten), gebunden an Nutzer + Einkaufsliste.
- Neues Status-Feld pro `ShoppingListItem` (`rewe_added_at` o.ä.), das markiert, welche Artikel bereits erfolgreich in einen REWE-Warenkorb übertragen wurden (Rückmeldung erfolgt clientseitig durch das Bookmarklet über einen Report-Callback-Endpoint).
- Neuer Report-Callback-Endpoint, über den das Bookmarklet nach Abschluss meldet, welche Artikel erfolgreich/fehlgeschlagen waren.
- Bookmarklet-Code (JS, außerhalb des Django/React-Build, z.B. als statische Datei/Dokumentation) mit der Logik: Token-Fetch → Basket-State auslesen (`window.ReweBasket.listingIdToQuantityLookup`) → Session-UUID extrahieren → pro Artikel articleId auflösen (Mapping → Live-Suche → PDP-Fallback) → `POST /shop/api/baskets/listings/{listingId}` mit Verzögerung zwischen Calls → Report an Inspi.
- **BREAKING**: Keine. Rein additive Funktionalität, bestehende Einkaufslisten-Flows bleiben unverändert.

## Capabilities

### New Capabilities
- `rewe-basket-export`: Client-seitige Übertragung von Einkaufslisten-Artikeln in den REWE-Onlineshop-Warenkorb via Bookmarklet, inkl. kurzlebigem Export-Token, Artikel-Export-Endpoint, Ergebnis-Report-Endpoint und Export-Status pro Einkaufslisten-Artikel.

### Modified Capabilities
<!-- Keine bestehenden Requirements aendern sich; das neue Status-Feld auf ShoppingListItem ist Teil der neuen rewe-basket-export Capability, nicht der bestehenden shopping-list Requirements (display_quantity, natural_portions bleiben unveraendert). -->
- Keine.

## Impact

- **Backend (`backend/shopping`)**: neue API-Routen in `api.py` (Token-Erzeugung, Artikel-Export, Report-Callback), neues Token-Modell/Cache-Eintrag in `models.py`, neue Pydantic-Schemas in `schemas.py`, Migration für neues Status-Feld auf `ShoppingListItem`.
- **Backend (`backend/supply`)**: keine Modelländerung, aber Lesezugriff auf `Ingredient.nan_art_id_rewe` und bestehende Portions-/Rundungslogik (`supply/utils.py`, `supply/services/shopping_service.py`) für Mengenumrechnung.
- **Frontend (`frontend-food` oder `frontend`, je nachdem wo Einkaufslisten-UI liegt)**: neue Komponente/Button "REWE-Export" in der Einkaufslisten-Detailansicht, neuer TanStack-Query-Hook für Token-Erzeugung, Anzeige des Export-Status pro Artikel.
- **Neue statische Ressource**: Bookmarklet-JS-Datei/Dokumentation (kein Teil des React-Builds), enthält die gesamte REWE-Interaktionslogik.
- **Keine Migration von Zugangsdaten**: REWE-Session/-Cookies verlassen nie den Browser des Nutzers; Inspi-Backend hat keinen Zugriff auf REWE-Konten.
