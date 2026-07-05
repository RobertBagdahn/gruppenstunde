// @vitest-environment jsdom
/**
 * Tests for RefMealSyncConfirmDialog — confirmation before destructive
 * RefMeal auto-sync, per capability "ref-meal-auto-sync".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RefMealSyncConfirmDialog } from './RefMealSyncConfirmDialog';

afterEach(() => {
  cleanup();
});

describe('RefMealSyncConfirmDialog', () => {
  it('shows the correct number of affected linked meals', () => {
    render(
      <RefMealSyncConfirmDialog
        open
        onOpenChange={() => {}}
        syncedMealsCount={3}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByTestId('ref-meal-sync-confirm-description')).toHaveTextContent(
      '3 verknüpfte Mahlzeiten werden mit dieser Vorlage überschrieben'
    );
  });

  it('uses singular wording for exactly one linked meal', () => {
    render(
      <RefMealSyncConfirmDialog
        open
        onOpenChange={() => {}}
        syncedMealsCount={1}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByTestId('ref-meal-sync-confirm-description')).toHaveTextContent(
      '1 verknüpfte Mahlzeit wird mit dieser Vorlage überschrieben'
    );
  });

  it('does not render dialog content when closed', () => {
    render(
      <RefMealSyncConfirmDialog
        open={false}
        onOpenChange={() => {}}
        syncedMealsCount={2}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByTestId('ref-meal-sync-confirm-description')).not.toBeInTheDocument();
  });

  it('calls onCancel and not onConfirm when the user aborts', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RefMealSyncConfirmDialog
        open
        onOpenChange={() => {}}
        syncedMealsCount={2}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('ref-meal-sync-confirm-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when the user confirms the sync', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RefMealSyncConfirmDialog
        open
        onOpenChange={() => {}}
        syncedMealsCount={2}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('ref-meal-sync-confirm-save'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
