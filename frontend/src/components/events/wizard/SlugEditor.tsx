/**
 * SlugEditor — auto-generated slug with edit mode and debounced uniqueness check.
 */
import { useState, useEffect, useCallback } from 'react';
import { useCheckSlug } from '@/api/events';

interface SlugEditorProps {
  name: string;
  slug: string | undefined;
  onSlugChange: (slug: string | undefined) => void;
}

/** Generate a URL-safe slug from a string */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export default function SlugEditor({ name, slug, onSlugChange }: SlugEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customSlug, setCustomSlug] = useState(slug || '');
  const autoSlug = slugify(name);
  const effectiveSlug = slug || autoSlug;

  // Debounced uniqueness check
  const [debouncedSlug, setDebouncedSlug] = useState(effectiveSlug);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSlug(effectiveSlug), 500);
    return () => clearTimeout(timer);
  }, [effectiveSlug]);

  const { data: slugCheck, isLoading: slugChecking } = useCheckSlug(
    debouncedSlug,
    debouncedSlug.length > 0,
  );

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setCustomSlug(effectiveSlug);
  }, [effectiveSlug]);

  const handleSave = useCallback(() => {
    const newSlug = slugify(customSlug);
    onSlugChange(newSlug === autoSlug ? undefined : newSlug);
    setIsEditing(false);
  }, [customSlug, autoSlug, onSlugChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setCustomSlug(slug || '');
  }, [slug]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">URL-Slug</label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">
          gruppenstunde.de/events/
        </span>
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              className="flex-1 px-2 py-1 rounded-md border text-sm bg-background"
              placeholder={autoSlug}
            />
            <button
              type="button"
              onClick={handleSave}
              className="text-primary text-xs hover:underline"
            >
              OK
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-muted-foreground text-xs hover:underline"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <code className="text-sm font-mono truncate">{effectiveSlug || '...'}</code>
            <button
              type="button"
              onClick={handleEdit}
              className="text-primary text-xs hover:underline shrink-0"
            >
              Bearbeiten
            </button>
          </div>
        )}
      </div>
      {/* Availability indicator */}
      {effectiveSlug.length > 0 && (
        <div className="flex items-center gap-1 text-xs">
          {slugChecking ? (
            <span className="text-muted-foreground">Prüfe Verfügbarkeit...</span>
          ) : slugCheck?.available ? (
            <span className="text-green-600 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Verfügbar
            </span>
          ) : slugCheck ? (
            <span className="text-destructive flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Vergeben
              {slugCheck.suggestion && (
                <button
                  type="button"
                  onClick={() => {
                    onSlugChange(slugCheck.suggestion);
                    setCustomSlug(slugCheck.suggestion);
                  }}
                  className="ml-1 text-primary hover:underline"
                >
                  Vorschlag: {slugCheck.suggestion}
                </button>
              )}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
