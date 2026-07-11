import { useState } from 'react';
import { Users } from 'lucide-react';
import { useGroupMembers, useCreateGroupMember, useDeleteGroupMember, useBulkCreateGroupMembers, useSyncEventParticipants } from '@/api/groupMembers';
import { AddPersonForm } from './AddPersonForm';
import { GroupMemberList } from './GroupMemberList';
import { QuickAddStufenDialog } from './QuickAddStufenDialog';

interface Props {
  mealPlanId: number;
  hasEvent: boolean;
  eventName: string;
}

export function GroupMemberPanel({ mealPlanId, hasEvent, eventName }: Props) {
  const { data: members = [] } = useGroupMembers(mealPlanId);
  const createMutation = useCreateGroupMember(mealPlanId);
  const deleteMutation = useDeleteGroupMember(mealPlanId);
  const bulkCreateMutation = useBulkCreateGroupMembers(mealPlanId);
  const syncMutation = useSyncEventParticipants(mealPlanId);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-soft font-sans">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-foreground">Gruppe</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {members.length} {members.length === 1 ? 'Person' : 'Personen'}
        </span>
      </div>

      <QuickAddStufenDialog
        onBulkCreate={(data) => bulkCreateMutation.mutate(data)}
        isPending={bulkCreateMutation.isPending}
      />

      <AddPersonForm
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <GroupMemberList
        members={members}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />

      {hasEvent && (
        <div className="border-t border-border pt-4">
          {showSyncConfirm ? (
            <div className="p-4 border border-amber-200 rounded-xl bg-amber-50 dark:bg-amber-950/20 space-y-3">
              <p className="text-sm text-foreground">
                Bestehende Gruppenmitglieder werden durch die Event-Teilnehmer von <strong>{eventName}</strong> ersetzt.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => syncMutation.mutate(undefined, { onSuccess: () => setShowSyncConfirm(false) })}
                  disabled={syncMutation.isPending}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {syncMutation.isPending ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSyncConfirm(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Verknüpft mit <strong className="text-foreground">{eventName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowSyncConfirm(true)}
                className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
              >
                Aus Event synchronisieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
