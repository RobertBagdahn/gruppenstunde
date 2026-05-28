import { useState } from 'react';
import { toast } from 'sonner';
import {
  useMealPlanCollaborators,
  useAddMealPlanCollaborator,
  useUpdateMealPlanCollaborator,
  useRemoveMealPlanCollaborator,
} from '@/api/mealPlans';
import { COLLABORATOR_ROLE_LABELS } from '@/schemas/mealPlan';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CollaboratorSectionProps {
  mealPlanId: number;
  canManage: boolean;
}

export default function CollaboratorSection({ mealPlanId, canManage }: CollaboratorSectionProps) {
  const { data: collaborators, isLoading } = useMealPlanCollaborators(mealPlanId);
  const addMutation = useAddMealPlanCollaborator(mealPlanId);
  const updateMutation = useUpdateMealPlanCollaborator(mealPlanId);
  const removeMutation = useRemoveMealPlanCollaborator(mealPlanId);

  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('editor');
  const [removeId, setRemoveId] = useState<number | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(userId);
    if (!id) {
      toast.error('Bitte eine gültige User-ID eingeben');
      return;
    }
    addMutation.mutate(
      { user_id: id, role },
      {
        onSuccess: () => {
          setUserId('');
          toast.success('Mitglied hinzugefügt');
        },
        onError: () => toast.error('Fehler beim Hinzufügen'),
      },
    );
  };

  const handleRemove = () => {
    if (removeId === null) return;
    removeMutation.mutate(removeId, {
      onSuccess: () => {
        setRemoveId(null);
        toast.success('Mitglied entfernt');
      },
      onError: () => toast.error('Fehler beim Entfernen'),
    });
  };

  const handleRoleChange = (collaboratorId: number, newRole: string) => {
    updateMutation.mutate(
      { collaboratorId, role: newRole },
      {
        onSuccess: () => toast.success('Rolle geändert'),
        onError: () => toast.error('Fehler beim Ändern der Rolle'),
      },
    );
  };

  return (
    <section className="border-t pt-6 mt-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-xl">group</span>
        Mitglieder
      </h2>

      {isLoading && <p className="text-sm text-muted-foreground">Laden...</p>}

      {collaborators && collaborators.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Noch keine Mitglieder eingeladen.
        </p>
      )}

      {collaborators && collaborators.length > 0 && (
        <div className="space-y-2 mb-4">
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-2 px-3 rounded border bg-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-muted-foreground text-lg">
                  person
                </span>
                <span className="text-sm truncate">
                  {c.first_name || c.username || `User ${c.user_id}`}
                  {c.last_name ? ` ${c.last_name}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="viewer">{COLLABORATOR_ROLE_LABELS.viewer}</option>
                    <option value="editor">{COLLABORATOR_ROLE_LABELS.editor}</option>
                    <option value="admin">{COLLABORATOR_ROLE_LABELS.admin}</option>
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {COLLABORATOR_ROLE_LABELS[c.role] || c.role}
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => setRemoveId(c.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                    title="Entfernen"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            placeholder="User-ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-background w-28 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-background"
          >
            <option value="viewer">{COLLABORATOR_ROLE_LABELS.viewer}</option>
            <option value="editor">{COLLABORATOR_ROLE_LABELS.editor}</option>
            <option value="admin">{COLLABORATOR_ROLE_LABELS.admin}</option>
          </select>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
          >
            Einladen
          </button>
        </form>
      )}

      <ConfirmDialog
        open={removeId !== null}
        onCancel={() => setRemoveId(null)}
        title="Mitglied entfernen?"
        description="Das Mitglied verliert den Zugriff auf diesen Essensplan."
        confirmLabel="Entfernen"
        onConfirm={handleRemove}
        variant="destructive"
      />
    </section>
  );
}
