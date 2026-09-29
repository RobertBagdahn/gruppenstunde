import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoginPrompt } from '@/store/loginPromptStore';
import { useAiAccess } from './useAiAccess';

const mocks = vi.hoisted(() => ({
  user: null as { id: number } | null,
  quota: undefined as { used_percent: number; visitor_remaining_percent?: number | null } | undefined,
  warning: vi.fn(),
}));

vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: mocks.user, isLoading: false }) }));
vi.mock('@/api/ai', () => ({ useAiQuota: () => ({ data: mocks.quota }) }));
vi.mock('sonner', () => ({ toast: { warning: mocks.warning } }));

beforeEach(() => {
  mocks.user = null;
  mocks.quota = undefined;
  mocks.warning.mockClear();
  useLoginPrompt.setState({ open: false });
});

describe('useAiAccess', () => {
  it('locks non-allowlisted AI for visitors and opens the login dialog instead of running', () => {
    const action = vi.fn();
    const { result } = renderHook(() => useAiAccess({ description: 'Die KI hilft.' }));
    expect(result.current.locked).toBe(true);
    act(() => result.current.guard(action)());
    expect(action).not.toHaveBeenCalled();
    expect(useLoginPrompt.getState().open).toBe(true);
    expect(useLoginPrompt.getState().reason).toContain('Die KI hilft.');
  });

  it('lets visitors use allowlisted features', () => {
    const action = vi.fn();
    mocks.quota = { used_percent: 20, visitor_remaining_percent: 60 };
    const { result } = renderHook(() => useAiAccess({ anonymousAllowed: true }));
    expect(result.current.status).toBe('available');
    act(() => result.current.guard(action)());
    expect(action).toHaveBeenCalledOnce();
  });

  it('disables allowlisted features when the visitor share is used up', () => {
    mocks.quota = { used_percent: 20, visitor_remaining_percent: 0 };
    const { result } = renderHook(() => useAiAccess({ anonymousAllowed: true }));
    expect(result.current.disabled).toBe(true);
    expect(result.current.hint).toContain('ausgelastet');
  });

  it('disables AI for users whose daily quota is used up and explains why on click', () => {
    const action = vi.fn();
    mocks.user = { id: 1 };
    mocks.quota = { used_percent: 100 };
    const { result } = renderHook(() => useAiAccess());
    expect(result.current.disabled).toBe(true);
    act(() => result.current.guard(action)());
    expect(action).not.toHaveBeenCalled();
    expect(mocks.warning).toHaveBeenCalledOnce();
  });

  it('is available for users with remaining quota', () => {
    mocks.user = { id: 1 };
    mocks.quota = { used_percent: 40 };
    const { result } = renderHook(() => useAiAccess());
    expect(result.current.status).toBe('available');
    expect(result.current.hint).toBe('');
  });
});
