/**
 * InlineEditor — Dialog-based inline editing for content detail pages.
 *
 * Shows a pencil button in the top-right corner of a section.
 * Clicking opens a dialog with the field editor and an optional "KI-Vorschlag" button.
 * On save, calls the provided onSave callback which should PATCH the API and invalidate cache.
 *
 * Supports two modes:
 * - "text": simple text input or textarea
 * - "markdown": MarkdownEditor for rich text
 * - "select": dropdown for enum fields
 */
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useImproveText } from '@/api/ai';
import MarkdownEditor from '@/components/MarkdownEditor';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BaseProps {
  /** The label of the field being edited */
  label: string;
  /** Whether the current user can edit */
  canEdit: boolean;
  /** Called with the new value when user clicks Save */
  onSave: (value: string) => void | Promise<unknown>;
  /** Whether saving is in progress */
  isSaving?: boolean;
  /** AI field key for improve-text API (e.g. "title", "summary", "description") */
  aiField?: string;
  /** Children to render in read-only mode */
  children: ReactNode;
  /** Optional extra class on the wrapper */
  className?: string;
}

interface TextEditorProps extends BaseProps {
  mode: 'text' | 'textarea';
  value: string;
}

interface MarkdownEditorProps extends BaseProps {
  mode: 'markdown';
  value: string;
}

interface SelectEditorProps extends BaseProps {
  mode: 'select';
  value: string;
  options: readonly { value: string; label: string }[];
}

export type InlineEditorProps = TextEditorProps | MarkdownEditorProps | SelectEditorProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InlineEditor(props: InlineEditorProps) {
  const { label, canEdit, onSave, isSaving = false, aiField, children, className = '' } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const improveText = useImproveText();

  // Reset edit value when opening
  useEffect(() => {
    if (isOpen) {
      setEditValue(props.value);
    }
  }, [isOpen, props.value]);

  // Manage dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  async function handleSave() {
    try {
      await onSave(editValue);
      setIsOpen(false);
    } catch {
      toast.error('Speichern fehlgeschlagen');
    }
  }

  function handleAiImprove() {
    if (!aiField || !editValue.trim()) return;
    improveText.mutate(
      { text: editValue, field: aiField },
      {
        onSuccess: (data) => setEditValue(data.improved_text),
        onError: () => toast.error('KI-Verbesserung fehlgeschlagen'),
      },
    );
  }

  return (
    <div className={`group relative ${className}`}>
      {children}

      {canEdit && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
          title={`${label} bearbeiten`}
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}

      {/* Dialog */}
      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        className="w-full max-w-lg rounded-xl border bg-card p-0 shadow-xl backdrop:bg-black/50"
      >
        {isOpen && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{label} bearbeiten</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Editor based on mode */}
            {props.mode === 'text' && (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}

            {props.mode === 'textarea' && (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}

            {props.mode === 'markdown' && (
              <MarkdownEditor
                value={editValue}
                onChange={(val) => setEditValue(val ?? '')}
                height={250}
              />
            )}

            {props.mode === 'select' && (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Wählen —</option>
                {props.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div>
                {aiField && props.mode !== 'select' && (
                  <button
                    type="button"
                    onClick={handleAiImprove}
                    disabled={!editValue.trim() || improveText.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 text-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    {improveText.isPending ? 'Verbessert...' : 'KI-Vorschlag'}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Speichert...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
