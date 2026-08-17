## 1. Frontend — Stepper Circle & Icon Sizing

- [x] 1.1 Increase step circle size in `WizardStepper.tsx`: Mobile `w-10 h-10` (from `w-8 h-8`), Desktop `w-12 h-12` (from `sm:w-10 sm:h-10`)
- [x] 1.2 Increase icon size: Mobile `text-[20px]`, Desktop `text-[24px]` (from `text-[18px]`/`text-[20px]`)
- [x] 1.3 Show step number (1-8) for inactive steps on mobile instead of small icons

## 2. Frontend — Active Step Highlight

- [x] 2.1 Add `ring-2 ring-primary ring-offset-2` to the active step circle for stronger visual focus
- [x] 2.2 Keep existing `shadow-glow` and `gradient-primary` for active step

## 3. Frontend — Labels & Responsive

- [x] 3.1 Hide step labels on mobile (`hidden sm:block`) to prevent text truncation
- [x] 3.2 Keep labels visible on desktop with adequate spacing
- [x] 3.3 Reduce connecting line minimum width on mobile (`min-w-1` from `min-w-2`)

## 4. Verification

- [x] 4.1 Test stepper on 320px viewport — all 8 circles visible, no overflow
- [x] 4.2 Test stepper on desktop — icons and labels clearly visible
- [x] 4.3 Verify TypeScript compilation passes
