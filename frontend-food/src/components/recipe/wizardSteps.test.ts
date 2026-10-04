import { describe, expect, it } from 'vitest';
import { getProgressSteps, getVisibleSteps } from './wizardSteps';

describe('getProgressSteps (stable step counter)', () => {
  it('counts the AI path with review before a method is chosen', () => {
    const before = getProgressSteps({ creationMethod: null, reviewRowCount: 0 });
    expect(before).toHaveLength(7);
    expect(before.map((step) => step.id)).toContain('review');
  });

  it('keeps the total of 7 after the recipe was analysed', () => {
    const after = getProgressSteps({ creationMethod: 'smart', reviewRowCount: 6 });
    expect(after).toHaveLength(7);
    expect(getProgressSteps({ creationMethod: null, reviewRowCount: 0 })).toHaveLength(after.length);
  });

  it('counts 6 steps on the manual path', () => {
    expect(getProgressSteps({ creationMethod: 'manual', reviewRowCount: 0 })).toHaveLength(6);
  });

  it('does not change navigation: the visible steps still hide the review before a method is chosen', () => {
    const visible = getVisibleSteps({ creationMethod: null, reviewRowCount: 0 });
    expect(visible.map((step) => step.id)).not.toContain('review');
  });
});
