/**
 * BlogDetailPage — Detail page for a single Blog.
 * Supports slug-based routing (/blogs/:slug).
 * Features: auto-generated Table of Contents from Markdown headings, reading time.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useBlogBySlug,
  useBlogComments,
  useToggleBlogEmotion,
  useCreateBlogComment,
  useUpdateBlog,
  useDeleteBlog,
} from '@/api/blogs';
import { useCurrentUser } from '@/api/auth';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_RATING_OPTIONS,
} from '@/schemas/content';
import { BLOG_TYPE_OPTIONS } from '@/schemas/blog';
import ContentStatusBadge from '@/components/content/ContentStatusBadge';
import ContentEmotions from '@/components/content/ContentEmotions';
import ContentComments from '@/components/content/ContentComments';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import InlineEditor from '@/components/content/InlineEditor';
import AuthorInfo from '@/components/content/AuthorInfo';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// Scout level colors
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Woelflinge': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  'Jungpfadfinder': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'Pfadfinder': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'Rover': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

// --- Table of Contents extraction ---

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split('\n');
  const entries: TocEntry[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Track code blocks to skip headings inside them
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      entries.push({ level, text, id });
    }
  }
  return entries;
}

function InfoCard({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
      </div>
      <span className="text-sm font-bold text-foreground leading-tight">{label}</span>
      <span className="text-xs font-medium text-muted-foreground">{sublabel}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table of Contents component                                        */
/* ------------------------------------------------------------------ */

function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    );

    for (const tocEntry of entries) {
      const el = document.getElementById(tocEntry.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav className="bg-muted/30 rounded-xl border border-border/50 p-5 mb-8">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
        <span className="material-symbols-outlined text-[18px]">toc</span>
        Inhaltsverzeichnis
      </h3>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li
            key={entry.id}
            style={{ paddingLeft: `${(entry.level - 1) * 16}px` }}
          >
            <a
              href={`#${entry.id}`}
              className={`block text-sm py-0.5 transition-colors hover:text-primary ${
                activeId === entry.id
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(entry.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveId(entry.id);
                }
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: blog, isLoading, error, refetch } = useBlogBySlug(slug ?? '');
  const blogId = blog?.id ?? 0;

  const { data: comments = [] } = useBlogComments(blogId);
  const toggleEmotion = useToggleBlogEmotion(blogId);
  const createComment = useCreateBlogComment(blogId);
  const updateBlog = useUpdateBlog(blogId);
  const deleteBlog = useDeleteBlog(blogId);
  const { data: user } = useCurrentUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tocEntries = useMemo(
    () => (blog?.description ? extractToc(blog.description) : []),
    [blog?.description],
  );

  useDocumentMeta({
    title: blog?.title,
    description: blog?.summary,
    url: slug ? `/blogs/${slug}` : undefined,
    image: blog?.image_url,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!blog) return null;

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === blog.difficulty)?.label ?? blog.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === blog.execution_time)?.label ??
    blog.execution_time;
  const costsLabel =
    COSTS_RATING_OPTIONS.find((c) => c.value === blog.costs_rating)?.label ??
    blog.costs_rating;
  const blogTypeLabel =
    BLOG_TYPE_OPTIONS.find((t) => t.value === blog.blog_type)?.label ??
    blog.blog_type;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteBlog.mutate(undefined, {
            onSuccess: () => {
              toast.success('Blogbeitrag geloescht');
              setShowDeleteConfirm(false);
              navigate('/blogs');
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Blogbeitrag loeschen?"
        description="Der Blogbeitrag wird geloescht und ist nicht mehr sichtbar."
        confirmLabel="Loeschen"
        loading={deleteBlog.isPending}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">Startseite</Link>
        <span>/</span>
        <Link to="/blogs" className="hover:text-primary">Blog</Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{blog.title}</span>
        {blog.can_delete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            title="Blogbeitrag loeschen"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden sm:inline">Loeschen</span>
          </button>
        )}
      </nav>

      {/* Hero Image */}
      <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg max-w-lg mx-auto aspect-square">
        <img
          src={blog.image_url || '/images/inspi_flying.png'}
          alt={blog.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ContentStatusBadge status={blog.status} />
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
              <span className="material-symbols-outlined text-[14px]">article</span>
              {blogTypeLabel}
            </span>
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-muted-foreground shadow-sm">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {blog.reading_time_minutes} Min. Lesezeit
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            {blog.title}
          </h1>
        </div>
      </div>

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <InfoCard
          icon="schedule"
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          label={timeLabel}
          sublabel="Dauer"
        />
        <InfoCard
          icon="signal_cellular_alt"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label={difficultyLabel}
          sublabel="Schwierigkeit"
        />
        <InfoCard
          icon="payments"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label={costsLabel}
          sublabel="Kosten"
        />
        <InfoCard
          icon="auto_stories"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label={`${blog.reading_time_minutes} Min.`}
          sublabel="Lesezeit"
        />
      </div>

      {/* Scout Levels */}
      {blog.scout_levels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {blog.scout_levels.map((level) => {
            const colors = SCOUT_LEVEL_COLORS[level.name] ?? {
              bg: 'bg-muted',
              border: 'border-border',
              text: 'text-foreground',
            };
            return (
              <span
                key={level.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${colors.bg} ${colors.border} ${colors.text}`}
              >
                {level.icon && (
                  <span className="material-symbols-outlined text-[14px]">{level.icon}</span>
                )}
                {level.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {blog.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {blog.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold"
            >
              {tag.icon && (
                <span className="material-symbols-outlined text-[14px]">{tag.icon}</span>
              )}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {blog.summary && (
        <InlineEditor
          mode="textarea"
          label="Kurzbeschreibung"
          value={blog.summary}
          canEdit={blog.can_edit ?? false}
          aiField="summary"
          onSave={(val) => updateBlog.mutateAsync({ summary: val })}
          isSaving={updateBlog.isPending}
          className="mb-8"
        >
          <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
            <p className="text-base text-foreground leading-relaxed">{blog.summary}</p>
          </div>
        </InlineEditor>
      )}

      {/* Table of Contents */}
      {blog.show_table_of_contents && tocEntries.length > 0 && (
        <TableOfContents entries={tocEntries} />
      )}

      {/* Description / Content */}
      {blog.description && (
        <InlineEditor
          mode="markdown"
          label="Inhalt"
          value={blog.description}
          canEdit={blog.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateBlog.mutateAsync({ description: val })}
          isSaving={updateBlog.isPending}
          className="mb-8"
        >
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={blog.description} />
          </div>
        </InlineEditor>
      )}

      {/* Authors */}
      <AuthorInfo
        authors={blog.authors ?? []}
        createdAt={blog.created_at}
        className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/50"
      />

      {/* Emotions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3">Wie findest du diesen Beitrag?</h3>
        <ContentEmotions
          emotionCounts={blog.emotion_counts ?? {}}
          userEmotion={blog.user_emotion ?? null}
          onToggle={(emotionType) => toggleEmotion.mutate({ emotion_type: emotionType })}
          isPending={toggleEmotion.isPending}
        />
      </div>

      {/* Similar Blogs */}
      {(blog.similar_blogs?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">Aehnliche Beitraege</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blog.similar_blogs!.map((similar) => (
              <Link
                key={similar.id}
                to={`/blogs/${similar.slug}`}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {similar.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{similar.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Content */}
      <ContentLinkSection contentType="blog" objectId={blogId} />

      {/* Comments */}
      <div className="border-t border-border pt-8">
        <ContentComments
          comments={comments}
          onSubmit={(data) => createComment.mutate(data)}
          isPending={createComment.isPending}
          isAuthenticated={!!user}
        />
      </div>
    </div>
  );
}
