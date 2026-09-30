// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { useOmnibarShortcut } from './useOmnibarShortcut';

const meals = [
  { id: 3, start_datetime: '2026-12-12T18:00:00Z' },
  { id: 1, start_datetime: '2026-12-11T18:00:00Z' },
  { id: 2, start_datetime: '2026-12-12T08:00:00Z' },
];

function setup(overrides: Partial<Parameters<typeof useOmnibarShortcut>[0]> = {}) {
  const onOpenMeal = vi.fn();
  renderHook(() =>
    useOmnibarShortcut({ enabled: true, meals, lastActiveMealId: null, openMealId: null, onOpenMeal, ...overrides }),
  );
  return onOpenMeal;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useOmnibarShortcut', () => {
  it('opens one dialog for the first meal of the plan', () => {
    const onOpenMeal = setup();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onOpenMeal).toHaveBeenCalledTimes(1);
    expect(onOpenMeal).toHaveBeenCalledWith(1);
  });

  it('targets the last active meal', () => {
    const onOpenMeal = setup({ lastActiveMealId: 3 });

    fireEvent.keyDown(window, { key: 'K', ctrlKey: true });

    expect(onOpenMeal).toHaveBeenCalledWith(3);
  });

  it('closes the dialog on the second press', () => {
    const onOpenMeal = setup({ openMealId: 2 });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onOpenMeal).toHaveBeenCalledWith(null);
  });

  it('does nothing for viewers', () => {
    const onOpenMeal = setup({ enabled: false });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onOpenMeal).not.toHaveBeenCalled();
  });

  it('does not stack on a dialog that is already open', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.appendChild(dialog);
    const onOpenMeal = setup();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(onOpenMeal).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const onOpenMeal = setup();

    fireEvent.keyDown(window, { key: 'j', metaKey: true });
    fireEvent.keyDown(window, { key: 'k' });

    expect(onOpenMeal).not.toHaveBeenCalled();
  });
});
