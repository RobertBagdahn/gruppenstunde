import { z } from 'zod';

export const WIZARD_STEP_IDS = [
  'input',
  'basis',
  'review',
  'ingredients',
  'materials',
  'preparation',
  'preview',
] as const;

export const WizardStepIdSchema = z.enum(WIZARD_STEP_IDS);
export type WizardStepId = z.infer<typeof WizardStepIdSchema>;

export type CreationMethod = 'smart' | 'manual';

/** Wizard state the step list depends on. */
export interface WizardCtx {
  creationMethod: CreationMethod | null;
  reviewRowCount: number;
}

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  help: string;
  isVisible: (ctx: WizardCtx) => boolean;
  /** Steps that edit the persisted recipe and therefore need a draft. */
  requiresDraft: boolean;
}

export const WIZARD_STEPS: readonly WizardStepDef[] = [
  {
    id: 'input',
    label: 'Eingabe',
    help: 'Füge einen Link, Rezepttext oder eine Idee ein – oder beginne ohne KI.',
    isVisible: () => true,
    requiresDraft: false,
  },
  {
    id: 'basis',
    label: 'Basis & Portionen',
    help: 'Titel, Rezeptart und die Personenzahl des Originalrezepts festlegen.',
    isVisible: () => true,
    requiresDraft: false,
  },
  {
    id: 'review',
    label: 'Zutaten prüfen',
    help: 'Die erkannten Zutaten den passenden Zutaten und Portionen zuordnen.',
    isVisible: (ctx) => ctx.creationMethod === 'smart' && ctx.reviewRowCount > 0,
    requiresDraft: false,
  },
  {
    id: 'ingredients',
    label: 'Zutaten',
    help: 'Zutaten und Mengen ergänzen oder korrigieren.',
    isVisible: () => true,
    requiresDraft: true,
  },
  {
    id: 'materials',
    label: 'Materialien',
    help: 'Verbrauchs- und Hilfsmaterialien wie Backpapier oder Holzspieße ergänzen.',
    isVisible: () => true,
    requiresDraft: true,
  },
  {
    id: 'preparation',
    label: 'Zubereitung',
    help: 'Beschreibung, Zeiten und die einzelnen Zubereitungsschritte pflegen.',
    isVisible: () => true,
    requiresDraft: true,
  },
  {
    id: 'preview',
    label: 'Vorschau',
    help: 'Das Rezept prüfen und die Erstellung abschließen.',
    isVisible: () => true,
    requiresDraft: true,
  },
];

export function getVisibleSteps(ctx: WizardCtx): WizardStepDef[] {
  return WIZARD_STEPS.filter((step) => step.isVisible(ctx));
}

export function getStepDef(id: WizardStepId): WizardStepDef {
  const step = WIZARD_STEPS.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Unbekannter Wizard-Schritt: ${id}`);
  return step;
}

/** The recipe is created when leaving the last visible step without a draft. */
export function getCreationStepId(visibleSteps: readonly WizardStepDef[]): WizardStepId {
  const preDraftSteps = visibleSteps.filter((step) => !step.requiresDraft);
  return preDraftSteps[preDraftSteps.length - 1].id;
}

export const FIRST_DRAFT_STEP: WizardStepId = 'ingredients';

/**
 * Resolve the step to show for the URL state.
 *
 * With a draft, steps before the creation point have no client state left, so
 * they fall back to the first draft step. Without a draft, draft steps are
 * unreachable and client-only steps need their in-memory state (lost on reload).
 */
export function resolveStepId(
  rawStep: string | null,
  hasDraft: boolean,
  ctx: WizardCtx,
): WizardStepId {
  const parsed = WizardStepIdSchema.safeParse(rawStep);
  const visibleIds = getVisibleSteps(ctx).map((step) => step.id);
  if (hasDraft) {
    if (!parsed.success || !getStepDef(parsed.data).requiresDraft) return FIRST_DRAFT_STEP;
    return parsed.data;
  }
  if (!parsed.success || getStepDef(parsed.data).requiresDraft) return 'input';
  if (parsed.data !== 'input' && ctx.creationMethod === null) return 'input';
  if (!visibleIds.includes(parsed.data)) {
    // A hidden step (e.g. "review" once its rows were removed) continues at the
    // closest visible step before it, so the next "Weiter" still creates the draft.
    const position = WIZARD_STEP_IDS.indexOf(parsed.data);
    const before = visibleIds.filter((id) => WIZARD_STEP_IDS.indexOf(id) < position).pop();
    return before ?? 'input';
  }
  return parsed.data;
}
