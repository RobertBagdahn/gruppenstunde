// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SuggestionAssistant } from './SuggestionAssistant';
import { EMPTY_FILTERS } from './suggestionConfig';

function setup(missingContext: string[] = []) {
  const onFinish = vi.fn();
  const onSaveContext = vi.fn();
  const onCancel = vi.fn();
  render(
    <SuggestionAssistant
      mealType="snack"
      missingContext={missingContext}
      initialFilters={EMPTY_FILTERS}
      onSaveContext={onSaveContext}
      onFinish={onFinish}
      onCancel={onCancel}
    />,
  );
  return { onFinish, onSaveContext, onCancel };
}

describe('SuggestionAssistant', () => {
  it('walks through five steps and applies the answers', () => {
    const { onFinish } = setup();
    expect(screen.getByText('1 von 5')).toBeTruthy();
    fireEvent.click(screen.getByText('Süß'));
    expect(screen.getByText('2 von 5')).toBeTruthy();
    fireEvent.click(screen.getByText('Ohne Vorbereitung'));
    fireEvent.click(screen.getByText('Ja, kinderfreundlich'));
    fireEvent.click(screen.getByText('Eher günstig'));
    expect(screen.getByText('5 von 5')).toBeTruthy();

    fireEvent.click(screen.getByText('Vorschläge zeigen'));

    expect(onFinish).toHaveBeenCalledWith(
      { taste: 'sweet', prep: 'none', kids: true, budget: 'cheap', diet: null, with_dessert: false },
      '',
    );
  });

  it('"Egal" leaves the filter untouched', () => {
    const { onFinish } = setup();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Egal'));
    fireEvent.click(screen.getByText('Vorschläge zeigen'));
    expect(onFinish).toHaveBeenCalledWith(EMPTY_FILTERS, '');
  });

  it('saves missing context answers and keeps five steps', () => {
    const { onSaveContext } = setup(['cooling']);
    expect(screen.getByText('Habt ihr eine Kühlmöglichkeit?')).toBeTruthy();
    fireEvent.click(screen.getByText('Kühlbox'));
    expect(onSaveContext).toHaveBeenCalledWith({ cooling: 'cooler_box' });
    expect(screen.getByText('2 von 5')).toBeTruthy();
  });

  it('passes the free-text wish on the last step', () => {
    const { onFinish } = setup();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Egal'));
    fireEvent.change(screen.getByLabelText('Wunsch'), { target: { value: ' etwas mit Schokolade ' } });
    fireEvent.click(screen.getByText('Vorschläge mit Wunsch zeigen'));
    expect(onFinish).toHaveBeenCalledWith(EMPTY_FILTERS, 'etwas mit Schokolade');
  });

  it('goes back one step and cancels from the first step', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByText('Süß'));
    fireEvent.click(screen.getByText('Zurück'));
    expect(screen.getByText('1 von 5')).toBeTruthy();
    fireEvent.click(screen.getByText('Abbrechen'));
    expect(onCancel).toHaveBeenCalled();
  });
});
