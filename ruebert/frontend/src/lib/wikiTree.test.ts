import { describe, expect, it } from 'vitest';

import { questionPagePath, searchPages, type TreeNode } from './wikiTree';

const TREE: TreeNode[] = [
  { path: 'index.md', title: 'Wissen', description: 'Startseite', kind: 'page', status: 'stable' },
  {
    path: 'open-questions',
    title: 'Offene Fragen',
    description: '',
    kind: 'folder',
    status: null,
    children: [
      { path: 'open-questions/q-050-rundungsregel.md', title: 'Q-050: Rundungsregel', description: 'Aufrunden ab X %', kind: 'page', status: 'draft' },
      { path: 'open-questions/q-080-ampel-schwellen.md', title: 'Q-080: Ampel', description: 'Schwellen', kind: 'page', status: 'draft' },
    ],
  },
];

describe('searchPages', () => {
  it('finds pages by title or description, ignoring case', () => {
    expect(searchPages(TREE, 'rundung').map((p) => p.path)).toEqual(['open-questions/q-050-rundungsregel.md']);
    expect(searchPages(TREE, 'AUFRUNDEN').map((p) => p.path)).toEqual(['open-questions/q-050-rundungsregel.md']);
  });

  it('returns nothing for an empty term', () => {
    expect(searchPages(TREE, '  ')).toEqual([]);
  });
});

describe('questionPagePath', () => {
  it('opens the page of a question from its ID (settings links)', () => {
    expect(questionPagePath(TREE, 'Q-080')).toBe('open-questions/q-080-ampel-schwellen.md');
  });

  it('returns null for an unknown question', () => {
    expect(questionPagePath(TREE, 'Q-999')).toBeNull();
  });
});
