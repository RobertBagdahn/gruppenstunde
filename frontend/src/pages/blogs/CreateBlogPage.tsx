/**
 * CreateBlogPage — Blog creation using the shared ContentStepper.
 * Adds blog-specific fields: blog_type, show_table_of_contents.
 * Hides preparation_time since blogs don't have it.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateBlog } from '@/api/blogs';
import { BLOG_TYPE_OPTIONS } from '@/schemas/blog';

export default function CreateBlogPage() {
  const navigate = useNavigate();
  const createBlog = useCreateBlog();

  // Blog-specific state
  const [blogType, setBlogType] = useState('');
  const [showToc, setShowToc] = useState(true);

  async function handleSave(formData: ContentFormData) {
    try {
      const result = await createBlog.mutateAsync({
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        difficulty: formData.difficulty || undefined,
        costs_rating: formData.costsRating || undefined,
        execution_time: formData.executionTime || undefined,
        blog_type: blogType || undefined,
        show_table_of_contents: showToc,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
      });
      toast.success('Blog-Beitrag erstellt!');
      navigate(`/blogs/${result.slug}`);
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <ContentStepper
      typeLabel="Blog-Beitrag"
      typeIcon="article"
      typeGradient="from-indigo-500 to-blue-600"
      isSaving={createBlog.isPending}
      onSave={handleSave}
      hidePreparationTime
      renderTypeFields={() => (
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h3 className="text-sm font-medium">Blog-Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Art des Beitrags</label>
              <select
                value={blogType}
                onChange={(e) => setBlogType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Wählen —</option>
                {BLOG_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end">
              <input
                type="checkbox"
                id="show-toc"
                checked={showToc}
                onChange={(e) => setShowToc(e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="show-toc" className="text-sm">
                Inhaltsverzeichnis anzeigen
              </label>
            </div>
          </div>
        </div>
      )}
      renderPreviewExtras={() => (
        <>
          {blogType && (
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">article</span>
                {BLOG_TYPE_OPTIONS.find((o) => o.value === blogType)?.label ?? blogType}
              </span>
              {showToc && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">toc</span>
                  Mit Inhaltsverzeichnis
                </span>
              )}
            </div>
          )}
        </>
      )}
    />
  );
}
