## Why

Wenn Rezept-Zutatenmengen auf andere Portionenzahlen skaliert werden, entstehen krumme Werte (z.B. 1,875 g Pfeffer). Aktuell werden diese ohne sinnvolle Rundung angezeigt, was die Lesbarkeit verschlechtert und unrealistische Genauigkeit suggeriert. Nutzer brauchen praxistaugliche, aufgerundete Mengenangaben.

## What Changes

- Neue Display-Formatierungsfunktion für Mengenangaben (g/kg, ml/l)
- Stufenweise Aufrundung je nach Mengengröße:
  - < 2: auf 0,1 aufrunden
  - 2–10: auf 1 aufrunden
  - 10–1000: auf 5 aufrunden
  - >= 1000: auf 100 aufrunden
- Automatischer Einheitenwechsel: g → kg ab 1000 g, ml → l ab 1000 ml
- Interne Berechnungen bleiben exakt, nur die Anzeige wird gerundet
- Gilt für Rezept-Zutatenliste und Einkaufsliste

## Capabilities

### New Capabilities
- `quantity-display-formatting`: Rundungs- und Einheitenwechsel-Logik für die Anzeige von Mengenangaben in g/kg und ml/l

### Modified Capabilities

## Impact

- **Frontend**: Rezept-Detail-Seite (Zutatenliste), Einkaufslisten-Anzeige — überall wo skalierte Mengen mit Einheit g/ml dargestellt werden
- **Backend**: Ggf. Einkaufslisten-API, falls die Formatierung serverseitig erfolgt
- **Schemas**: Keine Änderung an Pydantic/Zod-Schemas nötig (reine Darstellungslogik)
- **Migrations**: Keine
