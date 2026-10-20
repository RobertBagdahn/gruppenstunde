import { describe, expect, it } from 'vitest';

import { joinWikiPath, resolveWikiLink, slugOf } from './wikiLinks';

describe('joinWikiPath', () => {
  it('resolves siblings, parents and nested folders', () => {
    expect(joinWikiPath('plan/backend.md', 'frontend.md')).toBe('plan/frontend.md');
    expect(joinWikiPath('plan/backend.md', '../business/index.md')).toBe('business/index.md');
    expect(joinWikiPath('open-questions/q-050.md', './q-080.md')).toBe('open-questions/q-080.md');
  });

  it('refuses to leave the knowledge root', () => {
    expect(joinWikiPath('index.md', '../README.md')).toBeNull();
    expect(joinWikiPath('plan/a.md', '../../AGENTS.md')).toBeNull();
  });
});

describe('resolveWikiLink', () => {
  it('keeps relative page links with anchors inside /wiki (wiki-viewer spec)', () => {
    expect(resolveWikiLink('requirements/index.md', '../plan/frontend.md#design-tokens')).toEqual({
      kind: 'internal',
      to: '/wiki/plan/frontend.md#design-tokens',
    });
  });

  it('turns folder links into their index page', () => {
    expect(resolveWikiLink('index.md', 'business/')).toEqual({ kind: 'internal', to: '/wiki/business/index.md' });
  });

  it('keeps same-page anchors on the page', () => {
    expect(resolveWikiLink('plan/frontend.md', '#layout')).toEqual({ kind: 'anchor', hash: '#layout' });
  });

  it('marks external links and links leaving knowledge/ as not followed', () => {
    expect(resolveWikiLink('index.md', 'https://example.org/x')).toEqual({ kind: 'external', href: 'https://example.org/x' });
    expect(resolveWikiLink('index.md', '../src/main.tsx')).toEqual({ kind: 'outside' });
  });
});

describe('slugOf', () => {
  it('matches the heading ids of rehype-slug for German headings', () => {
    expect(slugOf('Design-Tokens')).toBe('design-tokens');
    expect(slugOf('Was ist „Ampel“?')).toBe('was-ist-ampel');
  });
});
