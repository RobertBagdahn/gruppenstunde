## Context

Der WizardStepper in `frontend/src/components/events/wizard/WizardStepper.tsx` zeigt 8 Steps mit Google Material Symbols Icons. Die Icons sind mit `text-[18px]` / `text-[20px]` gerendert in 32x32px (Mobile) / 40x40px (Desktop) Kreisen. Bei 8 Steps auf schmalen Bildschirmen werden die Labels abgeschnitten ("Gru...", "Dat...", "An...") und die Icons sind kaum erkennbar.

Betroffene Datei:
- `frontend/src/components/events/wizard/WizardStepper.tsx` — einzige betroffene Datei

## Goals / Non-Goals

**Goals:**
- Icons in allen Step-Kreisen klar erkennbar machen
- Aktiven Step visuell stärker hervorheben
- Labels leserlich halten (ggf. auf Mobile ausblenden oder kürzen)
- Touch-freundliche Mindestgröße (44x44px) auf Mobile
- Stepper soll bei 8 Steps nicht überlaufen

**Non-Goals:**
- Keine Änderung der Step-Reihenfolge oder -Anzahl
- Kein neues Icon-System (Material Symbols bleibt)
- Keine Änderung der Step-Logik (Navigation, Validierung)

## Decisions

### 1. Icons größer, Labels nur auf Desktop

Mobile: Icons auf `text-[20px]` in `w-10 h-10` Kreisen, Labels komplett ausblenden (`hidden sm:block`). Auf Desktop: Icons auf `text-[24px]` in `w-12 h-12` Kreisen, Labels darunter.

Alternative: Labels als Tooltips — abgelehnt, weil Tooltips auf Touch-Devices schlecht funktionieren.

### 2. Aktiver Step mit Ring-Highlight

Der aktive Step bekommt zusätzlich einen `ring-2 ring-primary ring-offset-2` für einen deutlichen visuellen Fokus. Die bestehende `shadow-glow` Klasse wird beibehalten.

### 3. Kompaktere Verbindungslinien

Die Verbindungslinien zwischen Steps werden auf `min-w-1` reduziert und auf Mobile dünner (`h-px` statt `h-0.5`).

### 4. Step-Nummer als Fallback

Statt rein auf Icons zu setzen, wird auf Mobile die Step-Nummer (1-8) angezeigt wenn der Step weder aktiv noch abgeschlossen ist. Icons bleiben für aktiven und abgeschlossenen Zustand.

Alternative: Immer Icons — abgelehnt, weil 18px Icons in kleinen Kreisen auf 320px Screens schlecht erkennbar sind. Nummern sind klarer.

## Risks / Trade-offs

- [8 Steps auf 320px] → Labels werden ausgeblendet, Kreise + Linien brauchen ~320px (8×36px + 7×8px = 344px, knapp passend mit overflow-x-auto)
- [Keine Labels auf Mobile] → Der aktive Step-Name wird stattdessen als Heading über dem Step-Inhalt angezeigt (existiert bereits in den Step-Komponenten)

**Keine API-Änderungen, keine Schema-Änderungen, keine Migrationen.**
