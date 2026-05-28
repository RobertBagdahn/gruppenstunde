## 1. Dialog-UI umbauen

- [x] 1.1 "Gesamt"-Spalte entfernen, "pro Person"-Spalte zu "Neu" umbenennen
- [x] 1.2 "Alt"-Spalte hinzufügen: aktuellen `quantity + unit` aus `editItems` anzeigen (oder `—`)
- [x] 1.3 Checkbox pro Zeile hinzufügen (default: unchecked)
- [x] 1.4 "Alle auswählen / abwählen"-Toggle im Tabellen-Header
- [x] 1.5 Portionen-Hinweis ("Geschätzte Mengen für X Portionen") entfernen — nur "pro Person" anzeigen

## 2. State und Logik

- [x] 2.1 `useState<Set<number>>` für selektierte Item-IDs hinzufügen
- [x] 2.2 `handleApplyEstimate` nur für selektierte Items applizieren, `quantity_per_person` als neuen Wert setzen
- [x] 2.3 "Übernehmen"-Button disabled wenn keine Checkbox aktiv

## 3. Polish

- [x] 3.1 Visuelle Unterscheidung: geänderte Zeilen (Alt ≠ Neu) hervorheben
- [x] 3.2 Toast-Meldung anpassen: "X von Y Mengen übernommen"
