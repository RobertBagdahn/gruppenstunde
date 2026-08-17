## Context

Der Plausibilitätscheck in `recipe/api/items.py:164-181` wurde als Safety Net für den Bugfix `fix-portion-integrity-and-ai-estimate` eingeführt. Er prüft, ob `quantity × portion.weight_g` innerhalb einer Toleranz dem vom Frontend übermittelten `expected_grams_total` (AI-Schätzwert) entspricht, und lehnt bei Abweichung mit HTTP 422 ab.

Die ursprüngliche Toleranz von ±1% (min. 0.01g) wurde gewählt, um den in Rezept #59 gefundenen Bug (Faktor-333-Fehler: 3g beabsichtigt, 1000g gespeichert) zuverlässig zu fangen. In der Praxis erweist sich diese Toleranz als viel zu streng — legitime Küchen-Variationen (Portion "Stück Karotte" mit 24g statt 25g → 4% Abweichung) und Floating-Point-Rauschen (0.99g vs 1.0g) lösen falsche Ablehnungen aus.

Dieses Design legt die neuen Toleranzwerte fest und begründet sie.

## Goals / Non-Goals

**Goals:**
- Katastrophale Portion/Quantity-Mismatches (Faktor 2+ oder Größenordnungs-Fehler) weiterhin zuverlässig abfangen
- Legitime Küchen-Variationen (<15%) durchlassen
- Floating-Point-Noise bei kleinen Mengen (<2g Abweichung) nicht blockieren
- Keine Schema-, API- oder Frontend-Änderungen nötig

**Non-Goals:**
- Keine Änderung am Client (Frontend sendet `expected_grams_total` unverändert)
- Kein neues Warning-System oder Soft-Validation
- Keine Anpassung des Check-Mechanismus selbst — nur Parameter

## Decisions

### Toleranz: `max(expected * 0.15, 2.0)` statt `max(expected * 0.01, 0.01)`

| Fehlerfall | Erwartet | Ergebnis | Alt (1%) | Neu (15%/2g) |
|-----------|----------|----------|----------|---------------|
| Original-Bug (Jodsalz ×333) | 3g | 1000g | Rejected ✓ | Rejected ✓ |
| Karotte 24g vs 25g | 50g | 48g | Rejected ✗ | Accepted ✓ |
| FP-Noise (<2g) | 1.0g | 0.99g | Rejected ✗ | Accepted ✓ |
| Moderater Bug (×2) | 100g | 200g | Rejected ✓ | Rejected ✓ |
| Kleiner Bug (×1.3) | 100g | 130g | Rejected ✓ | Accepted (Grenzfall) |

**Begründung der Werte:**

- **15% relativ**: Portion-Gewichte sind Durchschnittswerte. Eine reale Karotte wiegt selten exakt das Portion-Gewicht. 15% decken typische natürliche Variation + Rundungsdifferenzen ab, während ein Faktor-2-Fehler (100% Abweichung) sicher gefangen wird.
- **2g absolut**: Deckt Floating-Point-Artefakte beim Skalieren (`toBasePerServing` rundet auf 3 Dezimalstellen) und Rundungsfehler bei Kleinstmengen ab. 2g ist in der Küche nicht messbar — selbst eine Digitalwaage hat ±1g Toleranz.

**Alternative erwogen: Check komplett entfernen.**
Verworfen, weil der Check als Defense-in-Depth wertvoll bleibt. Der Root-Cause-Fix (AI liefert `portion_id`, Frontend übernimmt atomar) löst den bekannten Bug, aber ein zukünftiger Client-Refactor könnte den Flow wieder brechen. Der Check mit großzügiger Toleranz ist ein nahezu kostenloses Netz.

## Risks / Trade-offs

- **[Risk] Bug mit Faktor 1.2–2.0 wird nicht gefangen** → Akzeptiert. Ein 20%-Fehler in der Rezeptmenge ist in der Küche praktisch irrelevant und würde vom Nutzer beim Kochen bemerkt werden. Der Schutz zielt auf katastrophale Fehler (Faktor 10+), nicht auf Feinjustierung.
- **[Risk] 2g-Minimum maskiert echte Fehler bei Kleinstmengen** → Akzeptiert. Wenn die AI 1g Salz schätzt und der Bug 2g statt 1g speichert (Faktor 2), ist der Unterschied für das Kochergebnis unerheblich und stellt keine Datenkorruption dar.

## Migration Plan

Kein Rollout-Plan nötig — reine Code-Änderung, keine Daten-Migration, kein Feature-Flag. Sofort wirksam nach Deploy.

Rollback: Commit revert oder Wert zurückändern. Keine Seiteneffekte.

## Open Questions

_Keine._
