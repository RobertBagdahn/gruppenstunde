/**
 * ShareDialog — Generic sharing dialog for ContentCollaborator.
 * Shows current collaborators and allows adding/removing with role selection.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useContentCollaborators,
  useAddCollaborator,
  useUpdateCollaborator,
  useRemoveCollaborator,
} from '@/api/collaborators';
import { useCurrentUser } from '@/api/auth';
import ConfirmDialog from '@/components/ConfirmDialog';
import RoleSelect from './RoleSelect';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  contentTypeApp: string;
  contentTypeModel: string;
  objectId: number;
}

export default function ShareDialog({
  open,
  onClose,
  contentTypeApp,
  contentTypeModel,
  objectId,
}: ShareDialogProps) {
  const { data: collaborators = [], isLoading } = useContentCollaborators(
    contentTypeApp,
    contentTypeModel,
    objectId,
  );
  const addCollaborator = useAddCollaborator();
  const updateCollaborator = useUpdateCollaborator();
  const removeCollaborator = useRemoveCollaborator();
  const { data: user } = useCurrentUser();

  const [addMode, setAddMode] = useState<'user' | 'group'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState('viewer');
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id: number; display_name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/users/search/?q=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      toast.error('Fehler bei der Suche');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCollaborator = () => {
    addCollaborator.mutate(
      {
        content_type_app: contentTypeApp,
        content_type_model: contentTypeModel,
        object_id: objectId,
        user_id: addMode === 'user' ? selectedUserId : undefined,
        role: newRole as 'viewer' | 'editor' | 'admin',
      },
      {
        onSuccess: () => {
          toast.success('Freigabe hinzugefügt');
          setSearchQuery('');
          setSelectedUserId(null);
          setNewRole('viewer');
          setSearchResults([]);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Freigaben</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Existing collaborators */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Freigegeben für ({collaborators.length})
            </h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Lädt...</p>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Freigaben</p>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((collab) => (
                  <li
                    key={collab.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {collab.user_display_name || collab.group_name || 'Unbekannt'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collab.user_id ? 'Nutzer' : 'Gruppe'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <RoleSelect
                        value={collab.role}
                        onChange={(role) =>
                          updateCollaborator.mutate({ id: collab.id, role: { role: role as 'viewer' | 'editor' | 'admin' } })
                        }
                      />
                      <button
                        onClick={() => setRemoveTarget({ id: collab.id, name: collab.user_display_name || collab.group_name || 'Unbekannt' })}
                        className="rounded p-1 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Entfernen"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add collaborator */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Freigabe hinzufügen
            </h3>

            {/* User/Group toggle */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setAddMode('user')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                  addMode === 'user'
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Nutzer
              </button>
              <button
                onClick={() => setAddMode('group')}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                  addMode === 'group'
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Gruppe
              </button>
            </div>

            {/* User search */}
            {addMode === 'user' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name oder E-Mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSearchUsers}
                    disabled={isSearching}
                    className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Suchen
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <ul className="max-h-32 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {searchResults.map((result) => (
                      <li
                        key={result.id}
                        onClick={() => {
                          setSelectedUserId(result.id);
                          setSearchQuery(result.display_name);
                          setSearchResults([]);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                          selectedUserId === result.id ? 'bg-primary/10 font-medium' : ''
                        }`}
                      >
                        {result.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Group selector */}
            {addMode === 'group' && (
              <p className="text-sm text-muted-foreground">
                Gruppenfreigabe wird später implementiert.
              </p>
            )}

            {selectedUserId && (
              <div className="flex items-center gap-2 mt-3">
                <RoleSelect value={newRole} onChange={setNewRole} />
                <button
                  onClick={handleAddCollaborator}
                  disabled={addCollaborator.isPending}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {addCollaborator.isPending ? 'Füge hinzu...' : 'Hinzufügen'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onConfirm={() => {
          removeCollaborator.mutate(removeTarget!.id, {
            onSuccess: () => {
              toast.success('Freigabe entfernt');
              setRemoveTarget(null);
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setRemoveTarget(null);
            },
          });
        }}
        onCancel={() => setRemoveTarget(null)}
        title="Freigabe entfernen?"
        description={`Möchtest du die Freigabe für "${removeTarget?.name}" wirklich entfernen?`}
        confirmLabel="Entfernen"
        loading={removeCollaborator.isPending}
      />
    </>
  );
}
