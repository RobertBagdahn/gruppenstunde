# Bestandsaufnahme gegen den heutigen Look

Stand: 2026-10-21, Branch `feature/food-sticker`, vor jeder Umsetzung. Lauf: `npx playwright test --project=ui-mobile --project=ui-desktop -g "Prüfungen"` gegen `frontend-food` mit gemockten Daten (`e2e/fixtures/ui/`). Die Referenzbilder fehlen noch, sie entstehen erst im Container (Aufgabe 2.6). Deshalb ist „Referenz fehlt“ kein Befund über das Aussehen.

## Ergebnis je Seite

| Seite | Phone (390 px) | Desktop (1440 px) |
|---|---|---|
| Startseite | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Rezeptübersicht | 1× Tippfläche, 1× Referenz fehlt, 2 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Rezeptdetail | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Kochmodus | 1× Tippfläche, 1× Referenz fehlt, 2 ok | 1× Name-Mismatch, 1× Referenz fehlt, 1 ok |
| Rezept erstellen | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Name-Mismatch, 1× Referenz fehlt, 1 ok |
| Essenspläne | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Neuer Essensplan | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Essensplan | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Einkaufsliste | 1× Kontrast, 1× Tippfläche, 1× Referenz fehlt, 1 ok | 1× Kontrast, 1× Referenz fehlt, 1 ok |
| Zutat-Detail | 1× Tippfläche, 1× Referenz fehlt, 2 ok | 1× Name-Mismatch, 1× Referenz fehlt, 1 ok |
| Administration | 1× Kontrast, 1× Tippfläche, 1 ok | 1× Name-Mismatch, 1 ok |
| Datenqualität | 1× Kontrast, 1× Tippfläche, 1 ok | 1× Kontrast, 1 ok |
| Zutaten-Statistik | 1× Kontrast, 1× Tippfläche, 1 ok | 1× Kontrast, 1 ok |

Legende: **Kontrast** = axe `color-contrast` (serious). **Name-Mismatch** = axe `label-content-name-mismatch` (serious). **Tippfläche** = interaktives Element unter 44 × 44 px auf 390 px. **Referenz fehlt** = Screenshot-Vergleich ohne Referenzbild.

## Befunde, die der Umbau beheben muss

- **Kontrast** auf 9 bzw. 10 Seiten. Ursache: heutige Token (`--muted-foreground` auf Hintergründen, Hero-Band). Das Sticker-Token-Set (Aufgabe 3.1) muss das lösen.
- **Tippflächen** auf allen Phone-Seiten außer Kochmodus-Ansicht und Zutat-Detail: die Logo-Verknüpfung (36 px hoch), Chips und Filter-Knöpfe.
- **Name-Mismatch** auf Kochmodus, Rezept erstellen und Zutat-Detail (Desktop): Icon-Buttons, deren sichtbarer Text nicht im Namen steht.
- **Kochmodus ohne H1.** Der Test „loads with exactly one H1“ schlägt fehl (Spec „Eine H1 pro Seite“). Die Umsetzung in Aufgabe 6.6 muss einen Ablaufkopf mit H1 liefern.
- **Überlauf** ist auf allen 13 Seiten bei 320, 390 und 1440 px kein Befund.

## Abweichungen vom Register

- Die Smoke-Seiten (Administration, Datenqualität, Zutaten-Statistik) haben keine Screenshots, nur axe, Tippflächen und Überlauf.
- Die Kochmodus-Seite läuft über die Rezeptdetail-Route und öffnet sich per Klick auf „Kochen starten“ (auf dem Handy über „Weitere Aktionen“).
- Die Nutri-Score-E-Ausnahme (`axeExceptions`) ist noch nicht eingetragen. Sie wird mit dem Umbau nötig, sobald der Befund auf dem Badge sichtbar ist.
