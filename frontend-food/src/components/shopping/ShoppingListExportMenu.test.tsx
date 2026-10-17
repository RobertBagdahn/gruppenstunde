// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingListItemSchema, type ShoppingListItem } from '@/schemas/shoppingList';
import ShoppingListExportMenu from './ShoppingListExportMenu';

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify }));

function item(id: number, name: string, is_checked = false): ShoppingListItem {
  return ShoppingListItemSchema.parse({
    id,
    name,
    quantity_g: 400,
    unit: 'g',
    is_checked,
    retail_section_name: 'Obst und Gemüse',
    sort_order: id,
  });
}

function setNavigator(key: 'share' | 'clipboard', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Liste exportieren' }));
}

describe('ShoppingListExportMenu', () => {
  beforeEach(() => {
    notify.success.mockReset();
    notify.error.mockReset();
  });

  afterEach(() => {
    setNavigator('share', undefined);
    setNavigator('clipboard', undefined);
  });

  it('offers print and copy, and offers sharing only where the browser can share', async () => {
    const user = userEvent.setup();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Drucken oder als PDF speichern' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Text kopieren' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Als Text teilen' })).not.toBeInTheDocument();
  });

  it('shows "Als Text teilen" when navigator.share exists', async () => {
    setNavigator('share', vi.fn());
    const user = userEvent.setup();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Als Text teilen' })).toBeInTheDocument();
  });

  it('hands printing to the page', async () => {
    const user = userEvent.setup();
    const onPrint = vi.fn();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={onPrint} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Drucken oder als PDF speichern' }));

    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('shares the list text with the list name as title', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator('share', share);
    const user = userEvent.setup();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Als Text teilen' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const payload = share.mock.calls[0][0] as { title: string; text: string };
    expect(payload.title).toBe('Lager');
    expect(payload.text).toContain('Einkaufsliste: Lager');
    expect(payload.text).toContain('☐ Möhren – 400 g');
  });

  it('stays silent when the user closes the share sheet', async () => {
    setNavigator('share', vi.fn().mockRejectedValue(new DOMException('Share cancelled', 'AbortError')));
    const user = userEvent.setup();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Als Text teilen' }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('reports a failed share', async () => {
    setNavigator('share', vi.fn().mockRejectedValue(new Error('no target')));
    const user = userEvent.setup();
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Als Text teilen' }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith('Liste konnte nicht geteilt werden', expect.anything()),
    );
  });

  it('copies the text and confirms it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator('clipboard', { writeText });
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Text kopieren' }));

    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Liste kopiert'));
    expect(writeText.mock.calls[0][0]).toContain('☐ Möhren – 400 g');
  });

  it('reports a refused clipboard', async () => {
    const user = userEvent.setup();
    setNavigator('clipboard', { writeText: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) });
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren')]} onPrint={vi.fn()} />);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Text kopieren' }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith('Liste konnte nicht kopiert werden', expect.anything()),
    );
  });

  it('is disabled with the hint when every entry is checked', () => {
    render(<ShoppingListExportMenu listName="Lager" items={[item(1, 'Möhren', true)]} onPrint={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Liste exportieren' });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('title', 'Alles abgehakt – nichts zu exportieren');
  });
});
