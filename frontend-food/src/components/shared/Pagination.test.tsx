import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Pagination from './Pagination';

function renderAt(search: string, props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  render(
    <MemoryRouter initialEntries={[`/recipes${search}`]}>
      <Pagination currentPage={2} totalPages={5} {...props} />
    </MemoryRouter>,
  );
}

describe('pagination (food-seo-markup: echte Links auf ?page=N)', () => {
  it('links every page number to ?page=N', () => {
    renderAt('');
    expect(screen.getByRole('link', { name: 'Seite 3' })).toHaveAttribute('href', '/recipes?page=3');
    expect(screen.getByRole('link', { name: 'Seite 1' })).toHaveAttribute('href', '/recipes?page=1');
  });

  it('keeps the other query parameters', () => {
    renderAt('?q=chili&sort=newest');
    expect(screen.getByRole('link', { name: 'Seite 4' })).toHaveAttribute('href', '/recipes?q=chili&sort=newest&page=4');
  });

  it('marks the current page and disables the arrow at the end', () => {
    renderAt('', { currentPage: 5, totalPages: 5 });
    expect(screen.queryByRole('link', { name: 'Seite 5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Nächste Seite' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onPageChange in place and keeps the href valid', async () => {
    const onPageChange = vi.fn();
    renderAt('', { onPageChange });
    await userEvent.click(screen.getByRole('link', { name: 'Seite 4' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole('link', { name: 'Seite 4' })).toHaveAttribute('href', '/recipes?page=4');
  });

  it('renders nothing for a single page', () => {
    const { container } = render(
      <MemoryRouter>
        <Pagination currentPage={1} totalPages={1} />
      </MemoryRouter>,
    );
    expect(container.querySelector('nav')).toBeNull();
  });
});
