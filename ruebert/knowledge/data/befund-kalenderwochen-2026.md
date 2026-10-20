---
type: observation
title: "Befund: v1 beschriftet die Wochen 2026 eine Woche zu spät"
description: "In der v1-Datenbank liegt week_start aller Wochen ab 2026 sieben Tage nach dem ISO-Montag; die Reihe hat eine Lücke zum Jahreswechsel und die Prognose beginnt eine Woche zu spät."
tags: [befund, daten, kalenderwoche, v1, prognose]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-17T00:00:00Z }
sources: [v1-datenbank-und-specs]
---

# Befund: v1 beschriftet die Wochen 2026 eine Woche zu spät

## Kurzfassung

In der v1-Datenbank (`weekly_sales_effective`) stimmt `week_start` bis einschließlich 2025 mit dem ISO-Montag
von `year`/`week` überein. Für alle 3.461 Zeilen von 2026 liegt `week_start` sieben Tage später. Die
Rohbuchungen von Montag 11.05. bis Sonntag 17.05.2026 (16.912 Tüten) stecken in der Zeile „18.05.2026“
(`year` 2026, `week` 20). Folgen: Die Reihe springt vom 22.12.2025 auf den 05.01.2026 (der 29.12. fehlt), und
die v1-Prognose beginnt am 25.05.2026 statt am 18.05.2026. Rübert korrigiert die Beschriftung beim Neuaufbau
und behält die v1-Beschriftung zur Nachverfolgung. Warum v1 so beschriftet, ist nicht geklärt.

## Inhalt

- [Beobachtung](#beobachtung)
- [Was daraus folgt](#was-daraus-folgt)
- [Behandlung im Prototyp](#behandlung-im-prototyp)

## Beobachtung

Geprüft am 17.10.2026 an der Datenbank vom 21.05.2026 (Daten bis 16.05.2026):

| Prüfung | Ergebnis |
|---|---|
| Zeilen mit `week_start` = ISO-Montag von (`year`, `week`) | alle Zeilen 2019–2025 (39.497) |
| Zeilen mit `week_start` = ISO-Montag + 7 Tage | alle Zeilen 2026 (3.461) |
| Rohbuchungen „Versandprozess WMS“, Woche ab Mo 11.05.2026 | 16.912 Tüten |
| v1-Zeile `week_start` 18.05.2026 (`year` 2026, `week` 20), Direktverkauf | 16.554 Tüten |
| v1-Zeile `week_start` 11.05.2026 (`year` 2026, `week` 19), Direktverkauf | 24.155 Tüten (Rohbuchungen ab Mo 04.05.: 24.793) |
| Etikett am Jahreswechsel (DGW004) | 22.12.2025 (KW 52), dann 05.01.2026 (KW 1); der 29.12. fehlt |
| Erste Prognosewoche der aktiven Artikel in Lauf 25 | 25.05.2026 (richtig wäre 18.05.2026) |

Die Prognose setzt die Beschriftung der Absatzreihe fort und trägt dieselbe Verschiebung. Ein ruhender
Artikel (DGW909, letzter Absatz 2024) wird ab einem unverschobenen Etikett weitergezählt und ist nicht betroffen.
Die Backtest-Prognosen sind über (`year`, `week`) abgelegt, deren Werte stimmen auch 2026.

## Was daraus folgt

- Die Absatzreihe endet in v1 scheinbar in der Woche ab 18.05.2026, die am Datenende (16.05.) noch gar nicht
  begonnen hatte.
- Für saisonale Modelle ist die Reihe ab 2026 um eine Woche versetzt und hat eine Lücke zum Jahreswechsel.
  Wie stark das die v1-Prognose beeinflusst hat, wurde nicht untersucht.
- Wer v1-Zahlen mit Kalenderwochen vergleicht (z. B. Daniels Excel-Planung), muss die Verschiebung kennen.
- Ob die Verschiebung auch in Daniels PostgreSQL-Datenbasis oder in Vario auftritt, ist unbekannt.

## Behandlung im Prototyp

1. Beim Neuaufbau wird `week_start` aller verschobenen Absatzzeilen auf den ISO-Montag von (`year`, `week`)
   gesetzt; `v1_week_start` behält die ursprüngliche Beschriftung (Rückverfolgung, DAT-19).
2. Prognosezeilen von Artikeln mit verschobener Absatzreihe werden um sieben Tage vorgezogen. Die Werte
   bleiben unverändert („Lauf 25 unverändert“).
3. Der Vergleichsbericht des Neuaufbaus nennt Beginn und Umfang der Korrektur.
4. Die Korrektur ändert nur Beschriftungen. Die Prognosemodelle selbst werden nicht neu gerechnet.

## Offene Fragen

- [Q-105: Wie sind Wochen in Daniels Datenbasis beschriftet?](../open-questions/q-105-wochenbeschriftung-2026.md)

## Verwandte Seiten

- [Datenpipeline und Neuaufbau](datenpipeline-und-neuaufbau.md)
- [Befund: Bestand danach ist kein Saldo](befund-bestand-danach.md)
- [Quelle: v1-Datenbank und Specs](../sources/v1-datenbank-und-specs.md)
- [Altsystem Version 1](../system-v1/index.md)
- [Daten](index.md)
