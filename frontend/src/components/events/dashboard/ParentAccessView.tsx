/**
 * ParentAccessView — Manage parent access tokens for event participants.
 * Managers can generate, batch-generate, list, and revoke tokens.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail } from '@/schemas/event';
import {
  useParentTokens,
  useCreateParentToken,
  useBatchCreateParentTokens,
  useRevokeParentToken,
} from '@/api/eventDashboard';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  event: EventDetail;
}

export default function ParentAccessView({ event }: Props) {
  const { data: tokensData, isLoading } = useParentTokens(event.slug);
  const createToken = useCreateParentToken(event.slug);
  const batchCreate = useBatchCreateParentTokens(event.slug);
  const revokeToken = useRevokeParentToken(event.slug);

  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [email, setEmail] = useState('');

  const tokens = tokensData?.items ?? [];

  const allParticipants =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  const handleGenerate = () => {
    if (!selectedParticipantId) return;
    createToken.mutate(
      { participant_id: selectedParticipantId, email: email || undefined },
      {
        onSuccess: () => {
          toast.success('Elternzugang erstellt');
          setShowGenerate(false);
          setSelectedParticipantId(null);
          setEmail('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleBatchGenerate = () => {
    batchCreate.mutate(
      {},
      {
        onSuccess: () => toast.success('Elternzugänge für alle Teilnehmer erstellt'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleRevoke = (id: number) => {
    revokeToken.mutate(id, {
      onSuccess: () => {
        toast.success('Zugang widerrufen');
        setConfirmRevokeId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-xl animate-spin mr-2">progress_activity</span>
        Wird geladen...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">family_restroom</span>
          Elternzugänge ({tokens.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(!showGenerate)}
            className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Einzeln generieren
          </button>
          <button
            onClick={handleBatchGenerate}
            disabled={batchCreate.isPending}
            className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">group_add</span>
            {batchCreate.isPending ? 'Generieren...' : 'Für alle generieren'}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Erstelle Links für Eltern, um Event-Details (Daten, Treffpunkt, Packliste) einzusehen — ohne Account.
      </p>

      {/* Generate Form */}
      {showGenerate && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Teilnehmer *
              </label>
              <select
                value={selectedParticipantId ?? ''}
                onChange={(e) => setSelectedParticipantId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">Teilnehmer wählen...</option>
                {allParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                E-Mail (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                placeholder="eltern@beispiel.de"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedParticipantId || createToken.isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
            >
              Generieren
            </button>
            <button
              onClick={() => setShowGenerate(false)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Token List */}
      <div className="space-y-2">
        {tokens.map((token) => {
          const parentUrl = `${window.location.origin}/events/${event.slug}/parent/${token.token}`;
          const isExpired = new Date(token.expires_at) < new Date();

          return (
            <div
              key={token.id}
              className={`border rounded-xl p-3 ${isExpired ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{token.participant_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {token.email && <>{token.email} &middot; </>}
                    Gültig bis{' '}
                    {new Date(token.expires_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                    {isExpired && (
                      <span className="text-red-600 ml-1">(abgelaufen)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(parentUrl);
                      toast.success('Link kopiert!');
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Link kopieren"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                  <button
                    onClick={() => setConfirmRevokeId(token.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Widerrufen"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tokens.length === 0 && !showGenerate && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">family_restroom</span>
          Noch keine Elternzugänge erstellt
        </div>
      )}

      <ConfirmDialog
        open={confirmRevokeId !== null}
        onConfirm={() => confirmRevokeId && handleRevoke(confirmRevokeId)}
        onCancel={() => setConfirmRevokeId(null)}
        title="Zugang widerrufen?"
        description="Der Elternzugangs-Link wird ungültig."
        confirmLabel="Widerrufen"
        loading={revokeToken.isPending}
      />
    </div>
  );
}
