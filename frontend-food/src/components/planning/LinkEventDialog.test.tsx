// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import LinkEventDialog from './LinkEventDialog';

const { linkMutate, createMutate, state } = vi.hoisted(() => ({
  linkMutate: vi.fn(),
  createMutate: vi.fn(),
  state: { events: [] as unknown[], linkError: null as unknown, createError: null as unknown },
}));

vi.mock('@/api/shoppingTrips', () => ({
  useManageableEvents: () => ({
    isPending: false,
    data: { items: state.events, total: state.events.length, page: 1, page_size: 6, total_pages: 1 },
  }),
  useLinkMealPlanEvent: () => ({ mutate: linkMutate, isPending: false, error: state.linkError }),
  useCreateEventForMealPlan: () => ({ mutate: createMutate, isPending: false, error: state.createError }),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const plan = {
  id: 41,
  name: 'Pfingstlager',
  start_datetime: new Date(2026, 4, 22, 8, 0).toISOString(),
  end_datetime: new Date(2026, 4, 25, 18, 0).toISOString(),
};

function renderDialog(onLinked = vi.fn()) {
  render(<LinkEventDialog open onOpenChange={vi.fn()} plan={plan} onLinked={onLinked} />);
  return onLinked;
}

describe('LinkEventDialog', () => {
  beforeEach(() => {
    linkMutate.mockReset();
    createMutate.mockReset();
    state.events = [{ id: 7, slug: 'herbstfahrt', name: 'Herbstfahrt 2026', start_date: '2026-10-02T08:00:00Z', end_date: '2026-10-04T08:00:00Z' }];
    state.linkError = null;
    state.createError = null;
  });

  it('links the plan to a chosen event and opens its shopping plan', async () => {
    const user = userEvent.setup();
    const onLinked = renderDialog();

    await user.click(screen.getByRole('button', { name: /Herbstfahrt 2026/ }));

    expect(linkMutate).toHaveBeenCalledWith(7, expect.objectContaining({ onSuccess: expect.any(Function) }));
    linkMutate.mock.calls[0][1].onSuccess();
    expect(onLinked).toHaveBeenCalledWith('herbstfahrt');
  });

  it('creates a new event pre-filled from the plan', async () => {
    const user = userEvent.setup();
    const onLinked = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Neues Event anlegen' }));
    const form = screen.getByRole('form', { name: 'Neues Event anlegen' });
    expect(within(form).getByLabelText('Name')).toHaveValue('Pfingstlager');
    expect(within(form).getByLabelText('Beginn')).toHaveValue('2026-05-22');
    expect(within(form).getByLabelText('Ende')).toHaveValue('2026-05-25');

    await user.click(within(form).getByRole('button', { name: 'Event anlegen' }));

    expect(createMutate).toHaveBeenCalledWith(
      { name: 'Pfingstlager', start_date: plan.start_datetime, end_date: plan.end_datetime },
      expect.anything(),
    );
    createMutate.mock.calls[0][1].onSuccess({ slug: 'pfingstlager' });
    expect(onLinked).toHaveBeenCalledWith('pfingstlager');
  });

  it('offers only the new-event form when the user manages no event', () => {
    state.events = [];
    renderDialog();

    expect(screen.getByRole('form', { name: 'Neues Event anlegen' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Deine Events' })).not.toBeInTheDocument();
  });

  it('shows the conflict when the plan already belongs to an event', () => {
    state.createError = new ApiError(409, 'Conflict', { detail: 'Dieser Essensplan gehört schon zu einem Event' });
    state.events = [];
    renderDialog();

    expect(screen.getByRole('alert')).toHaveTextContent('Dieser Essensplan gehört schon zu einem Event');
  });
});
