## Context

`shopping_service` berechnet je Eintrag `total_quantity_g`, `net_quantity_g`, `reserve_quantity_g` und `package_surplus_g` in Gramm und rundet für die Anzeige. Das Frontend formatiert `package_surplus_g` immer als Gewicht (`formatPackageReserve`). Die Anzeige der Menge dagegen folgt der Einheit des Eintrags (g, ml, Stück). Überschuss und Menge werden aus unterschiedlich gerundeten Werten abgeleitet.

Die Kartenansicht der Planübersicht kombiniert `truncate` am Namen mit einem `shrink-0`-Badge; bei schmalen Karten bleibt für den Namen kaum Platz.

## Goals / Non-Goals

**Goals:**
- Manuelle Einträge sind löschbar.
- „Menge + Reserve = Packungsgröße“ gilt sichtbar und in derselben Einheit.
- Plannamen sind in der Übersicht immer erkennbar.
- Der vom Nutzer eingegebene Plan-Name wird nicht verändert.

**Non-Goals:**
- Keine Änderung der Reservefaktor-Logik (+10 %) oder der Packungsauswahl.
- Keine neue Aktion für Einträge aus Rezepten/Plänen (diese bleiben aus der Quelle erzeugt).

## Decisions

- **Löschen nur für manuelle Einträge.** Erkennbar am fehlenden Rezept-/Plan-Bezug (die Einträge in „Sonstiges“ ohne Quelle). Das Backend-Delete bleibt wie es ist (Recht: `_require_edit`). UI: Icon-Button mit `aria-label="Eintrag löschen"`, Undo-Toast statt Bestätigungsdialog (wenig Risiko, schneller).
- **Überschuss aus angezeigter Menge, im Frontend berechnet.** `formatItemPackageReserve` in `lib/shoppingItemDisplay.ts` rundet die Menge wie `formatShoppingAmount` (10-g-Schritte ab 100 g, 5-g-Schritte ab 50 g, 0,1 kg/l ab 1.000) und berechnet `Reserve = Anzahl × Packungsgröße − angezeigte Menge`. Alternative „Backend liefert `package_surplus_display`“ wurde verworfen: Die Rundung der Anzeige liegt ohnehin im Frontend, und das Backend liefert bereits `quantity`, `unit` und `package_options[].volume_ml`.
- **Reserve in der Einheit der Menge.** Bei `unit == 'ml'` wird die Reserve aus `volume_ml` berechnet und in ml/l angegeben. Fehlt `volume_ml`, entfällt die Reserve-Zeile statt einer falschen Einheit. Ohne Packungsoption bleibt der bisherige Gramm-Überschuss des Backends.
- **Karten-Layout.** Name bis zu zwei Zeilen (`line-clamp-2`), Badge unter dem Titel (eigene Zeile) bei Kartenbreite unter einem Schwellenwert; vollständiger Name zusätzlich als `title`.
- **Name beim Duplizieren.** Suffix nur als Vorbelegung des Eingabefelds, nie im Handler anhängen. Das Backend verändert den Namen nicht.
- **Lösch-Dialog mit Namen.** Der Dialog erhält den Plannamen als Parameter, Beschreibung „Essensplan „<Name>“ und alle zugehörigen …“.

- **Undo stellt neu an statt verzögert zu löschen.** Das `DELETE` läuft sofort, der Eintrag verschwindet vorher aus dem Query-Cache (`onMutate`, Rücksetzen bei Fehler). „Rückgängig“ legt ihn über `POST …/items/` mit Name, Menge, Einheit, Abteilung, Zutat, `sort_order` und `is_checked` neu an. Ein verzögertes Löschen hätte beim Verlassen der Seite oder für andere Mitglieder (WebSocket) einen unklaren Zwischenstand. Wer abgehakt hat, wird beim Wiederherstellen der wiederherstellenden Person zugeschrieben.
- **Zugriffsfehler.** `_require_owner` ruft zuerst `_require_access` auf: Ohne Zugriff 404 wie bei allen anderen Pfaden, Mitglieder ohne Besitz 403. Die Fetch-Helfer in `api/shoppingLists.ts` nutzen `fetchWithCsrf`/`parseApiResponse` und werfen damit `ApiError` mit dem deutschen `detail`.
- **WebSocket in Entwicklung und Produktion.** Dev: `manage.py runserver` ist durch `daphne` (erste App in `local.py`) ein ASGI-Server für `inspi.asgi` mit `InMemoryChannelLayer`; Vite leitet `/ws` mit `ws: true` an `:8000` weiter. Produktion bleibt unverändert: Cloud Run startet `gunicorn inspi.wsgi:application` (WSGI, kein WebSocket), und `nginx.conf.template` leitet nur `/api/` weiter. Der Hook gibt nach fünf Verbindungsversuchen auf; die Liste funktioniert ohne Live-Abgleich über REST. Live-Abgleich in Produktion bräuchte einen ASGI-Server, einen `/ws`-Proxy und Redis für `CHANNEL_LAYERS` und ist nicht Teil dieses Changes.

## Risks / Trade-offs

- [Rundung ändert angezeigte Reserve gegenüber heute] → Tests mit den Produktivtest-Werten (Zwiebel, Parmesan, Olivenöl); Reserve-Hilfetext bleibt gültig.
- [Dichte fehlt für ml-Umrechnung] → Reserve entfällt statt falscher Einheit; Datenlücke wird nicht verdeckt, taucht aber in der Datenqualität auf.
- [Versehentliches Löschen manueller Einträge] → Undo-Toast.

## Migration Plan

Keine Datenmigration. Einziges neues API-Feld ist das optionale Eingabefeld `is_checked` beim Anlegen eines Eintrags.

## Open Questions

Keine.
