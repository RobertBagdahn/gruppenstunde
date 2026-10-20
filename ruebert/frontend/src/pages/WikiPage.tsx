import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useWikiPage, useWikiTree } from '@/api/queries';
import { Page } from '@/components/layout/Page';
import { SidebarSection } from '@/components/layout/Sidebar';
import { MarkdownView } from '@/components/shared/MarkdownView';
import { QueryState } from '@/components/shared/QueryState';
import { type TreeNode, questionPagePath, searchPages } from '@/lib/wikiTree';

const INDEX = 'index.md';

/** The wiki view (read-only): page tree and search in the sidebar, the page with its frontmatter in the content. */
export function WikiPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [term, setTerm] = useState('');
  const tree = useWikiTree();
  const question = searchParams.get('frage');
  const requested = params['*'] ?? '';

  // Links from settings ("offen Q-080") open the page of that question.
  const questionPath = question && tree.data ? questionPagePath(tree.data, question) : null;
  useEffect(() => {
    if (!requested && questionPath) navigate(`/wiki/${questionPath}`, { replace: true });
  }, [requested, questionPath, navigate]);

  const path = requested || INDEX;
  const page = useWikiPage(path);

  // Anchors from links ("#design-tokens") scroll to their heading once the page is rendered.
  useEffect(() => {
    if (!location.hash || !page.data) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [location.hash, page.data]);

  const nodes = tree.data ?? [];
  const results = searchPages(nodes, term);

  return (
    <Page
      area="Hilfe"
      page="Wissen"
      filterTitle="Seiten"
      onResetFilters={() => setTerm('')}
      filters={
        <SidebarSection title="Suche und Baum">
          <input
            type="search"
            aria-label="Wissen durchsuchen"
            placeholder="Titel oder Beschreibung"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="h-8 rounded-md border border-border-strong bg-panel px-2 text-dense text-foreground placeholder:text-muted-foreground"
          />
          {term.trim() ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-dense">
              {results.length === 0 && <li className="text-muted-foreground">Keine Treffer.</li>}
              {results.map((node) => (
                <li key={node.path}>
                  <Link to={`/wiki/${node.path}`} className="text-link">
                    {node.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <WikiTreeList nodes={nodes} activePath={path} />
          )}
        </SidebarSection>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <QueryState error={page.error ?? tree.error} isLoading={page.isLoading}>
          {page.data && (
            <>
              <header className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {page.data.type && <span className="rounded-sm border border-border px-1.5 text-label uppercase text-muted-foreground">{page.data.type}</span>}
                  {page.data.status === 'draft' && (
                    <span className="rounded-sm border border-warning-border bg-warning-soft px-1.5 text-caption text-warning-text">Arbeitsstand</span>
                  )}
                  <span className="font-mono text-caption text-muted-foreground">{page.data.path}</span>
                </div>
                <h2 className="m-0 text-title font-semibold text-foreground-strong">{page.data.title}</h2>
                {page.data.description && <p className="m-0 max-w-3xl text-dense text-muted-foreground">{page.data.description}</p>}
              </header>
              <MarkdownView source={page.data.body} fromPath={page.data.path} />
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}

function WikiTreeList({ nodes, activePath }: { nodes: TreeNode[]; activePath: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-dense">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.kind === 'folder' ? (
            <div className="flex flex-col gap-0.5">
              <span className="px-1 pt-1 text-caption uppercase text-muted-foreground">{node.title}</span>
              <WikiTreeList nodes={node.children ?? []} activePath={activePath} />
            </div>
          ) : (
            <Link
              to={`/wiki/${node.path}`}
              aria-current={node.path === activePath ? 'page' : undefined}
              className={`block truncate rounded-md px-2 py-1 no-underline ${
                node.path === activePath ? 'bg-row-active text-foreground-strong' : 'text-foreground-2 hover:bg-panel'
              }`}
            >
              {node.title}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
