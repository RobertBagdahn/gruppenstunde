import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';
import {
  useMealPlanTags,
  useCreateMealPlanTag,
  useDeleteMealPlanTag,
} from '@/api/mealPlans';

vi.mock('@/api/mealPlans', () => ({
  useMealPlanTags: vi.fn(),
  useCreateMealPlanTag: vi.fn(),
  useDeleteMealPlanTag: vi.fn(),
}));

vi.mock('@/components/recipe/NutritionalTagMultiSelect', () => ({
  default: () => <div data-testid="nutritional-tags" />,
}));

type SettingsData = {
  name?: string;
  description?: string;
  norm_portions?: number;
  norm_portions_manual?: boolean;
  reserve_factor?: number;
  activity_factor?: number;
  budget_per_person_per_day?: number | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  day_part_factors?: Record<string, number>;
  meal_default_times?: Record<string, string[]>;
  nutritional_tag_ids?: number[];
};

type TestPlan = {
  name: string;
  description: string;
  norm_portions: number;
  norm_portions_manual: boolean;
  previous_norm_portions: number;
  activity_factor: number;
  reserve_factor: number;
  budget_per_person_per_day: number | null;
  start_datetime: string | null;
  end_datetime: string | null;
  day_part_factors: Record<string, number>;
  meal_default_times: Record<string, string[]>;
  nutritional_tag_ids: number[];
  has_group_members: boolean;
  group_members_count: number;
  event_id: number | null;
};

const basePlan: TestPlan = {
  name: 'Sommerlager',
  description: '',
  norm_portions: 8,
  norm_portions_manual: false,
  previous_norm_portions: 8,
  activity_factor: 1.5,
  reserve_factor: 1.1,
  budget_per_person_per_day: null,
  start_datetime: '2026-01-15T12:00:00Z',
  end_datetime: '2026-01-16T12:00:00Z',
  day_part_factors: { breakfast: 0.25 },
  meal_default_times: { breakfast: ['08:00', '09:00'] },
  nutritional_tag_ids: [],
  has_group_members: true,
  group_members_count: 2,
  event_id: 4,
};

function configureMocks() {
  vi.mocked(useMealPlanTags).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useMealPlanTags>);
  vi.mocked(useCreateMealPlanTag).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateMealPlanTag>);
  vi.mocked(useDeleteMealPlanTag).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteMealPlanTag>);
}

function renderPanel(
  plan: TestPlan,
  onSave: (data: SettingsData) => void = vi.fn<(data: SettingsData) => void>(),
) {
  return render(
    <SettingsPanel
      planId={1}
      plan={plan}
      onSave={onSave}
      isPending={false}
    />,
  );
}

describe('SettingsPanel norm portions', () => {
  beforeEach(() => {
    configureMocks();
  });

  it('shows the manual switch only for event-linked plans and saves a whole number', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(data: SettingsData) => void>();
    renderPanel(basePlan, onSave);

    const manualSwitch = screen.getByRole('switch', { name: 'Normportionen manuell festlegen' });
    await user.click(manualSwitch);

    const input = screen.getByRole('spinbutton', { name: 'Manuelle Normportionen' });
    await user.clear(input);
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      norm_portions: 12,
      norm_portions_manual: true,
    }));
  });

  it('disables saving fractional manual norm portions', async () => {
    const user = userEvent.setup();
    renderPanel({ ...basePlan, norm_portions: 8.5 });

    await user.click(screen.getByRole('switch', { name: 'Normportionen manuell festlegen' }));

    expect(screen.getByText('Bitte eine positive ganze Zahl eingeben.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('keeps the direct norm portions input for standalone plans', () => {
    renderPanel({ ...basePlan, event_id: null, has_group_members: false });

    expect(screen.queryByRole('switch', { name: 'Normportionen manuell festlegen' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Normportionen')).toBeInTheDocument();
  });

  it('preserves standalone norm portions when the activity factor changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(data: SettingsData) => void>();
    renderPanel({ ...basePlan, event_id: null, has_group_members: false }, onSave);

    await user.selectOptions(screen.getByRole('combobox'), '2');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      norm_portions: 8,
      activity_factor: 2,
    }));
  });

  it('disables saving an invalid date range', () => {
    renderPanel({
      ...basePlan,
      start_datetime: '2026-01-15T12:00:00Z',
      end_datetime: '2026-01-15T11:00:00Z',
    });

    expect(screen.getByText('Das Ende muss nach dem Start liegen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('requires a start datetime before saving', () => {
    renderPanel({ ...basePlan, start_datetime: null, end_datetime: null });

    expect(screen.getByText('Bitte einen Startzeitpunkt angeben.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('sends automatic mode without a manual value when resetting an event plan', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(data: SettingsData) => void>();
    renderPanel({ ...basePlan, norm_portions: 12, norm_portions_manual: true }, onSave);

    await user.click(screen.getByRole('switch', { name: 'Normportionen manuell festlegen' }));
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ norm_portions_manual: false }));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('norm_portions');
  });
});
