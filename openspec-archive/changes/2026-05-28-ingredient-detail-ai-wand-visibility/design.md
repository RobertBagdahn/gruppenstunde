## Context

Der Zauberstab-Button und das `AiSuggestDialog`-Modal existieren bereits auf der `IngredientDetailPage`. Der Button ist aktuell entweder ausgeblendet oder hat keine Sichtbarkeitsbeschränkung. Die Änderung beschränkt sich darauf, den Button nur für Admin/Staff-User anzuzeigen.

Betroffene Datei: `frontend/src/pages/supplies/IngredientDetailPage.tsx`

## Goals / Non-Goals

**Goals:**
- Zauberstab-Button neben Edit/Delete für Admin/Staff sichtbar machen
- Bestehende `AiSuggestDialog`-Funktionalität nutzen (keine Änderung)

**Non-Goals:**
- Keine neuen API-Endpunkte
- Keine Schema-Änderungen
- Keine Datenbank-Migrationen
- Kein Backend-Berechtigungscheck (der Endpunkt hat bereits Staff-Schutz)

## Decisions

**1. Sichtbarkeit über Auth-Store**

Der Button wird conditional gerendert basierend auf `user.is_staff || user.is_superuser` aus dem Zustand-Auth-Store. Gleiches Pattern wie bei den bestehenden Edit/Delete-Buttons.

**2. Platzierung neben Edit/Delete**

Der Zauberstab-Button wird in die gleiche Button-Gruppe wie Edit und Delete eingefügt, mit dem `auto_fix_high` Material Icon.

## Risks / Trade-offs

- [Minimal] Falls der Auth-Store `is_staff` nicht exposed → prüfen ob das Feld im User-Objekt vorhanden ist
