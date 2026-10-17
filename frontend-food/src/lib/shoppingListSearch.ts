
/**
 * Folds text for matching: case, umlauts/accents and "ß" must not hide an entry.
 * Accents are stripped after NFD decomposition so "é" and "e" compare equal.
 */
export function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Keeps entries whose name contains the query; checked entries stay searchable. */
export function filterShoppingItems<T extends { name: string }>(items: T[], query: string): T[] {
  const needle = normalizeSearchText(query);
  if (needle === '') return items;
  return items.filter((item) => normalizeSearchText(item.name).includes(needle));
}
