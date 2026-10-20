---
type: concept
title: "Einkauf Fremdmarke"
description: "Was über den kurzfristigen Einkauf von Fremdmarken bekannt ist und was für Bestellvorschläge noch fehlt."
tags: [einkauf, fremdmarke, lieferanten]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Einkauf Fremdmarke

## Kurzfassung

Fremdmarken (Saatgut anderer Hersteller sowie Anzucht & Zubehör) machen rund 16 % des Umsatzes
aus. Sie haben eine Mindestabnahme von 5 und nur ein bis zwei Wochen Lieferzeit (Chat 17.05.2026)
und werden deshalb kurzfristig geplant. Daniel will für sie eine solide Prognose und Bestellplanung
mit Bestellungen direkt im ERP (Chat 09.10.2026). Bisher liegen keine Fremdmarken-Daten vor; fast
alle Details sind offen.

## Inhalt

- [Bekannt](#bekannt)
- [Unterschied zur Eigenmarke](#unterschied-zur-eigenmarke)
- [Was für Bestellvorschläge fehlt](#was-für-bestellvorschläge-fehlt)

## Bekannt

| Fakt | Quelle |
|---|---|
| Mindestabnahme 5 | Chat 17.05.2026 |
| Lieferzeit 1–2 Wochen | Chat 17.05.2026 |
| Anzucht & Zubehör ist komplett Fremdmarke | Chat 17.05.2026 |
| Planung „eher kurzfristig“ | Chat 09.10.2026 |
| Hersteller u. a. Kiepenkerl, SPERLI, Quedlinburger, Dürr Samen, Pabst Keimkraft, Romberg, Grüne Fee | v1 `Project.md` |
| Daten bisher nicht exportiert (nur `DGW`-Artikel) | Chat 17.05.2026 |

## Unterschied zur Eigenmarke

| Merkmal | Eigenmarke | Fremdmarke |
|---|---|---|
| Planungsart | Jahresplanung, Horizont > 1 Jahr | laufend, Horizont wenige Wochen |
| Mindestmenge | 5.000 Tüten pro Sorte | 5 (Einheit offen) |
| Lieferzeit | ca. 12 Wochen | 1–2 Wochen |
| Fehlerkosten | hoch (Paletten, MHD, Saison verpasst) | niedrig, Fehler schnell korrigierbar |
| Passende Logik | Netto-Bedarf bis Zieltermin, Raster-Rundung | Bestellpunkt mit Sicherheitsbestand ([Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)) |
| Anzahl Artikel | ca. 190 | vermutlich deutlich mehr, viele mit wenig Absatz |

Bei vielen Artikeln mit seltenem Absatz sind einfache, robuste Verfahren für sporadische
Nachfrage besser geeignet als komplexe Modelle ([Modellstrategie](../forecasting/modellstrategie.md)).

## Was für Bestellvorschläge fehlt

- Lieferantenliste und Zuordnung Artikel → Lieferant ([Q-059](../open-questions/q-059-fremd-lieferanten.md))
- Konditionen je Lieferant: Lieferzeit, Mindestbestellwert, Bestelltage ([Q-060](../open-questions/q-060-fremd-konditionen.md))
- Heutiger Bestellrhythmus ([Q-061](../open-questions/q-061-fremd-rhythmus.md))
- Vororders vor der Saison ([Q-062](../open-questions/q-062-fremd-vororder.md))
- Scope: nur Saatgut oder auch Zubehör ([Q-064](../open-questions/q-064-fremd-scope.md))
- Verpackungseinheiten ([Q-065](../open-questions/q-065-fremd-verpackungseinheit.md))

## Offene Fragen

- [Q-059: Welche Fremdmarken-Lieferanten gibt es?](../open-questions/q-059-fremd-lieferanten.md)
- [Q-060: Welche Konditionen gelten je Lieferant?](../open-questions/q-060-fremd-konditionen.md)
- [Q-061: Wie wird heute Fremdmarke bestellt?](../open-questions/q-061-fremd-rhythmus.md)
- [Q-063: Sind Fremdmarken immer lieferbar?](../open-questions/q-063-fremd-lieferfaehigkeit.md)
- [Q-066: Wie gehen Fremdmarken-Bestellungen raus?](../open-questions/q-066-fremd-bestellweg.md)

## Verwandte Seiten

- [Anforderungen Bestellplanung Fremdmarke](../requirements/fa-bestellplanung-fremdmarke.md)
- [Einkauf Eigenmarke](einkauf-eigenmarke.md)
- [Unternehmen und Sortiment](unternehmen-und-sortiment.md)
- [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)
- [Geschäftsmodell](index.md)
