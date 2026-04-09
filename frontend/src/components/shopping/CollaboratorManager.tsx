/**
 * CollaboratorManager — Invite/manage collaborators, role picker, remove button.
 */
import { useState } from 'react';
import {
  useAddCollaborator,
  useUpdateCollaborator,
  useRemoveCollaborator,
} from '@/api/shoppingLists';
import {
  COLLABORATOR_ROLE_LABELS,
  type ShoppingListCollaborator,
} from '@/schemas/shoppingList';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CollaboratorManagerProps {
  listId: number;
  collaborators: ShoppingListCollaborator[];
  isOwner: boolean;
}

export default function CollaboratorManager({
  listId,
  collaborators,
  isOwner,
}: CollaboratorManagerProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);

  const addCollaborator = useAddCollaborator(listId);
  const updateCollaborator = useUpdateCollaborator(listId);
  const removeCollaborator = useRemoveCollaborator(listId);

  const handleInvite = () => {
    const userId = parseInt(inviteUserId, 10);
    if (isNaN(userId) || userId <= 0) {
      toast.error('Bitte eine gueltige Nutzer-ID eingeben');
      return;
    }
    addCollaborator.mutate(
      { user_id: userId, role: inviteRole },
      {
        onSuccess: () => {
          toast.success('Nutzer eingeladen');
          setInviteUserId('');
          setShowInvite(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="space-y-3">
      <ConfirmDialog
        open={removeTarget !== null}
        onConfirm={() => {
          if (removeTarget !== null) {
            removeCollaborator.mutate(removeTarget, {
              onSuccess: () => {
                toast.success('Mitglied entfernt');
                setRemoveTarget(null);
              },
              onError: (err) => {
                toast.error('Fehler', { description: err.message });
                setRemoveTarget(null);
              },
            });
          }
        }}
        onCancel={() => setRemoveTarget(null)}
        title="Mitglied entfernen?"
        description="Das Mitglied verliert den Zugriff auf diese Einkaufsliste."
        confirmLabel="Entfernen"
        loading={removeCollaborator.isPending}
      />

      {/* Collaborator list */}
      {collaborators.length > 0 ? (
        <ul className="space-y-2">
          {collaborators.map((collab) => (
            <li
              key={collab.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg border"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    person
                  </span>
                </div>
                <span className="text-sm font-medium truncate">
                  {collab.username}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isOwner ? (
                  <select
                    value={collab.role}
                    onChange={(e) =>
                      updateCollaborator.mutate(
                        { collabId: collab.id, role: e.target.value },
                        {
                          onSuccess: () => toast.success('Rolle geaendert'),
                          onError: (err) =>
                            toast.error('Fehler', { description: err.message }),
                        },
                      )
                    }
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    {Object.entries(COLLABORATOR_ROLE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {COLLABORATOR_ROLE_LABELS[collab.role] ?? collab.role}
                  </span>
                )}

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(collab.id)}
                    className="text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
                    title="Entfernen"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      close
                    </span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Noch keine Mitglieder eingeladen
        </p>
      )}

      {/* Invite form */}
      {isOwner && (
        <div>
          {showInvite ? (
            <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg border">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Nutzer-ID
                </label>
                <input
                  type="number"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder="z.B. 42"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Rolle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-lg bg-background"
                >
                  {Object.entries(COLLABORATOR_ROLE_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <button
                type="button"
                onClick={handleInvite}
                disabled={addCollaborator.isPending}
                className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Einladen
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">
                person_add
              </span>
              Nutzer einladen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
