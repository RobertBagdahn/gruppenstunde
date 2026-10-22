import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderBanner() {
  const { default: PreviewBanner } = await import('./PreviewBanner');
  render(<PreviewBanner />);
}

describe('PreviewBanner', () => {
  it('shows the read-only notice in preview builds', async () => {
    vi.stubEnv('VITE_PREVIEW', '1');
    await renderBanner();
    expect(screen.getByRole('status')).toHaveTextContent('Vorschau – nur ansehen');
  });

  it('renders nothing in normal builds', async () => {
    vi.stubEnv('VITE_PREVIEW', '');
    await renderBanner();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
