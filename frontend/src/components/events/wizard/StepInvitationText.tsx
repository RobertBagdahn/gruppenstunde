/**
 * Step 7: Einladungstext — Markdown editor, AI generation, preview.
 */
import { useState, useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { useGenerateInvitation } from '@/api/events';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';

export default function StepInvitationText() {
  const { data, updateStep7, setStepValid } = useEventWizardStore();
  const generateInvitation = useGenerateInvitation();
  const [specialNotes, setSpecialNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [aiInteractionId, setAiInteractionId] = useState<string | null>(null);

  // Always valid (optional step)
  useEffect(() => {
    setStepValid(6, true);
  }, [setStepValid]);

  const handleGenerate = () => {
    generateInvitation.mutate(
      {
        name: data.name,
        description: data.description || undefined,
        start_date: data.start_date,
        end_date: data.end_date,
        location_name: data.location || undefined,
        booking_options: data.booking_options?.map(
          (o) => `${o.name} (${o.price || '0'}\u20AC)`,
        ),
        special_notes: specialNotes || undefined,
      },
      {
        onSuccess: (result) => {
          updateStep7({ invitation_text: result.invitation_text });
          setAiInteractionId(result.ai_interaction_id ?? null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Einladungstext</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Schreibe einen Einladungstext oder lass ihn von der KI generieren.
        </p>
      </div>

      {/* AI generation */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          KI-Einladung generieren
        </h3>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Besonderheiten & Hinweise (optional)
          </label>
          <textarea
            placeholder="z.B. Bitte Schlafsack und Isomatte mitbringen, Lagerfeuer am Samstag..."
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background resize-none"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateInvitation.isPending || !data.name}
          className="px-4 py-2 gradient-primary text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          {generateInvitation.isPending ? 'KI generiert...' : 'Einladungstext generieren'}
        </button>
        {aiInteractionId && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Hilfreich?</span>
            <AiVoteButtons interactionId={aiInteractionId} />
          </div>
        )}
        {generateInvitation.isError && (
          <p className="text-xs text-destructive">{generateInvitation.error.message}</p>
        )}
      </div>

      {/* Editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Einladungstext</label>
          {data.invitation_text && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {showPreview ? 'edit' : 'visibility'}
              </span>
              {showPreview ? 'Bearbeiten' : 'Vorschau'}
            </button>
          )}
        </div>

        {showPreview ? (
          <div className="border rounded-lg p-4 bg-card text-sm min-h-[200px]">
            <MarkdownRenderer content={data.invitation_text || ''} />
          </div>
        ) : (
          <MarkdownEditor
            value={data.invitation_text || ''}
            onChange={(val) => updateStep7({ invitation_text: val })}
            placeholder="Schreibe den Einladungstext hier oder generiere ihn mit der KI..."
            height={200}
            preview="edit"
          />
        )}
      </div>

      {/* Tip */}
      <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
          <p className="text-blue-900 dark:text-blue-200">
            Der Einladungstext kann im Dashboard jederzeit bearbeitet werden.
            Er wird in der Einladungs-E-Mail und auf der Event-Seite angezeigt.
          </p>
        </div>
      </div>
    </div>
  );
}
