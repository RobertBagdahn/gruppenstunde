import type { ComponentPropsWithoutRef } from 'react';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { resolveWikiLink } from '@/lib/wikiLinks';

/**
 * Renders a wiki page: GitHub-flavoured Markdown, no raw HTML (react-markdown drops it, so scripts never run),
 * headings with anchors, and links rewritten to stay inside /wiki.
 */
export function MarkdownView({ source, fromPath }: { source: string; fromPath: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3 text-body text-foreground-2">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: (props) => <h1 className="mb-1 mt-4 text-title font-semibold text-foreground-strong" {...props} />,
          h2: (props) => <h2 className="mb-1 mt-5 text-section font-semibold text-foreground-strong" {...props} />,
          h3: (props) => <h3 className="mb-0.5 mt-3 text-emphasis font-semibold text-foreground-strong" {...props} />,
          p: (props) => <p className="m-0 leading-relaxed" {...props} />,
          ul: (props) => <ul className="m-0 flex list-disc flex-col gap-1 pl-5" {...props} />,
          ol: (props) => <ol className="m-0 flex list-decimal flex-col gap-1 pl-5" {...props} />,
          blockquote: (props) => <blockquote className="m-0 border-l-2 border-border-strong pl-3 text-muted-foreground" {...props} />,
          code: (props) => <code className="rounded-sm bg-sunken px-1 font-mono text-dense text-foreground" {...props} />,
          pre: (props) => <pre className="overflow-x-auto rounded-lg border border-border bg-sunken p-3 font-mono text-dense" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-dense" {...props} />
            </div>
          ),
          th: (props) => <th className="border-b border-border px-3 py-2 text-left text-label uppercase text-muted-foreground" {...props} />,
          td: (props) => <td className="border-b border-border-row px-3 py-2 align-top" {...props} />,
          a: (props) => <WikiAnchor fromPath={fromPath} {...props} />,
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}

function WikiAnchor({ fromPath, href, children, ...rest }: ComponentPropsWithoutRef<'a'> & { fromPath: string }) {
  const link = resolveWikiLink(fromPath, href ?? '');
  switch (link.kind) {
    case 'internal':
      return (
        <Link to={link.to} className="text-link">
          {children}
        </Link>
      );
    case 'anchor':
      return (
        <a href={link.hash} className="text-link">
          {children}
        </a>
      );
    case 'external':
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-link" {...rest}>
          {children}
        </a>
      );
    case 'outside':
      // Links that leave knowledge/ are not followed; the text stays readable.
      return <span className="text-muted-foreground">{children}</span>;
  }
}
