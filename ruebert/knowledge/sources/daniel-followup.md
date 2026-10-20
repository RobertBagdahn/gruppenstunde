---
type: source
title: "Quelle: Folgeantworten von Daniel (Oktober 2026)"
description: "Daniels Antworten auf die Folgefragen vom 10.10.2026: Datenbasis, Bestellregeln, Strategie, Geschäftsregeln."
tags: [quelle, daniel, entscheidungen]
status: stable
visibility: public
retrieved: 2026-10-10
---

# Quelle: Folgeantworten von Daniel (Oktober 2026)

## Kurzfassung

Daniels Antworten aus den Rückfragerunden nach dem Signal-Export: Vario-Daten ab 01.09.2026, kuratierte PostgreSQL-Datenbasis, Bestellregeln Eigen-/Fremdmarke, Zielfunktion und zwölf Geschäftsregeln. Weitergegeben von Robert am 10.10.2026.

## Inhalt

- [Datenbestand und Datenquelle](#datenbestand-und-datenquelle)
- [Bestellregeln und Forecast](#bestellregeln-und-forecast)
- [Weitere Produkt-/Workflow-Antworten](#weitere-produkt-workflow-antworten)
- [Antworten auf die zehn Nachfrage-/Bestellfragen](#antworten-auf-die-zehn-nachfrage-bestellfragen)
- [Strategische Antworten auf die zehn Workshop-Fragen](#strategische-antworten-auf-die-zehn-workshop-fragen)
- [Antworten auf die zwölf Geschäftsregel-Fragen](#antworten-auf-die-zwölf-geschäftsregel-fragen)

**Quelle:** Antworten Daniels in dieser Unterhaltung; Folgeabgleich zum [Signal-Chat seed-demand](chat-daniel.md). Dies ist ein Entscheidungsnachtrag, keine wörtliche Signal-Chat-Transkription.

## Datenbestand und Datenquelle

- Historische Sales sind noch **nicht nach Vario migriert**. In Vario liegen bisher nur Neudaten ab `01.09.2026` (Daniel bestätigte: 01.09. = dieses Jahr).
- Die letzten zwei Jahre plus das aktuelle Jahr liegen bereits aufbereitet in einer PostgreSQL-Datenbank. Diese Datenbasis war für saisonale Ads vorgesehen.
- Die saubere Datenbasis enthält Sales pro Artikel und Verkaufskanal, wird laufend mit Vario aktualisiert und enthält sauber gepflegte Artikel-/Marken-/Lieferantenzuordnungen.
- Daniel bietet an, dass Rübert auf diese bestehende Datenbasis aufsetzt. Alternativ können die bestehenden Daten aktualisiert und eine eigene Vario-Anbindung für Rübert bereitgestellt werden.
- Für den schnellsten Start ist die bestehende kuratierte Datenbasis als lesende Quelle zu prüfen; damit ist kein eigener Vario-Connector nötig. Daniel prüft die Datenbasis später; Schema/Feldmapping und Zugriffsweg sind bis dahin offen.

## Bestellregeln und Forecast

- **Eigenmarke:** jährliche Großbestellung in 60.000er-Stufen, mindestens 5.000 je Sorte und etwa 12 Wochen Lieferzeit. Die Grundregeln bleiben unverändert. Unterjährige Eigenmarken-Nachbestellungen folgen denselben Mengenregeln.
- **Fremdmarke:** das Abnahmeintervall/MOQ ist in Vario direkt am Artikel hinterlegt. Der frühere pauschale Chat-Richtwert „5 Stück“ ist überholt und nicht allgemeingültig. Zusätzlich gilt ein Mindestbestellwert von **100 € je Lieferant**.
- **Rundung:** Rundungsschwelle auf den Rest innerhalb des nächsten 5.000er-Schritts anwenden. Beispiel: 20.207 wird bei einer 75%-Schwelle auf 20.000 abgerundet, weil der Rest 207 nur rund 4% des Schritts beträgt.
- **Bestandspuffer/Reserve:** 30 Stück als Mindestrestbestand für die Eigenmarke berücksichtigen; keine zusätzliche Standard-Prozentreserve.
- **Forecast:** zwei Jahre. Das Zieldatum für Bestellvorschläge soll frei wählbar sein.
- **Ampel:** Dringlichkeit nach der jeweiligen Lieferzeit bewerten. Lieferzeit soll nicht pauschal als 12 Wochen für Fremdmarken angenommen werden.
- **Sonderartikel:** DGW158, DGWADV und DGWADV2 laufen unabhängig von der regulären Eigenmarkenbestellung. DGW128 ist saisonal, gehört aber in die reguläre Eigenmarkenbestellung.
- **Forecast-Overrides:** Im ersten Umfang genügen Korrekturen der Bestellmengen; manuelle Forecast-Überschreibungen können zunächst zurückgestellt werden.

## Weitere Produkt-/Workflow-Antworten

- Sauber gepflegte Sales nach Artikel und Verkaufskanal sind verfügbar. Ob die Kanalaufteilung für Prognose/Entscheidungen tatsächlich Mehrwert bringt, soll die AI prüfen.
- Marken-/Lieferantenzuordnungen sind in der vorbereiteten Datenbasis gepflegt.
- Ältere Jahre nur nach AI-gestützter Prüfung/Backtests verwenden, da sich das Unternehmen stark entwickelt hat.
- Das bestehende Artikel-Cockpit soll weiter ausgebaut und optimiert werden.

## Antworten auf die zehn Nachfrage-/Bestellfragen

- **1B:** Die primäre Zielrichtung ist Verfügbarkeit bzw. Fehlbestand vermeiden.
- **2A:** Als direkte Fehlbestandskosten zunächst entgangene Sales der betroffenen SKU betrachten. **Abgleich offen:** frühere Antwort bat ausdrücklich auch um Kombi-/Cross-Sales und Ranking-Verlust als Kostenfaktoren; klären, ob 2A diese Faktoren ausschließt oder nur die direkt messbare Basis benennt.
- **4 „später“:** Kannibalisierungsanalyse zurückstellen.
- **5:** Für den Bestand den Wert aus dem externen System verwenden. Semantik (physisch, verfügbar/verkaufbar, reserviert, offene Zugänge) bleibt an dessen Felddefinition gebunden.
- **7A:** Set-Bedarf anhand der bestätigten Stückliste auf Komponenten umlegen.
- **8A:** 3er-/5er-Bundles als entsprechende Mengenabgänge des Basisartikels berücksichtigen.
- **10 „später“:** Werbe-KPI/Optimierung zurückstellen.
- Noch unbeantwortet sind Überbestandskosten, Sales-Mengendefinition und die Behandlung von Fremdmarkenbestellungen unter 100 € Mindestbestellwert; weitere Fragen stehen in [Runde 3](../open-questions/fragenrunde-3.md).

## Strategische Antworten auf die zehn Workshop-Fragen

- **Zielbild (1C):** Rübert soll Routine möglichst weit übernehmen und Daniel vor allem Ausnahmen zeigen.
- **Montagmorgen (2A):** Zuerst ein kurzer Überblick darüber, was dringend ist und was sich verändert hat.
- **Unterstützte Entscheidungen (3B+C):** Neben Bestellplanung auch Sortimentsentscheidungen und saisonale Werbung unterstützen.
- **Planungsebene (4A):** Primär pro Artikel/SKU planen.
- **Wachstum/Neuheiten (5C):** Topseller, Neuheiten und Nischenartikel mit getrennten Regeln behandeln.
- **Zielfunktion (6A, mit Ergänzung):** Übergeordnet Fehlbestand und Überbestand vermeiden. Dafür braucht Rübert eine belastbare Logik, welche Kosten höher sind. Zu den Kosten von Fehlbestand zählen mindestens entgangene Verkäufe, entgangene Kombi-/Cross-Sales und möglicher Ranking-Verlust; Überbestand hat eigene Kosten. Quantifizierung und Gewichtung sind noch offen.
- **Unsicherheit (7B):** Unsicherheit nicht pauschal überall alarmieren; nur hervorheben, wenn sie die Entscheidung oder das Risiko wesentlich verändert.
- **Widersprüchliche Signale (8C):** Konflikte sichtbar machen und mehrere Handlungsoptionen anbieten.
- **Lernen (9C):** Aus bestätigten Korrekturen und aus späteren Bestellungen/tatsächlichen Verkäufen lernen; nachvollziehbar ausweisen, was gelernt wurde.
- **Einführung (10A):** Schrittweise vorgehen: Bestellplanung stabilisieren, dann weitere Funktionen ergänzen.

## Antworten auf die zwölf Geschäftsregel-Fragen

1. **1A – Fremdmarke unter Mindestbestellwert:** warten und bündeln, bis 100 € erreicht sind. Der Mindestwert gilt **netto auf Einkaufspreis (EK)**.
2. **2C – Darstellung Fremdmarken:** Lieferantenübersicht mit Drill-down bis zum Artikel.
3. **3A – Mengenänderung:** nur neue Menge und Abweichung zum Vorschlag anzeigen.
4. **4A – Eigenmarken-Tranche:** feste Gesamtmenge, genau 60.000 Tüten je Tranche, mindestens 5.000 pro Sorte.
5. **5B – Überbestandskosten:** Kapital plus Lager und MHD-Risiko. Überschüssiger Bestand muss vor MHD entsorgt werden; zu kurze Resthaltbarkeit kommt bei Kunden schlecht an.
6. **6C – Fehlbestandskosten:** direkte entgangene Verkäufe, Kombi-Verkäufe und Amazon-Ranking voll einrechnen, sobald sie schätzbar sind. Damit ist der frühere Widerspruch (2A vs. Kombi/Ranking) aufgelöst.
7. **7A – Nachfragebasis:** bestellte Menge. Retouren und Stornos sind praktisch irrelevant.
8. **8A – Aktionen/Rabatte:** normal mitzählen, keine Bereinigung.
9. **9A – Neuheiten:** keine automatische Prognose; Daniel plant neue Artikel selbst.
10. **10A – Auslaufartikel:** ab Auslaufentscheidung nicht mehr nachbestellen.
11. **11C – Erfolgsmessung:** weniger Ausverkäufe/entgangene Verkäufe, weniger Überbestand/Kapitalbindung und weniger Zeitaufwand.
12. **12A – Guardrails:** keine harten Budget-/Mengengrenzen; Daniel prüft jede Bestellung.

## Offene Fragen

- Kostenzahlen: siehe [Workshop-Kostenmodell](../plan/workshop-kostenmodell.md)

## Verwandte Seiten

- [Quellen](index.md)
- [Chat mit Daniel](chat-daniel.md)
- [Vollständiger Signal-Export](../input/2026-10-10-signal-export-seed-demand.md)
- [Ansichten-Entscheidungen](../plan/ansichten-entscheidungen.md)
