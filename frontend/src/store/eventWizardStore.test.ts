/**
 * Tests for the event wizard Zustand store.
 * Covers: navigation, step updates, validation tracking, reset,
 *         loadFromTemplate, getCreatePayload.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useEventWizardStore, WIZARD_STEPS, TOTAL_STEPS } from '@/store/eventWizardStore';

// Reset store between tests
beforeEach(() => {
  useEventWizardStore.getState().reset();
});

describe('WIZARD_STEPS constants', () => {
  it('has 8 steps', () => {
    expect(TOTAL_STEPS).toBe(8);
    expect(WIZARD_STEPS).toHaveLength(8);
  });

  it('first step is Grunddaten', () => {
    expect(WIZARD_STEPS[0].label).toBe('Grunddaten');
  });

  it('last step is Zusammenfassung', () => {
    expect(WIZARD_STEPS[7].label).toBe('Zusammenfassung');
  });
});

describe('navigation', () => {
  it('starts at step 0', () => {
    expect(useEventWizardStore.getState().currentStep).toBe(0);
  });

  it('nextStep increments step', () => {
    useEventWizardStore.getState().nextStep();
    expect(useEventWizardStore.getState().currentStep).toBe(1);
  });

  it('prevStep decrements step', () => {
    useEventWizardStore.getState().setStep(3);
    useEventWizardStore.getState().prevStep();
    expect(useEventWizardStore.getState().currentStep).toBe(2);
  });

  it('nextStep does not go beyond last step', () => {
    useEventWizardStore.getState().setStep(TOTAL_STEPS - 1);
    useEventWizardStore.getState().nextStep();
    expect(useEventWizardStore.getState().currentStep).toBe(TOTAL_STEPS - 1);
  });

  it('prevStep does not go below 0', () => {
    useEventWizardStore.getState().setStep(0);
    useEventWizardStore.getState().prevStep();
    expect(useEventWizardStore.getState().currentStep).toBe(0);
  });

  it('setStep sets to valid step', () => {
    useEventWizardStore.getState().setStep(5);
    expect(useEventWizardStore.getState().currentStep).toBe(5);
  });

  it('setStep ignores out-of-range (negative)', () => {
    useEventWizardStore.getState().setStep(-1);
    expect(useEventWizardStore.getState().currentStep).toBe(0);
  });

  it('setStep ignores out-of-range (too high)', () => {
    useEventWizardStore.getState().setStep(TOTAL_STEPS);
    expect(useEventWizardStore.getState().currentStep).toBe(0);
  });
});

describe('step data updates', () => {
  it('updateStep1 sets name', () => {
    useEventWizardStore.getState().updateStep1({ name: 'Sommerlager 2026' });
    expect(useEventWizardStore.getState().data.name).toBe('Sommerlager 2026');
  });

  it('updateStep1 sets color and icon', () => {
    useEventWizardStore.getState().updateStep1({ color: 'red', icon: 'flame' });
    expect(useEventWizardStore.getState().data.color).toBe('red');
    expect(useEventWizardStore.getState().data.icon).toBe('flame');
  });

  it('updateStep2 sets group_id', () => {
    useEventWizardStore.getState().updateStep2({ group_id: 42 });
    expect(useEventWizardStore.getState().data.group_id).toBe(42);
  });

  it('updateStep3 sets dates', () => {
    useEventWizardStore.getState().updateStep3({
      start_date: '2026-07-04T10:00',
      end_date: '2026-07-11T14:00',
    });
    expect(useEventWizardStore.getState().data.start_date).toBe('2026-07-04T10:00');
    expect(useEventWizardStore.getState().data.end_date).toBe('2026-07-11T14:00');
  });

  it('updateStep4 sets registration fields', () => {
    useEventWizardStore.getState().updateStep4({
      is_public: true,
      guest_registration_enabled: true,
    });
    expect(useEventWizardStore.getState().data.is_public).toBe(true);
    expect(useEventWizardStore.getState().data.guest_registration_enabled).toBe(true);
  });

  it('updateStep5 sets booking options', () => {
    useEventWizardStore.getState().updateStep5({
      booking_options: [{ name: 'Standard', description: '', price: '25.00', max_participants: 30 }],
    });
    expect(useEventWizardStore.getState().data.booking_options).toHaveLength(1);
    expect(useEventWizardStore.getState().data.booking_options![0].name).toBe('Standard');
  });

  it('partial updates preserve other fields', () => {
    useEventWizardStore.getState().updateStep1({ name: 'Test' });
    useEventWizardStore.getState().updateStep1({ color: 'green' });
    const { data } = useEventWizardStore.getState();
    expect(data.name).toBe('Test');
    expect(data.color).toBe('green');
  });
});

describe('validation tracking', () => {
  it('all steps start as invalid', () => {
    const { stepValidity } = useEventWizardStore.getState();
    expect(stepValidity).toHaveLength(TOTAL_STEPS);
    expect(stepValidity.every((v) => v === false)).toBe(true);
  });

  it('setStepValid marks a step as valid', () => {
    useEventWizardStore.getState().setStepValid(0, true);
    expect(useEventWizardStore.getState().stepValidity[0]).toBe(true);
    expect(useEventWizardStore.getState().stepValidity[1]).toBe(false);
  });

  it('setStepValid can mark invalid again', () => {
    useEventWizardStore.getState().setStepValid(2, true);
    useEventWizardStore.getState().setStepValid(2, false);
    expect(useEventWizardStore.getState().stepValidity[2]).toBe(false);
  });
});

describe('reset', () => {
  it('resets all state to defaults', () => {
    useEventWizardStore.getState().updateStep1({ name: 'Modified' });
    useEventWizardStore.getState().setStep(5);
    useEventWizardStore.getState().setStepValid(0, true);

    useEventWizardStore.getState().reset();

    const state = useEventWizardStore.getState();
    expect(state.currentStep).toBe(0);
    expect(state.data.name).toBe('');
    expect(state.data.color).toBe('blue');
    expect(state.data.icon).toBe('tent');
    expect(state.templateId).toBeNull();
    expect(state.stepValidity.every((v) => v === false)).toBe(true);
  });
});

describe('loadFromTemplate', () => {
  it('loads template data but clears name and slug', () => {
    useEventWizardStore.getState().loadFromTemplate(
      { name: 'Template Name', color: 'red', icon: 'flame', description: 'A desc' },
      99,
    );

    const state = useEventWizardStore.getState();
    expect(state.data.name).toBe(''); // cleared
    expect(state.data.slug).toBeUndefined(); // cleared
    expect(state.data.is_template).toBe(false); // cleared
    expect(state.data.color).toBe('red'); // kept from template
    expect(state.data.icon).toBe('flame'); // kept from template
    expect(state.data.description).toBe('A desc'); // kept from template
    expect(state.templateId).toBe(99);
    expect(state.currentStep).toBe(0);
  });

  it('resets step validity', () => {
    useEventWizardStore.getState().setStepValid(0, true);
    useEventWizardStore.getState().loadFromTemplate({}, 1);
    expect(useEventWizardStore.getState().stepValidity.every((v) => v === false)).toBe(true);
  });
});

describe('getCreatePayload', () => {
  it('returns minimal payload for empty wizard', () => {
    const payload = useEventWizardStore.getState().getCreatePayload();
    expect(payload.name).toBe('');
    expect(payload.color).toBe('blue');
    expect(payload.icon).toBe('tent');
    expect(payload.is_template).toBe(false);
    expect(payload.is_public).toBe(false);
  });

  it('includes optional fields only when set', () => {
    useEventWizardStore.getState().updateStep1({ name: 'Camp', slug: 'camp-2026' });
    useEventWizardStore.getState().updateStep2({ group_id: 5 });
    useEventWizardStore.getState().updateStep3({ start_date: '2026-07-01T10:00' });

    const payload = useEventWizardStore.getState().getCreatePayload();
    expect(payload.name).toBe('Camp');
    expect(payload.slug).toBe('camp-2026');
    expect(payload.group_id).toBe(5);
    expect(payload.start_date).toBe('2026-07-01T10:00');
  });

  it('omits null/empty optional fields', () => {
    const payload = useEventWizardStore.getState().getCreatePayload();
    expect(payload).not.toHaveProperty('slug');
    expect(payload).not.toHaveProperty('group_id');
    expect(payload).not.toHaveProperty('start_date');
    expect(payload).not.toHaveProperty('manual_phase');
    expect(payload).not.toHaveProperty('meal_plan_id');
    expect(payload).not.toHaveProperty('booking_options');
  });

  it('includes booking_options when set', () => {
    useEventWizardStore.getState().updateStep5({
      booking_options: [
        { name: 'Standard', description: 'Basic', price: '20.00', max_participants: 50 },
      ],
    });

    const payload = useEventWizardStore.getState().getCreatePayload();
    expect(payload.booking_options).toHaveLength(1);
    expect((payload.booking_options as Array<Record<string, unknown>>)[0].name).toBe('Standard');
  });

  it('trims event name', () => {
    useEventWizardStore.getState().updateStep1({ name: '  Camp  ' });
    const payload = useEventWizardStore.getState().getCreatePayload();
    expect(payload.name).toBe('Camp');
  });
});
