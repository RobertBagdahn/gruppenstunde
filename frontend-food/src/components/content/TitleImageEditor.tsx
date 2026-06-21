/**
 * TitleImageEditor — editable hero image for content detail pages.
 *
 * Renders the hero image with an edit overlay (when canEdit is true).
 * Supports three actions: file upload, AI image generation, and image removal.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { type UseMutationResult } from '@tanstack/react-query';
import { useGenerateImage } from '@/api/ai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 500 * 1024; // 500KB

interface TitleImageEditorProps {
  /** Content type identifier passed to AI image generation (e.g. 'session', 'blog', 'game', 'recipe') */
  contentType: string;
  imageUrl: string | null;
  canEdit: boolean;
  title: string;
  summary?: string;
  fallbackImage: string;
  uploadMutation: UseMutationResult<{ image_url: string }, Error, File>;
  deleteMutation: UseMutationResult<{ image_url: null }, Error, void>;
  setFromUrlMutation: UseMutationResult<{ image_url: string }, Error, string>;
  /** Additional content to render inside the image overlay (e.g. badges, title) */
  children?: React.ReactNode;
}

export default function TitleImageEditor({
  contentType,
  imageUrl,
  canEdit,
  title,
  summary,
  fallbackImage,
  uploadMutation,
  deleteMutation,
  setFromUrlMutation,
  children,
}: TitleImageEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Das Bild darf maximal 500KB gross sein');
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: () => toast.success('Bild erfolgreich hochgeladen'),
      onError: () => toast.error('Bild konnte nicht hochgeladen werden'),
    });

    // Reset input so the same file can be selected again
    e.target.value = '';
    setShowMenu(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Titelbild entfernt');
        setShowDeleteConfirm(false);
      },
      onError: () => toast.error('Titelbild konnte nicht entfernt werden'),
    });
  };

  const isUploading = uploadMutation.isPending || setFromUrlMutation.isPending;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg max-w-lg mx-auto aspect-square bg-muted/10">
      {/* Image or Icon Placeholder */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className={cn(
            'w-full h-full object-cover',
            isUploading && 'opacity-50',
          )}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            restaurant
          </span>
        </div>
      )}

      {/* Loading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="material-symbols-outlined text-4xl text-white animate-spin">
            progress_activity
          </span>
        </div>
      )}

      {/* Gradient overlay (always visible) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Child content (badges, title, etc.) */}
      {children}

      {/* Edit overlay */}
      {canEdit && !isUploading && (
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition"
            aria-label="Titelbild bearbeiten"
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              {/* Click-away backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-12 z-20 min-w-[200px] rounded-xl border bg-card shadow-lg py-1">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowMenu(false);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Bild hochladen
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition"
                  onClick={() => {
                    setShowAiModal(true);
                    setShowMenu(false);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  Bild mit KI generieren
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition',
                    imageUrl
                      ? 'hover:bg-muted text-destructive'
                      : 'opacity-40 cursor-not-allowed',
                  )}
                  disabled={!imageUrl}
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Bild entfernen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* AI Generation Modal */}
      <AiImageModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        contentType={contentType}
        title={title}
        summary={summary}
        onSelect={(url) => {
          setFromUrlMutation.mutate(url, {
            onSuccess: () => {
              toast.success('KI-Bild wurde gesetzt');
              setShowAiModal(false);
            },
            onError: () => toast.error('KI-Bild konnte nicht gesetzt werden'),
          });
        }}
        isSettingImage={setFromUrlMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Titelbild entfernen?"
        description="Das Titelbild wird entfernt. Der Platzhalter wird stattdessen angezeigt."
        confirmLabel="Entfernen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Image Generation Modal
// ---------------------------------------------------------------------------

interface AiImageModalProps {
  open: boolean;
  onClose: () => void;
  contentType: string;
  title: string;
  summary?: string;
  onSelect: (url: string) => void;
  isSettingImage: boolean;
}

function AiImageModal({
  open,
  onClose,
  contentType,
  title,
  summary,
  onSelect,
  isSettingImage,
}: AiImageModalProps) {
  const [prompt, setPrompt] = useState('');
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const generateImage = useGenerateImage();

  // Content-type-specific prompt templates
  const getDefaultPrompt = () => {
    switch (contentType) {
      case 'recipe':
        return `Ein appetitliches Foto von ${title}`;
      case 'session':
        return `Eine Illustration einer Pfadfinder-Aktivität: ${title}`;
      case 'game':
        return `Eine Illustration eines Spiels: ${title}`;
      case 'blog':
        return `Eine Illustration zum Thema: ${title}`;
      default:
        return [title, summary].filter(Boolean).join(' - ');
    }
  };

  // Pre-fill prompt when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !prompt) {
      setPrompt(getDefaultPrompt());
    }
    if (!isOpen) {
      onClose();
    }
  };

  const handleGenerate = () => {
    const effectivePrompt = prompt.trim() || getDefaultPrompt();

    generateImage.mutate(
      { prompt: effectivePrompt, title, summary: summary ?? '', content_type: contentType },
      {
        onSuccess: (data) => {
          setGeneratedUrls(data.image_urls);
        },
        onError: (err) => {
          toast.error('KI-Bildgenerierung fehlgeschlagen', {
            description: err.message,
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bild mit KI generieren</DialogTitle>
          <DialogDescription>
            Beschreibe das gewünschte Bild oder nutze den Vorschlag.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt input */}
          <div>
            <label htmlFor="ai-image-prompt" className="text-sm font-medium mb-1.5 block">
              Bildbeschreibung
            </label>
            <textarea
              id="ai-image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Beschreibe das Bild..."
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateImage.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {generateImage.isPending ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">
                  progress_activity
                </span>
                Generiere...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Generieren
              </>
            )}
          </button>

          {/* Loading skeleton */}
          {generateImage.isPending && generatedUrls.length === 0 && (
            <div className="aspect-square rounded-lg bg-muted animate-pulse max-w-xs mx-auto" />
          )}

          {/* Generated images grid */}
          {generatedUrls.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Klicke auf das Bild, um es als Titelbild zu setzen:
              </p>
              <div className="max-w-xs mx-auto">
                {generatedUrls.slice(0, 1).map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onSelect(url)}
                    disabled={isSettingImage}
                    className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition group focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <img
                      src={url}
                      alt="KI-generiertes Bild"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition drop-shadow-lg">
                        check_circle
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {generateImage.isError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {generateImage.error.message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
