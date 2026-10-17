/**
 * Export of an open shopping list for checking off on paper or in another app.
 * Pure functions: the print view and the text export render the same structure.
 */
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { formatItemQuantityLabel } from '@/lib/shoppingItemDisplay';
import { groupBySection } from '@/lib/shoppingListSections';

export interface ExportEntry {
  name: string;
  /** Amount with package need, empty when the entry has none. */
  quantity: string;
  /** Public display name of whoever took care of buying it. */
  claimedBy: string | null;
}

export interface ExportSection {
  title: string;
  entries: ExportEntry[];
}

export interface ShoppingListExport {
  title: string;
  /** "17.10.2026, 09:30 Uhr" in the device's time zone. */
  stamp: string;
  openCount: number;
  checkedCount: number;
  sections: ExportSection[];
}

const pad = (value: number) => String(value).padStart(2, '0');

function formatStamp(now: Date): string {
  const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  return `${date}, ${pad(now.getHours())}:${pad(now.getMinutes())} Uhr`;
}

/** Only open entries are exported; sections without open entries disappear. */
export function buildShoppingListExport(listName: string, items: ShoppingListItem[], now: Date): ShoppingListExport {
  const open = items.filter((item) => !item.is_checked);
  const groups = groupBySection(open);
  return {
    title: listName,
    stamp: formatStamp(now),
    openCount: open.length,
    checkedCount: items.length - open.length,
    sections: Object.entries(groups).map(([title, sectionItems]) => ({
      title,
      entries: sectionItems.map((item) => ({
        name: item.name,
        quantity: formatItemQuantityLabel(item),
        claimedBy: item.claimed_by_display_name,
      })),
    })),
  };
}

function formatEntryLine(entry: ExportEntry): string {
  const quantity = entry.quantity ? ` – ${entry.quantity}` : '';
  const claimed = entry.claimedBy ? ` (${entry.claimedBy})` : '';
  return `☐ ${entry.name}${quantity}${claimed}`;
}

/** Plain text for WhatsApp, notes apps and Google Keep: bold section headings, one ☐ line per entry. */
export function formatShoppingListText(data: ShoppingListExport): string {
  const counts = [`${data.openCount} offen`];
  if (data.checkedCount > 0) counts.push(`${data.checkedCount} schon abgehakt`);

  const lines = [`Einkaufsliste: ${data.title}`, `Stand ${data.stamp} · ${counts.join(' · ')}`, ''];
  data.sections.forEach((section, index) => {
    if (index > 0) lines.push('');
    lines.push(`*${section.title}*`);
    for (const entry of section.entries) lines.push(formatEntryLine(entry));
  });
  return lines.join('\n');
}
