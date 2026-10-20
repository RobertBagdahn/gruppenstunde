---
type: requirements
title: "Anforderungen ERP-Integration"
description: "Fachliche Anforderungen an das Lesen aus dem neuen ERP, das Anlegen von Bestellentwürfen und die Nutzung von API und MCP-Server."
tags: [anforderungen, erp, api, mcp]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Anforderungen ERP-Integration

## Kurzfassung

Das neue ERP ist das Stammsystem für alle laufenden Daten und das Ziel für Bestellungen. Laut Daniel
lässt sich „alles via API direkt aus dem ERP abrufen und steuern“, und es gibt einen MCP-Server
(Chat 09.10.2026). Flower-Demand kapselt das ERP hinter einem Adapter, liest täglich und legt nach
Freigabe Bestellentwürfe an – idempotent, protokolliert und mit minimalen Rechten. Name und
Fähigkeiten des ERP sind noch offen.

## Inhalt

- [Anforderungen](#anforderungen)
- [Lese- und Schreibobjekte](#lese--und-schreibobjekte)

## Anforderungen

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| ERP-01 | ERP-Zugriff nur über eine Adapter-Schnittstelle; Altdaten-Archiv ist ein zweiter Adapter | Muss | Robert | abgeleitet |
| ERP-02 | Wöchentlich (und auf Knopfdruck) lesen: Artikel, Bestände je Lager, Bewegungen, Auftragspositionen, Lieferanten, offene Einkaufsbestellungen, Wareneingänge | Muss | Chat 09.10. | bestätigt, Details offen ([Q-085](../open-questions/q-085-erp-api-doku.md)) |
| ERP-03 | Bestellentwürfe anlegen, nur nach Freigabe in Flower-Demand; ERP-Belegnummer zurückschreiben | Muss | Chat 09.10. | offen ([Q-087](../open-questions/q-087-erp-objekt.md)) |
| ERP-04 | Idempotent: dieselbe Freigabe erzeugt nie zwei Bestellungen (Idempotenzschlüssel je Freigabe) | Muss | Robert | abgeleitet |
| ERP-05 | Protokoll aller ERP-Aufrufe (Zeit, Objekt, Ergebnis, Fehler) mit Wiederholung bei temporären Fehlern | Muss | Robert | abgeleitet |
| ERP-06 | Eigener API-Benutzer mit minimalen Rechten; Zugangsdaten nur als Server-Secrets | Muss | Robert | offen ([Q-088](../open-questions/q-088-erp-rechte.md)) |
| ERP-07 | Schreibzugriffe zuerst gegen Testmandant/Sandbox entwickeln; Schalter „ERP-Schreiben aus“ | Soll | Robert | offen ([Q-085](../open-questions/q-085-erp-api-doku.md)) |
| ERP-08 | Änderungen an Bestellungen im ERP werden beim nächsten Import übernommen (ERP führt) | Muss | Robert, [Q-089](../open-questions/q-089-erp-rueckkanal.md) | bestätigt |
| ERP-09 | MCP-Server des ERP für agentische Analysen durch Daniel nutzbar machen (Doku, Beispiele) | Kann | Chat 09.10. | offen ([Q-086](../open-questions/q-086-erp-mcp.md)) |
| ERP-10 | Flower-Demand bietet selbst einen lesenden MCP-Server (Prognosen, Ampel, Erklärungen) für Codex | Kann | Robert | abgeleitet |

## Lese- und Schreibobjekte

| Objekt | Richtung | Verwendung |
|---|---|---|
| Artikel, Lieferanten, Konditionen | lesen | Stammdaten, Fremdmarke |
| Bestand je Lager | lesen | Ampel, Bestellung |
| Bewegungen, Auftragspositionen | lesen | Nachfrage, Klassifikation |
| Einkaufsbestellungen, Wareneingänge | lesen | Zulauf, Lieferzeiten |
| Bestellentwurf | schreiben | Bestellplaner, Fremdmarken-Vorschlag |

## Offene Fragen

- [Q-021: Welches ERP ist im Einsatz?](../open-questions/q-021-erp-name.md)
- [Q-085: Gibt es API-Doku und Testzugang?](../open-questions/q-085-erp-api-doku.md)
- [Q-086: Was kann der MCP-Server des ERP?](../open-questions/q-086-erp-mcp.md)
- [Q-087: Was soll im ERP angelegt werden?](../open-questions/q-087-erp-objekt.md)
- [Q-088: Welche Rechte bekommt das Tool?](../open-questions/q-088-erp-rechte.md)

## Verwandte Seiten

- [Datenquellen und ERP](../data/datenquellen-und-erp.md)
- [Backend](../plan/backend.md)
- [Anforderungen Bestellplanung Eigenmarke](fa-bestellplanung-eigenmarke.md)
- [Anforderungen Bestellplanung Fremdmarke](fa-bestellplanung-fremdmarke.md)
- [Anforderungen](index.md)
