---
type: observation
title: "Befund: Bestand danach ist kein Saldo"
description: "Die Spalte Bestand danach im Warenbewegungs-Export ist kein laufender Saldo der Buchungen, sondern vermutlich der verfügbare Bestand nach Reservierungen."
tags: [befund, daten, bestand, puffer]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [export-warenbewegungen]
---

# Befund: Bestand danach ist kein Saldo

## Kurzfassung

v1 nimmt „Bestand danach“ der letzten Buchung als aktuellen Bestand. Der Datenscan zeigt, dass die
Spalte kein laufender Saldo ist: 2025 bleibt sie bei 61 % der Buchungen unverändert, obwohl Tüten
abgehen, und steigt teils ohne Zugang. Am wahrscheinlichsten ist sie der **verfügbare Bestand** zum
Buchungszeitpunkt – physischer Bestand minus Reservierungen für offene Aufträge. Das würde gut zur
Puffer-Regel passen, die sich ebenfalls auf den verfügbaren Bestand bezieht. Bestätigt ist das nicht.

## Inhalt

- [Beobachtung](#beobachtung)
- [Beispiel DGW022 im März 2025](#beispiel-dgw022-im-märz-2025)
- [Folgen](#folgen)
- [Behandlung in Version 2](#behandlung-in-version-2)

## Beobachtung

Für 462.606 Buchungen 2025 mit Vorgängerbuchung desselben Artikels:

| Hypothese | Trifft zu |
|---|---:|
| Bestand danach = vorheriger Bestand danach + Menge (laufender Saldo) | 41.283 (9 %) |
| Bestand danach = vorheriger Bestand danach + vorherige Menge (um eine Zeile verzögert) | 57.313 (12 %) |
| Bestand danach unverändert | 283.320 (61 %) |

Auf Tagesebene (letzter Wert des Tages gegen Vortag plus Tagesmenge) passen 2025 rund 55 % der Artikel-Tage nicht;
die mittlere Abweichung beträgt nur 2–3 Tüten. Die Abweichungen sind also klein und häufig – typisch
für Reservierungen, die zeitversetzt zum Versand gebucht werden.

## Beispiel DGW022 im März 2025

| Zeit | Menge | Bestand danach |
|---|---:|---:|
| 01.03. 10:35 | −1 | 85 |
| 01.03. 11:54 | −1 | 85 |
| 02.03. 15:59 | −2 | 71 |
| 02.03. 16:27 | −1 | 72 |
| 02.03. 16:30 | −1 | 72 |
| 03.03. 10:22 | −1 | 68 |

Zwischen den Buchungen sinkt der Wert sprunghaft (85 → 71) und steigt dann ohne Zugang (71 → 72).
Das passt zu Reservierungen, die bei Bestellung abgezogen und beim Versand verbucht werden.

## Folgen

- Bestand aus der Summe der Bewegungen und „Bestand danach“ ergeben verschiedene Zahlen. Beide sind
  nicht falsch, aber unterschiedlich gemeint.
- Für Ausverkaufserkennung und Puffer ist der verfügbare Bestand richtig – wenn die Hypothese stimmt.
- Für die Bestellung zählt der physische Bestand plus Zulauf minus offene Reservierungen.
- Prüfung A-09 der [Anomalieerkennung](anomalieerkennung.md) bleibt ein Hinweis, bis die Semantik
  geklärt ist.

## Behandlung in Version 2

1. Beide Bestandsbegriffe getrennt speichern: `available_stock` (aus „Bestand danach“ bzw. ERP) und
   `physical_stock` (aus ERP-Bestand, historisch aus Bewegungen rekonstruiert).
2. Zensur-Wochen über `available_stock ≤ 30` bestimmen.
3. Im neuen ERP Bestand direkt per API lesen, nicht aus Bewegungen ableiten.

## Offene Fragen

- [Q-031: Welche Lagerorte gibt es?](../open-questions/q-031-lagerorte.md)
- [Q-036: Seit wann gilt der Puffer von 30?](../open-questions/q-036-puffer-historie.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)
- [Q-104: Warum gibt es negativen Bestand?](../open-questions/q-104-negativer-bestand.md)

## Verwandte Seiten

- [Lager, Bestand und MHD](../business/lager-bestand-mhd.md)
- [Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)
- [Daten-Anomalieerkennung](anomalieerkennung.md)
- [Warenbewegungen und Buchungsarten](warenbewegungen-buchungsarten.md)
- [Daten](index.md)
