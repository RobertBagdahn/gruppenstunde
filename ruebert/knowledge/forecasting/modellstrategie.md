---
type: concept
title: "Modellstrategie"
description: "Welche Prognosemodelle Flower-Demand nutzt, was Version 1 gelernt hat und wie Hierarchie, Treiber, Kaltstart und Fremdmarken behandelt werden."
tags: [prognose, modelle, lightgbm, ensemble, hierarchie]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [v1-datenbank-und-specs, chat-daniel]
---

# Modellstrategie

## Kurzfassung

Version 1 hat viele Modelle verglichen. Ergebnis: Bei über 60 % der Artikel gewann ein leicht
modifizierter Vorjahresabsatz (Chat 19.05.2026). Ein Median-Ensemble war am stabilsten, und die
Nebensaison hatte die größten prozentualen Fehler. Version 2 baut darauf auf, prognostiziert aber auf
bereinigter Nachfrage, nutzt Treiber und Ereignisse explizit, gleicht Artikel- und Gesamtebene
ab (Hierarchie) und liefert Quantile. Jedes Modell muss sich im Backtest gegen die Excel-Methode und
den Vorjahreswert beweisen.

## Inhalt

- [Was Version 1 gelernt hat](#was-version-1-gelernt-hat)
- [Modellfamilien in Version 2](#modellfamilien-in-version-2)
- [Hierarchie: Gesamt, Kategorie, Artikel](#hierarchie-gesamt-kategorie-artikel)
- [Treiber und Ereignisse](#treiber-und-ereignisse)
- [Sonderfälle](#sonderfälle)

## Was Version 1 gelernt hat

| Erkenntnis | Quelle |
|---|---|
| Vorjahresmodelle (SeasonalNaive, gedämpfter Drift) gewinnen oft | Chat 19.05.2026, v1-Spec `seasonal-naive-damped` |
| Median über alle Modelle (EnsembleMedian) ist sehr stabil | Chat 21.05.2026, v1-Spec `ensemble-median` |
| Globales LightGBM über alle Artikel bringt Verbesserung (CV-WAPE 0,352) | v1 `config.py` |
| Wachstum muss gedämpft werden: Drift-Faktor 1 + 0,4 × (YoY − 1), begrenzt auf [0,6; 1,4] | v1-Spec `asymmetric-drift-damping` |
| Ohne Obergrenzen schießen Prognosen hoch: Clamp gegen Max ±5 KW, Cap max(1,5 × Vorjahr; 25) | v1-Specs `forecast-clamp`, `forecast-plausibility-cap` |
| Training erst ab 2023, 2018–2022 ausgeschlossen, max. 156 Wochen | v1 `config.py` |
| CV mit h = 12 Wochen hat den Frühjahrs-Peak nicht abgedeckt; später 52 Wochen | v1-Specs `seasonal-cv-config`, `prognose-benchmark` |
| WAPE statt MAPE (MAPE explodiert bei kleinen Mengen) | v1-Spec `forecast-confidence` |
| Daniel fand die Prognose nach dem ML-Update „deutlich nach oben geschraubt“ | Chat 22.05.2026 |

Wahrscheinliche Ursache vieler v1-Probleme: Training auf nicht bereinigten Daten
([Befund Sammelbuchungen](../data/befund-sammelbuchungen-vor-2023.md)) und fehlende Zensur-Korrektur.

## Modellfamilien in Version 2

| Familie | Modelle | Rolle |
|---|---|---|
| Referenzen | Excel-Methode (Ø 12 Monate), SeasonalNaive | immer berechnet, Messlatte |
| Vorjahr mit Trend | SeasonalNaive mit gedämpftem Wachstum je Kategorie | robuste Basis, gut erklärbar |
| Statistisch | ETS/MSTL, Theta; Croston/IMAPA/TSB für sporadische Artikel | Saisonzerlegung, Fremdmarke |
| Global ML | LightGBM mit Quantil- oder Tweedie-Ziel über alle Artikel | Treiber, Ereignisse, Querlernen |
| Ensemble | gewichteter Median der Kandidaten, Gewichte aus Backtest je Segment | Standard-Prognose |
| Hochrechnung | Saisonfortschritt ([Nachsteuern](nachsteuern-in-der-saison.md)) | in der Saison |

Auswahl je Segment (Drehklasse × Saisonphase × Lebensalter) statt je Artikel, weil die Auswahl je
Artikel bei wenig Historie überanpasst. Plausibilitätsgrenzen aus v1 bleiben, werden aber als
eigener, sichtbarer Schritt gespeichert ([Erklärbarkeit](erklaerbarkeit.md)).

## Hierarchie: Gesamt, Kategorie, Artikel

Wachstum lässt sich auf Gesamt- und Kategorieebene stabiler schätzen als je Sorte. Vorgehen:

1. Gesamt- und Kategorienachfrage je Woche prognostizieren (mit Treibern).
2. Artikelanteile innerhalb der Kategorie prognostizieren (langsam veränderlich).
3. Abgleich (Reconciliation), sodass die Artikelsumme zur Kategorie passt.

So wird Daniels Problem „krasse Schwankungen“ in eine stabile Gesamtkurve und erklärbare Anteile zerlegt.

## Treiber und Ereignisse

| Treiber | Umsetzung | Status |
|---|---|---|
| Saison (KW, Ostern, Aussaatmonate aus Shop-Text) | Merkmale | Daten vorhanden |
| Lebensalter / Ranking-Aufbau | Wochen seit Erstanlage, Anlaufkurve | Erstelldatum vorhanden |
| Varianten-Listing, Layout, Bundles | Ereigniskalender | Daten fehlen ([Q-075](../open-questions/q-075-ereignisliste.md)) |
| Zensur, Nachwirkung Ausverkauf | Flags | aus Bestand |
| Preis, Aktionen | Merkmale | offen ([Q-016](../open-questions/q-016-preisaktionen.md)) |
| Werbung | Merkmal, später | offen ([Q-017](../open-questions/q-017-ads-steuerung.md)) |
| Wetter | später prüfen | offen ([Q-074](../open-questions/q-074-wetter-saisonstart.md)) |

## Sonderfälle

- **Neue Artikel (Kaltstart):** Analogie zu ähnlichen Sorten derselben Kategorie, skaliert mit
  Anlaufkurve; breite Quantile.
- **Sonderartikel:** eigene kurze Saison, Vorjahr plus Gesamttrend.
- **Fremdmarken:** viele Artikel mit seltenem Absatz → Croston-Familie und Bootstrap der
  Lieferzeit-Nachfrage; Horizont wenige Wochen.
- **Auslaufartikel:** keine Prognose für Bestellung, nur Abverkaufsverlauf.

## Offene Fragen

- [Q-009: Wie sieht die heutige Excel-Planung aus?](../open-questions/q-009-excel-prozess.md)
- [Q-012: Wie kommen neue Sorten ins Sortiment?](../open-questions/q-012-neue-sorten.md)
- [Q-067: Welche externen Faktoren meintest du?](../open-questions/q-067-externe-faktoren.md)
- [Q-073: Was treibt die Nebensaison?](../open-questions/q-073-nebensaison-treiber.md)
- [Q-076: Welche Horizonte brauchst du?](../open-questions/q-076-prognosehorizont.md)

## Verwandte Seiten

- [Kennzahlen und Bewertung](kennzahlen-und-bewertung.md)
- [Nachfrage statt Absatz](nachfrage-vs-absatz.md)
- [Saisonalität und Wachstum](../business/saisonalitaet-und-wachstum.md)
- [Learnings aus Version 1](../system-v1/learnings.md)
- [Prognose](index.md)
