// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserSearchSelect from './UserSearchSelect';

const useUsers = vi.fn();
vi.mock('@/api/users', () => ({
  USER_SEARCH_MIN_QUERY_LENGTH: 2,
  useUsers: (q: string) => useUsers(q),
}));

describe('UserSearchSelect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUsers.mockReset();
    useUsers.mockImplementation((q: string) =>
      q.trim().length >= 2
        ? { data: { items: [{ id: 7, display_name: 'Eule' }] }, isFetching: false, isError: false }
        : { data: undefined, isFetching: false, isError: false },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for a longer query before showing users', () => {
    render(<UserSearchSelect value={null} onChange={() => {}} />);

    expect(screen.getByRole('combobox', { name: 'Nutzer wählen' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Mindestens 2 Zeichen eingeben…')).toBeTruthy();
    expect(useUsers).toHaveBeenLastCalledWith('');
  });

  it('searches after typing and selects a user by display name', () => {
    const onChange = vi.fn();
    render(<UserSearchSelect value={null} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Nutzer suchen' }), { target: { value: 'eu' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(useUsers).toHaveBeenLastCalledWith('eu');
    const select = screen.getByRole('combobox', { name: 'Nutzer wählen' });
    expect(screen.getByRole('option', { name: 'Eule' })).toBeTruthy();
    fireEvent.change(select, { target: { value: '7' } });
    expect(onChange).toHaveBeenLastCalledWith(7);
  });
});
