// Helpers over the wiki page tree from /api/wiki. Pure, so the sidebar search and the question lookup are tested directly.

export type TreeNode = { path: string; title: string; description: string; kind: 'folder' | 'page'; status: string | null; children?: TreeNode[] };

/** Every page of the tree, depth first. */
export function flattenPages(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => (node.kind === 'page' ? [node] : flattenPages(node.children ?? [])));
}

/** Pages whose title or description contains the term (case-insensitive); empty term → no pages. */
export function searchPages(nodes: TreeNode[], term: string): TreeNode[] {
  const needle = term.trim().toLocaleLowerCase('de-DE');
  if (!needle) return [];
  return flattenPages(nodes).filter(
    (page) => page.title.toLocaleLowerCase('de-DE').includes(needle) || page.description.toLocaleLowerCase('de-DE').includes(needle),
  );
}

/** Page of an open question, e.g. "Q-080" → "open-questions/q-080-…md"; null when no such page exists. */
export function questionPagePath(nodes: TreeNode[], questionId: string): string | null {
  const prefix = `open-questions/${questionId.toLowerCase()}-`;
  return flattenPages(nodes).find((page) => page.path.startsWith(prefix))?.path ?? null;
}
