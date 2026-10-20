---
type: concept
title: "Unternehmen und Sortiment"
description: "Marken, Kategorien, Sonderartikel und Scope-Grenzen des Sortiments von DeineGartenwelt."
tags: [sortiment, eigenmarke, fremdmarke, scope]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs]
---

# Unternehmen und Sortiment

## Kurzfassung

DeineGartenwelt (deinegartenwelt.de) ist ein Online-Händler für Saatgut. Die Eigenmarke
„Deine Gartenwelt“ (Artikelnummern `DGW…`) trägt rund 84 % des Umsatzes; Fremdmarken und
Zubehör den Rest. Im ersten Schritt ging es nur um die Eigenmarke; das Ziel für Version 2 umfasst
ausdrücklich auch Fremdmarken (Chat 09.10.2026). Einige Artikel sind Sonderfälle und werden
ignoriert oder separat behandelt.

## Inhalt

- [Marken](#marken)
- [Eigenmarke in Zahlen](#eigenmarke-in-zahlen)
- [Sonderartikel und Ausschlüsse](#sonderartikel-und-ausschlüsse)
- [Scope je Version](#scope-je-version)

## Marken

| Marke | Rolle | Quelle |
|---|---|---|
| Deine Gartenwelt (Eigenmarke) | Hauptmarke, eigene Abfüllung beim Hersteller, langfristige Planung | Chat 17.05.2026 |
| Seedhero (Bio) | Gefloppt, wird nur noch abverkauft, fällt im Absatz kaum ins Gewicht. Nicht exakt dieselben Sorten wie die Eigenmarke, daher keine relevante Kannibalisierung. | Chat 17.05.2026 |
| Fremdmarken | Kiepenkerl, SPERLI, Quedlinburger, Dürr Samen, Pabst Keimkraft, Romberg, Grüne Fee | v1 `Project.md` |
| Anzucht & Zubehör | Gewächshäuser, Töpfe usw. – **komplett Fremdmarke** | Chat 17.05.2026 |

Robert stellte fest, dass die Eigenmarken rund 84 % ausmachen; Daniel bestätigte, dass Fremdmarken
deshalb und wegen kleiner Mindestmengen und kurzer Lieferzeit weniger kritisch sind (Chat 17.05.2026).

## Eigenmarke in Zahlen

Stand der v1-Datenbank (Daten bis 16.05.2026), siehe [Quelle v1](../sources/v1-datenbank-und-specs.md):

| Kategorie (aus Shop-Tags) | Artikel |
|---|---|
| Gemüsesamen | 96 |
| Blumensamen | 49 |
| Kräutersamen | 30 |
| Obstsamen | 8 |
| Rasen | 3 |
| Zubehör | 2 |
| **Summe Stammdaten** | **188** |

In den Warenbewegungen kommen 217 verschiedene `DGW`-Nummern vor; 29 davon fehlen in den
Stammdaten (siehe [Anomalieerkennung](../data/anomalieerkennung.md)). Zusätzlich gibt es 14 Sets.
Die Angabe „ca. 1.300 Produkte“ aus v1 bezieht sich auf das Gesamtsortiment inklusive Fremdmarken
und ist nicht gegen Daten geprüft.

## Sonderartikel und Ausschlüsse

| Artikel | Bedeutung | Behandlung | Quelle |
|---|---|---|---|
| DGWADV | Adventskalender | vorerst ignorieren | Chat 17.05.2026 |
| DGW-GC2 | „Special Quatsch“ | ignorieren | Chat 17.05.2026 |
| DGW128 | Weihnachtsbaum-Samen | Sonderartikel mit eigener Saison | Chat 17.05.2026 |
| DGW158 | Glücksklee zu Neujahr | Sonderartikel mit eigener Saison | Chat 17.05.2026 |
| Seedhero | Bio-Auslauf | komplett ignorieren (importiert, aber Scope „ignoriert“) | Chat 17.05.2026, [Q-015](../open-questions/q-015-seedhero-ende.md) |

Nachfolgeartikel gibt es laut Daniel nicht (Chat 17.05.2026). Ausschlüsse werden in v2 nicht im
Code, sondern als versionierte Konfiguration gepflegt, siehe
[Datenklassifikation](../data/datenklassifikation-und-herkunft.md).

## Scope je Version

| Bereich | v1 (Mai 2026) | v2 (Ziel) |
|---|---|---|
| Eigenmarke Saatgut | ja | ja, Jahresplanung und Nachsteuern |
| Sets der Eigenmarke | aufgelöst auf Komponenten | ja |
| Bundles 3er/5er | nein | ja, über Auftragspositionen |
| Fremdmarken Saatgut | nein | ja, kurzfristige Bestellvorschläge |
| Anzucht & Zubehör | nein | später, nach Fremdmarken-Saatgut ([Q-064](../open-questions/q-064-fremd-scope.md)) |
| Seedhero | nein | nein, komplett ignoriert ([Q-015](../open-questions/q-015-seedhero-ende.md)) |
| Sonderartikel | teilweise | offen ([Q-014](../open-questions/q-014-sonderartikel-planung.md)) |

## Offene Fragen

- [Q-012: Wie kommen neue Sorten ins Sortiment?](../open-questions/q-012-neue-sorten.md)
- [Q-013: Wann wird ein Artikel ausgelistet?](../open-questions/q-013-auslistung.md)
- [Q-014: Wie werden Sonderartikel geplant?](../open-questions/q-014-sonderartikel-planung.md)
- [Q-015: Bis wann läuft Seedhero aus?](../open-questions/q-015-seedhero-ende.md)
- [Q-064: Welche Fremdmarken sind im Scope?](../open-questions/q-064-fremd-scope.md)
- [Q-103: Was sind Artikelnummern ohne Stammdaten?](../open-questions/q-103-unbekannte-artikelnummern.md)

## Verwandte Seiten

- [Artikelbeziehungen](artikelbeziehungen.md)
- [Einkauf Eigenmarke](einkauf-eigenmarke.md)
- [Einkauf Fremdmarke](einkauf-fremdmarke.md)
- [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md)
- [Geschäftsmodell](index.md)
