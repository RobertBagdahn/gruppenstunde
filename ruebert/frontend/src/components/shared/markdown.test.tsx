import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { MarkdownView } from './MarkdownView';

describe('MarkdownView (wiki-viewer spec)', () => {
  it('renders tables and headings in the theme', () => {
    renderWithProviders(
      <MarkdownView fromPath="plan/frontend.md" source={'## Tokens\n\n| Token | Wert |\n| --- | --- |\n| panel | #111827 |\n'} />,
    );
    expect(screen.getByRole('heading', { name: 'Tokens' })).toHaveAttribute('id', 'tokens');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
  });

  it('never renders a script from the page', () => {
    const { container } = renderWithProviders(
      <MarkdownView fromPath="index.md" source={'Vorher\n\n<script>window.hacked = true</script>\n\nNachher'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Vorher')).toBeInTheDocument();
    expect((window as unknown as { hacked?: boolean }).hacked).toBeUndefined();
  });

  it('keeps relative page links with anchors inside /wiki', () => {
    renderWithProviders(<MarkdownView fromPath="requirements/index.md" source={'[Frontend](../plan/frontend.md#design-tokens)'} />);
    expect(screen.getByRole('link', { name: 'Frontend' })).toHaveAttribute('href', '/wiki/plan/frontend.md#design-tokens');
  });

  it('shows links that leave knowledge/ as plain text, and external links in a new tab', () => {
    renderWithProviders(
      <MarkdownView fromPath="index.md" source={'[Quelltext](../src/main.tsx) und [Extern](https://example.org)'} />,
    );
    expect(screen.queryByRole('link', { name: 'Quelltext' })).not.toBeInTheDocument();
    expect(screen.getByText('Quelltext')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Extern' })).toHaveAttribute('target', '_blank');
  });
});
