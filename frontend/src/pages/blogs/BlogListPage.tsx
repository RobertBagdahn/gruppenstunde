/**
 * BlogListPage — Listing page for Blogs with filters.
 * URL-driven filter state for bookmarkability.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useBlogs, useDeleteBlog } from '@/api/blogs';
import BlogCard from '@/components/content/BlogCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ListPageHero from '@/components/shared/ListPageHero';
import EmptyState from '@/components/shared/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import SortSelect from '@/components/shared/SortSelect';
import { toast } from 'sonner';
import {
  DIFFICULTY_OPTIONS,
} from '@/schemas/content';
import {
  BLOG_TYPE_OPTIONS,
  type BlogFilter,
} from '@/schemas/blog';

/* ------------------------------------------------------------------ */
/*  Sort options                                                       */
/* ------------------------------------------------------------------ */

const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Aelteste' },
  { value: 'popular', label: 'Beliebteste' },
  { value: 'most_liked', label: 'Am meisten gemocht' },
] as const;

/* ------------------------------------------------------------------ */
/*  URL <-> Filter sync                                                */
/* ------------------------------------------------------------------ */

function filtersFromParams(params: URLSearchParams): Partial<BlogFilter> {
  const filters: Partial<BlogFilter> = {
    page: 1,
    page_size: 20,
  };
  const q = params.get('q');
  if (q) filters.q = q;
  const blogType = params.get('blog_type');
  if (blogType) filters.blog_type = blogType;
  const difficulty = params.get('difficulty');
  if (difficulty) filters.difficulty = difficulty;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = params.get('page');
  if (page) filters.page = Number(page);
  return filters;
}

function filtersToParams(filters: Partial<BlogFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.blog_type) params.set('blog_type', filters.blog_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = filtersFromParams(searchParams);
  const { data, isLoading, error, refetch } = useBlogs(filters);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const deleteBlog = useDeleteBlog(deleteTarget?.id ?? 0);

  useEffect(() => {
    document.title = 'Blog – Inspi';
  }, []);

  const updateFilter = (key: keyof BlogFilter, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  const setPage = (page: number) => {
    const newFilters = { ...filters, page };
    setSearchParams(filtersToParams(newFilters), { replace: true });
  };

  return (
    <EntityLinkContext.Provider value="list">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <ListPageHero
        title="Blog"
        description="Wissensbeitraege, Tutorials und Erfahrungsberichte rund um die Pfadfinderarbeit. Von Methodik ueber Recht bis hin zu praktischen Tipps."
        icon="article"
        gradientClasses="bg-gradient-to-br from-indigo-500 to-blue-600"
        totalCount={data?.total}
        countLabel="Beitrag"
      />

      {/* Search + Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Blog durchsuchen..."
            value={filters.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <FilterSelect
          label="Kategorie"
          value={filters.blog_type ?? ''}
          options={BLOG_TYPE_OPTIONS}
          onChange={(v) => updateFilter('blog_type', v)}
        />
        <FilterSelect
          label="Schwierigkeit"
          value={filters.difficulty ?? ''}
          options={DIFFICULTY_OPTIONS}
          onChange={(v) => updateFilter('difficulty', v)}
        />
        <SortSelect
          value={filters.sort ?? 'newest'}
          onChange={(v) => updateFilter('sort', v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-72" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && <ErrorDisplay error={error} onRetry={() => refetch()} />}

      {/* Results */}
      {data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {data.total} Beitrag{data.total !== 1 ? 'e' : ''} gefunden
            </p>
          </div>

          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.items.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  typeLabel={
                    BLOG_TYPE_OPTIONS.find((t) => t.value === blog.blog_type)?.label
                  }
                  canEdit={blog.can_edit}
                  canDelete={blog.can_delete}
                  onEdit={() => navigate(`/blogs/${blog.slug}`)}
                  onDelete={() => setDeleteTarget({ id: blog.id, title: blog.title })}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search_off"
              title="Keine Blogbeitraege gefunden"
              description="Versuche andere Filtereinstellungen."
              ctaLabel="Blogbeitrag erstellen"
              ctaHref="/create"
            />
          )}

          {/* Pagination */}
          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => {
          deleteBlog.mutate(undefined, {
            onSuccess: () => {
              toast.success('Blogbeitrag gelöscht');
              setDeleteTarget(null);
              refetch();
            },
            onError: (err) => {
              toast.error('Fehler beim Löschen', { description: err.message });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title={`"${deleteTarget?.title}" löschen?`}
        description="Der Blogbeitrag wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteBlog.isPending}
      />
    </div>
    </EntityLinkContext.Provider>
  );
}
