---
type: index
title: "Fragenrunde 2 – 20 Vertiefungsfragen"
description: "Vertiefende Fragen an Daniel zu Sales, Bestand, Lieferanten, Kosten und Ads (Oktober 2026)."
tags: [offene-fragen, daniel]
status: draft
visibility: public
retrieved: 2026-10-10
---

# Fragenrunde 2 – 20 Vertiefungsfragen

## Kurzfassung

Zwanzig A/B/C-Fragen aus dem ersten Graph-Review. Teilweise durch die zwölf Geschäftsregel-Antworten in den Folgeantworten erledigt.

## Inhalt

- [A. Sales, Warenkorb und Nachfrageeffekte](#a-sales-warenkorb-und-nachfrageeffekte)
- [B. Bestand, Lieferanten und Bestellregeln](#b-bestand-lieferanten-und-bestellregeln)
- [C. Ads, Sortiment und Erfolgsmessung](#c-ads-sortiment-und-erfolgsmessung)

Diese Fragen bauen auf Daniels bereits beantworteten Strategiefragen auf. Sie fragen nicht erneut, ob Rübert Fehl- und Überbestand vermeiden, pro SKU planen, erst Bestellplanung stabilisieren und später Sortiments-/Ads-Funktionen ergänzen soll. Sie präzisieren, **welche Daten und Regeln dafür tatsächlich gelten**.

**Vorschlag für den Workshop:** zuerst 1–6 und 9–15 entscheiden. Fragen zu PostgreSQL-Feldern erst stellen, nachdem Daniel die Datenbasis geprüft hat; wenn das Feld im Schema klar ist, nicht noch einmal Daniel fragen.

## A. Sales, Warenkorb und Nachfrageeffekte

### 1. Welche Sales-Menge ist für Forecast und Bewertung maßgeblich?
- **A.** Bezahlte Bestellmenge zum Bestellzeitpunkt.
- **B.** Versandte/erfüllte Menge; Retouren und Stornos nachträglich abziehen.
- **C.** Netto-Sales nach Storno/Retouren, zusammen mit separaten Brutto- und Retourenwerten.

### 2. Wie soll ein Zeitraum mit null gemeldeten Sales interpretiert werden?
- **A.** Als echte Nullnachfrage, sofern der Artikel verfügbar war.
- **B.** Als unbekannt/zensiert, wenn Verfügbarkeit oder Listing-Status fehlt.
- **C.** AI soll Nullverkäufe mit Bestands-/Listingdaten klassifizieren und unsichere Fälle markieren.

### 3. Welche Informationen dürfen zur Erkennung von Kombi-/Cross-Sales genutzt werden?
- **A.** Nur bestätigte Set-Stücklisten und feste 3er-/5er-Bundle-Faktoren.
- **B.** Zusätzlich gemeinsame Warenkörbe/Auftragspositionen als statistische Beziehung.
- **C.** AI darf Warenkorb-Beziehungen vorschlagen; Daniel bestätigt wirtschaftlich relevante Beziehungen, bevor sie die Zielfunktion verändern.

### 4. Wie sollen Preisaktionen, Rabatte und Promotions im historischen Absatz behandelt werden?
- **A.** Sales unverändert als beobachtete Nachfrage verwenden.
- **B.** Promotions markieren und Forecast normalisieren, damit Aktionsspitzen nicht dauerhaft fortgeschrieben werden.
- **C.** Zwei Prognoseszenarien zeigen: mit und ohne vergleichbare Promotion.

### 5. Welche Art von Kannibalisierung ist für euch entscheidungsrelevant?
- **A.** Eigenmarke gegen Fremdmarke bei ähnlichen Sorten.
- **B.** Einzelartikel gegen Sets/Bundles und verwandte Artikel.
- **C.** Beides plus Kanalverschiebungen; AI zeigt Kandidaten, Daniel bestätigt die Beziehungen.

### 6. Ändert sich die Set-Zusammensetzung über die Zeit?
- **A.** Nein, Stücklisten sind stabil; die aktuelle Stückliste genügt.
- **B.** Ja, Änderungen sollen mit Gültigkeitsdatum historisiert werden.
- **C.** Unklar; AI soll Versionen aus Artikel-/Auftragsdaten erkennen und zur Bestätigung vorlegen.

## B. Bestand, Lieferanten und Bestellregeln

### 7. Welche Bestandszahl ist für eine Bestellentscheidung die verfügbare Menge?
- **A.** Physischer Lagerbestand.
- **B.** Verkaufbarer Bestand nach Abzug reservierter, gesperrter oder beschädigter Ware.
- **C.** Verkaufbarer Bestand plus bestätigte Zugänge, jeweils mit erwartetem Wareneingangstermin.

### 8. Wie sollen bereits bestellte, aber noch nicht eingetroffene Mengen berücksichtigt werden?
- **A.** Erst ab tatsächlichem Wareneingang als Bestand zählen.
- **B.** Ab bestätigtem Liefertermin in die Reichweiten-/Bestellrechnung einbeziehen.
- **C.** Als separates Szenario anzeigen und nur bei verlässlichem Lieferdatum berücksichtigen.

### 9. Was bedeutet das Fremdmarken-Abnahmeintervall in Vario genau?
- **A.** Mindestmenge je Position; größere Mengen sind frei wählbar.
- **B.** Bestellschritt/Vielfaches je Artikel; auch die Mindestmenge ist gesondert gepflegt.
- **C.** Feldbedeutung variiert; vor Empfehlungen pro Lieferant anhand von Felddefinitionen bestätigen.

### 10. Wie ist der Mindestbestellwert von 100 € je Lieferant zu prüfen?
- **A.** Nettowarenwert vor Versandkosten und Steuern.
- **B.** Bruttowarenwert inklusive Steuern, ohne Versand.
- **C.** Lieferantenabhängig; maßgeblich ist die Kondition im Lieferantenstamm.

### 11. Was tun, wenn der Bedarf eines Lieferanten unter 100 € liegt?
- **A.** Bestellung warten/bündeln, bis Bedarf oder Mindestwert erreicht ist.
- **B.** Trotzdem bestellen, wenn sonst Stockout-Risiko entsteht.
- **C.** Beide Kosten/Risiken zeigen und Daniel je Fall entscheiden lassen.

### 12. Wie soll Rübert mit unsicheren Lieferzeiten umgehen?
- **A.** Festen Lieferzeitwert aus Vario verwenden.
- **B.** Erwartungswert plus Puffer aus tatsächlicher Lieferzeit-Historie schätzen.
- **C.** Lieferzeitband (früh/typisch/spät) anzeigen und nach Risiko planen.

### 13. Wie soll die Zielfunktion den Fehlbestand bewerten?
- **A.** Entgangenen Deckungsbeitrag der betroffenen SKU schätzen.
- **B.** Zusätzlich verlorene Warenkörbe/Kombi-Sales und saisonale Dringlichkeit einbeziehen.
- **C.** Zusätzlich messbare Ranking-/Werbewirkung einbeziehen; unbelegte Effekte separat als Szenario statt als sichere Kosten führen.

### 14. Wie soll die Zielfunktion Überbestand bewerten?
- **A.** Lagerwert/Kapitalbindung als Näherung.
- **B.** Einkaufskosten plus Lagerdauer und MHD-/Abschreibungsrisiko.
- **C.** Vollständige lieferanten-/artikelbezogene Kosten, wenn Einkaufspreis, Lagerkosten und Abschriften verfügbar sind.

### 15. Wie soll die 60.000er-Eigenmarken-Tranche verteilt werden?
- **A.** Höchsten erwarteten Fehlbestands-/Deckungsbeitragsschutz priorisieren.
- **B.** Nachfrage und Mindestmengen möglichst proportional decken.
- **C.** Mehrere Szenarien nach Daniels Risiko-Gewichtung zeigen; er wählt die Tranche.

## C. Ads, Sortiment und Erfolgsmessung

### 16. Welche Werbedaten sollen Rübert mit Sales verbinden?
- **A.** Kampagnenkosten und Sales je Kanal/SKU.
- **B.** Zusätzlich Impressionen, Klicks, Conversions, Rabatte und Laufzeit.
- **C.** Alles Verfügbare; AI dokumentiert Lücken und trennt beobachtete Korrelation von inkrementeller Wirkung.

### 17. Welches Ads-Ziel soll bei Empfehlungen gelten?
- **A.** ROAS/Umsatz.
- **B.** Deckungsbeitrag nach Werbekosten.
- **C.** Inkrementeller Gewinn gegenüber einem belastbaren Ohne-Kampagne-Szenario.

### 18. Welche Guardrails soll Rübert für spätere Werbeempfehlungen einhalten?
- **A.** Nur Empfehlungen, keinerlei Änderungen an Kampagnen.
- **B.** Kampagnenentwürfe mit Budgetobergrenze und Daniels Freigabe.
- **C.** Später begrenzte automatische Änderungen, aber nur mit vorab festgelegten Budgets/Abbruchregeln.

### 19. Wie sollen Neuheiten ohne eigene Sales-Historie gestartet werden?
- **A.** Keine AI-Prognose bis ausreichend Artikelhistorie vorliegt.
- **B.** Vergleich mit bestätigten ähnlichen Sorten/Produktfamilien.
- **C.** AI schlägt Vergleichsartikel und Startprognose samt Unsicherheit vor; Daniel bestätigt nur relevante Fälle.

### 20. Welche Kennzahlen zeigen nach 6–12 Monaten, dass Rübert nützt?
- **A.** Weniger Stockout-Tage/verlorene Sales.
- **B.** Besserer Deckungsbeitrag bei weniger Überbestand/Kapitalbindung.
- **C.** Zielwerte für beides plus Forecast-Güte und eingesparte Planungszeit; Baselines vor Start festhalten.

## Offene Fragen

Siehe Fragen unten.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Fragenrunde 3](fragenrunde-3.md)
- [Folgeantworten Daniel](../sources/daniel-followup.md)
