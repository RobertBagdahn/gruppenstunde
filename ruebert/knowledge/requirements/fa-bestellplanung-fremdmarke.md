---
type: requirements
title: "Anforderungen Bestellplanung Fremdmarke"
description: "Fachliche Anforderungen an kurzfristige Bestellvorschläge für Fremdmarken je Lieferant mit Bestellpunkt-Logik und ERP-Übergabe."
tags: [anforderungen, fremdmarke, bestellvorschlag]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Anforderungen Bestellplanung Fremdmarke

## Kurzfassung

Für Fremdmarken will Daniel eine „eher kurzfristige“ Planung mit Bestellungen direkt im ERP
(Chat 09.10.2026). Mindestabnahme 5 und ein bis zwei Wochen Lieferzeit erlauben häufige, kleine
Bestellungen. Das Tool schlägt deshalb je Lieferant regelmäßig vor, was wann in welcher Menge
bestellt werden soll, auf Basis eines Bestellpunkts aus Prognose-Quantilen. Die meisten Details sind
noch offen; die Anforderungen sind entsprechend vorläufig.

## Inhalt

- [Anforderungen](#anforderungen)
- [Abgrenzung](#abgrenzung)

## Anforderungen

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| BFM-01 | Bestellvorschläge je Lieferant, gebündelt in einer Liste zur Prüfung | Muss | Chat 09.10. | bestätigt |
| BFM-02 | Bestellpunkt-Logik: bestellen, wenn verfügbarer Bestand + Zulauf ≤ Quantil der Nachfrage über Lieferzeit + Bestellintervall | Muss | Chat 17.05. (1–2 Wochen) | abgeleitet |
| BFM-03 | Rundung auf Mindestabnahme (5) und Verpackungseinheit je Artikel | Muss | Chat 17.05. | offen ([Q-065](../open-questions/q-065-fremd-verpackungseinheit.md)) |
| BFM-04 | Lieferantenkonditionen pflegbar oder aus dem ERP: Lieferzeit, Mindestbestellwert, Frachtfrei-Grenze, Bestelltage | Muss | abgeleitet | offen ([Q-060](../open-questions/q-060-fremd-konditionen.md)) |
| BFM-05 | Robuste Prognose für sporadische Nachfrage (Croston-Familie), Horizont zwei Jahre wie Eigenmarke | Muss | Robert, [Q-076](../open-questions/q-076-prognosehorizont.md) | bestätigt |
| BFM-06 | Vorschlag prüfen, Mengen ändern, freigeben → Bestellentwurf im ERP | Muss | Chat 09.10. | bestätigt |
| BFM-07 | Vororder vor der Saison als eigener Modus (wie Eigenmarke, ohne Raster) | Soll | abgeleitet | offen ([Q-062](../open-questions/q-062-fremd-vororder.md)) |
| BFM-08 | Auslaufartikel nur Abverkaufsüberwachung, keine Vorschläge; Seedhero wird komplett ignoriert | Soll | Chat 17.05., [Q-015](../open-questions/q-015-seedhero-ende.md) | bestätigt |
| BFM-09 | Anzucht & Zubehör mit eigenem Nachfrageprofil | Kann | Chat 17.05. | offen ([Q-064](../open-questions/q-064-fremd-scope.md)) |
| BFM-10 | Mindestbestellwert-Ausgleich: Vorschlag, welche Artikel aufgestockt werden, um den Mindestwert zu erreichen | Soll | abgeleitet | offen |

## Abgrenzung

- Keine automatische Bestellung ohne Freigabe.
- Kein Lieferanten-Portal; der Versand der Bestellung an den Lieferanten bleibt im ERP
  ([Q-066](../open-questions/q-066-fremd-bestellweg.md)).

## Offene Fragen

- [Q-059: Welche Fremdmarken-Lieferanten gibt es?](../open-questions/q-059-fremd-lieferanten.md)
- [Q-060: Welche Konditionen gelten je Lieferant?](../open-questions/q-060-fremd-konditionen.md)
- [Q-061: Wie wird heute Fremdmarke bestellt?](../open-questions/q-061-fremd-rhythmus.md)
- [Q-062: Gibt es Vororders vor der Saison?](../open-questions/q-062-fremd-vororder.md)
- [Q-064: Welche Fremdmarken sind im Scope?](../open-questions/q-064-fremd-scope.md)

## Verwandte Seiten

- [Einkauf Fremdmarke](../business/einkauf-fremdmarke.md)
- [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)
- [Anforderungen ERP-Integration](fa-erp-integration.md)
- [Anforderungen Bestellplanung Eigenmarke](fa-bestellplanung-eigenmarke.md)
- [Anforderungen](index.md)
