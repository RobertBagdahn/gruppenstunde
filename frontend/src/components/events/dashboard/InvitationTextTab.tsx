/**
 * InvitationTextTab — Display/edit the event's invitation text (Markdown).
 * Members see read-only rendered Markdown.
 * Managers can toggle an editor to update the text.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail } from '@/schemas/event';
import { useUpdateEvent } from '@/api/events';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MarkdownEditor from '@/components/MarkdownEditor';

interface Props {
  event: EventDetail;
  isManager: boolean;
}

export default function InvitationTextTab({ event, isManager }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(event.invitation_text || '');
  const updateEvent = useUpdateEvent(event.slug);

  const handleSave = () => {
    updateEvent.mutate(
      { invitation_text: text },
      {
        onSuccess: () => {
          toast.success('Einladungstext gespeichert');
          setEditing(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleCancel = () => {
    setText(event.invitation_text || '');
    setEditing(false);
  };

  // No text and not manager
  if (!event.invitation_text && !isManager) {
    return (
      <div className="rounded-xl border p-6 text-center">
        <span className="material-symbols-outlined text-[40px] text-muted-foreground mb-2">
          article
        </span>
        <p className="text-sm text-muted-foreground">
          Es wurde noch kein Einladungstext hinterlegt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with edit toggle for managers */}
      {isManager && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">article</span>
            Einladungstext
          </h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Bearbeiten
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateEvent.isPending}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
              >
                {updateEvent.isPending ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border p-4">
        {editing ? (
          <MarkdownEditor value={text} onChange={setText} />
        ) : event.invitation_text ? (
          <MarkdownRenderer content={event.invitation_text} />
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Noch kein Einladungstext vorhanden.
            </p>
            {isManager && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              >
                Einladungstext erstellen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
