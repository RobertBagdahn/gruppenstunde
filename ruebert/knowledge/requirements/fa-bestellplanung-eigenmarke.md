---
type: requirements
title: "Anforderungen Bestellplanung Eigenmarke"
description: "Fachliche Anforderungen an den Bestellplaner für die Großbestellung der Eigenmarke: Zieltermin, Raster, Rundung, Risiko, Budget, Szenarien und Freigabe."
tags: [anforderungen, bestellplaner, eigenmarke]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs]
---

# Anforderungen Bestellplanung Eigenmarke

## Kurzfassung

Der Bestellplaner unterstützt die Jahresplanung der Eigenmarke (Variante 4). Er berechnet je
Sorte eine zulässige Bestellmenge im 5.000er-Raster bis zu einem frei wählbaren Zieltermin, zeigt
Ausverkaufsrisiko und Restbestand je Menge, warnt bei Überbestand und Budgetüberschreitung, lässt
Daniel Mengen anpassen und Szenarien vergleichen und erzeugt nach Freigabe einen Bestellentwurf im
ERP. Zwei Fehler aus v1 (unzulässige Menge 6.000, falsche Rundungsbasis) werden durch Tests
ausgeschlossen.

## Inhalt

- [Berechnung](#berechnung)
- [Risiko und Grenzen](#risiko-und-grenzen)
- [Bedienung und Ablauf](#bedienung-und-ablauf)
- [Abnahmekriterien](#abnahmekriterien)

## Berechnung

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| BEM-01 | Zieltermin „Bestand soll reichen bis“ frei als KW/Jahr wählbar, mindestens bis 30 Monate in die Zukunft | Muss | Chat 19.05. (KW 39/2027) | bestätigt |
| BEM-02 | Netto-Bedarf = Nachfrage (gewähltes Quantil) bis Zieltermin + Puffer − verfügbarer Bestand − Zulauf | Muss | v1:`order-demand-calculation`, Chat 17.05. | erweitert |
| BEM-03 | Nur zulässige Mengen: 0 oder Vielfache von 5.000 ab 5.000 (Raster und Mindestmenge konfigurierbar) | Muss | Chat 19.05. (DGW097) | bestätigt |
| BEM-04 | Schwellenrundung bezieht sich auf den angebrochenen 5.000er-Schritt (20.207 → 20.000 bei Schwelle 80 %) | Muss | Chat 22.05. | bestätigt, Standardwert offen ([Q-050](../open-questions/q-050-rundungsregel.md)) |
| BEM-05 | Risikomodus: Menge mit geringsten erwarteten Kosten aus Servicegrad bzw. Cu/Co; einfacher Modus mit Reserve-% wie v1 | Muss | Chat 19.05., 20.05. | offen ([Q-051](../open-questions/q-051-reserve-servicegrad.md)) |
| BEM-06 | Lieferzeit 12 Wochen berücksichtigen: Warnung, wenn Bestand nicht bis zum Wareneingang reicht | Muss | v1 `Project.md` | abgeleitet |
| BEM-07 | Offene Bestellungen (Zulauf) aus dem ERP einbeziehen | Muss | abgeleitet | offen ([Q-055](../open-questions/q-055-zulauf.md)) |
| BEM-08 | Sets ausblenden (über Komponenten geplant); Filter Kategorie, Marke, Drehklasse | Muss | v1:`order-filters`, v1:`weekly-set-decomposition` | übernommen |

## Risiko und Grenzen

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| BEM-09 | Je Artikel und Nachbarmenge: Ausverkaufswahrscheinlichkeit bis Zieltermin, erwartete Fehlmenge, erwarteter Rest nach 2,5 Jahren | Muss | Chat 19.05. | abgeleitet |
| BEM-10 | Überbestandswarnung: Menge ≥ Verkauf der letzten 2,5 Jahre oder ≥ Prognose der nächsten 2,5 Jahre; Cap auf Prognose 2,5 Jahre optional | Muss | v1:`order-overstock-warning`, v1:`forecast-cap` | übernommen |
| BEM-11 | Allokation auf 60k-Stufen: Die Summe muss exakt ein Vielfaches von 60.000 sein; die Rastermengen werden nach Grenznutzen auf die gewählte Stufe erhöht oder gekürzt, beide Nachbarstufen sind vergleichbar; jede Änderung gegenüber dem Bedarfsvorschlag ist je Artikel sichtbar | Muss | Chat 16.05., [Q-044](../open-questions/q-044-60k-stufe.md) | bestätigt |
| BEM-22 | Budget (Tüten oder €) mit Warnung und Priorisierungsvorschlag nach Grenznutzen, keine stille Kürzung | Soll | Chat 20.05. | offen ([Q-006](../open-questions/q-006-budget-grenze.md)) |
| BEM-12 | Strategie-Voreinstellungen (Überbestände reduzieren, Ausgewogen, OOS-Vermeidung) als Servicegrad-Presets | Soll | v1:`order-strategies` | übernommen |
| BEM-13 | Optionale Saisongewichtung für die Hauptsaison | Kann | v1:`peak-season-weighting` | übernommen, auf Prüfung |

## Bedienung und Ablauf

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| BEM-14 | Mengen interaktiv ändern; Risiko, Reichweite, Summe und Budget aktualisieren sofort | Muss | v1:`order-optimization` | übernommen |
| BEM-15 | Begründung je Position („warum diese Menge“) mit Link zur Artikelerklärung | Muss | Chat 20.05. (DGW042) | abgeleitet |
| BEM-16 | Szenarien speichern (im Journal), benennen, nebeneinander vergleichen; Excel-Planung importieren und vergleichen | Muss | Chat 19.05., 20.05. | bestätigt |
| BEM-17 | Suche nach Artikeln | Muss | Chat 21.05. | übernommen |
| BEM-18 | Freigabe-Workflow: Entwurf → geprüft → freigegeben → im ERP angelegt (mit ERP-Nummer) | Muss | Chat 09.10. | offen ([Q-056](../open-questions/q-056-freigabe-ablauf.md)) |
| BEM-19 | Export als CSV und Excel | Soll | v1:`order-optimization` | übernommen |
| BEM-20 | Unterjährige Nachbestellung mit eigenen Konditionen planen | Soll | v1 `Project.md` | offen ([Q-046](../open-questions/q-046-nachbestellung.md)) |
| BEM-21 | Szenario friert den Prognosestand ein; Hinweis, wenn eine neuere Prognose stark abweicht | Soll | abgeleitet | abgeleitet |

## Abnahmekriterien

- Bedarf 18.000, Schwelle 50 % → Vorschlag 20.000; nie 6.000 (Fall DGW097).
- Bedarf 20.207, Schwelle 80 % → 20.000 (Fall aus Chat 22.05.2026).
- Bedarf 3.100 → 0 oder 5.000, nie 3.100; bei 5.000 mit Überbestandsprüfung.
- Reserve 0 % und Zieltermin KW 39/2027 reproduzieren Daniels Vergleich vom Mai 2026 im einfachen Modus.
- Jede Position hat eine Begründung; DGW042 und DGW054 sind als Testfälle hinterlegt.
- Die Summe der Bestellung ist exakt 60.000, 120.000, 180.000 … Tüten; jede Sorte bleibt im 5.000er-Raster.

## Offene Fragen

- [Q-003: Wann ist die nächste Großbestellung?](../open-questions/q-003-naechste-grossbestellung.md)
- [Q-044: Was bedeutet die 60k-Stufe genau?](../open-questions/q-044-60k-stufe.md)
- [Q-045: Gilt das 5.000er-Raster überall?](../open-questions/q-045-raster-mindestmenge.md)
- [Q-049: Wie wählst du den Zieltermin?](../open-questions/q-049-zieltermin-regel.md)
- [Q-050: Bestätigst du die Rundungsregel?](../open-questions/q-050-rundungsregel.md)
- [Q-052: Wie mit Artikeln auf der Kippe umgehen?](../open-questions/q-052-grenzartikel.md)

## Verwandte Seiten

- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
- [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)
- [Anforderungen ERP-Integration](fa-erp-integration.md)
- [Zielkonflikt Ausverkauf vs. Überbestand](../business/zielkonflikt-ausverkauf-ueberbestand.md)
- [Anforderungen](index.md)
