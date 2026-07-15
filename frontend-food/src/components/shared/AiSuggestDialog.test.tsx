// @vitest-environment jsdom
/**
 * Tests for AiSuggestDialog (openspec change rework-ingredient-portion-ai-suggestions):
 * - portion_type grouping renders conditional groups only when data present
 * - "Alte Portionen ersetzen" extra checkbox toggles and surfaces its warning
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiSuggestDialog, type SuggestionField } from '@/components/shared/AiSuggestDialog';

vi.mock('@/components/shared/AiVoteButtons', () => ({
  AiVoteButtons: () => null,
}));

function makeFields(): SuggestionField[] {
  return [
    {
      key: 'portion_rezeptportion_0',
      label: 'Portion',
      group: 'Rezeptportion',
      currentValue: null,
      suggestedValue: { name: 'Portion', weight_g: 80 },
      type: 'list',
      priority: 100,
    },
    {
      key: 'portion_packung_0',
      label: 'Packung',
      group: 'Packungen',
      currentValue: null,
      suggestedValue: { name: 'Packung', weight_g: 500 },
      type: 'list',
      priority: 10,
    },
  ];
}

describe('AiSuggestDialog', () => {
  it('renders portion groups only for groups with data', () => {
    render(
      <AiSuggestDialog
        open
        onOpenChange={() => {}}
        title="KI-Vorschläge"
        isLoading={false}
        fields={makeFields()}
        onApply={() => {}}
      />
    );

    expect(screen.getAllByText('Rezeptportion').length).toBeGreaterThan(0);
    expect(screen.getByText('Packungen')).toBeInTheDocument();
    expect(screen.queryByText('Belag')).not.toBeInTheDocument();
    expect(screen.queryByText('Backmengen')).not.toBeInTheDocument();
  });

  it('toggles the "Alte Portionen ersetzen" checkbox and shows the warning', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <AiSuggestDialog
        open
        onOpenChange={() => {}}
        title="KI-Vorschläge"
        isLoading={false}
        fields={makeFields()}
        onApply={() => {}}
        extraCheckbox={{
          label: 'Alte Portionen ersetzen',
          checked: false,
          onChange,
          warning: '3 bestehende Portionen werden ersetzt.',
        }}
      />
    );

    const checkbox = screen.getByLabelText('Alte Portionen ersetzen');
    expect(screen.queryByText('3 bestehende Portionen werden ersetzt.')).not.toBeInTheDocument();

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <AiSuggestDialog
        open
        onOpenChange={() => {}}
        title="KI-Vorschläge"
        isLoading={false}
        fields={makeFields()}
        onApply={() => {}}
        extraCheckbox={{
          label: 'Alte Portionen ersetzen',
          checked: true,
          onChange,
          warning: '3 bestehende Portionen werden ersetzt.',
        }}
      />
    );

    expect(screen.getByText('3 bestehende Portionen werden ersetzt.')).toBeInTheDocument();
  });

  it('calls onApply with the replace_all-relevant selected keys', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AiSuggestDialog
        open
        onOpenChange={() => {}}
        title="KI-Vorschläge"
        isLoading={false}
        fields={makeFields()}
        onApply={onApply}
      />
    );

    const applyButton = screen.getByRole('button', { name: /Ausgewählte übernehmen/ });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledTimes(1);
    const selectedKeys = onApply.mock.calls[0][0] as string[];
    expect(selectedKeys).toEqual(expect.arrayContaining(['portion_rezeptportion_0', 'portion_packung_0']));
  });
});
