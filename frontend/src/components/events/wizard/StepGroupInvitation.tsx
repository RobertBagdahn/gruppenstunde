/**
 * Step 2: Gruppe & Einladung — group selector + person invitation.
 */
import { useState, useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { usePersons } from '@/api/events';
import { useMyGroups } from '@/api/profile';

export default function StepGroupInvitation() {
  const { data, updateStep2, setStepValid } = useEventWizardStore();
  const { data: persons, isLoading: personsLoading } = usePersons();
  const { data: groups, isLoading: groupsLoading } = useMyGroups();
  const [search, setSearch] = useState('');

  // This step is always valid (optional)
  useEffect(() => {
    setStepValid(1, true);
  }, [setStepValid]);

  const selectedUserIds = new Set(data.invited_user_ids || []);
  const selectedGroupIds = new Set(data.invited_group_ids || []);

  const filteredPersons = persons?.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(term) ||
      p.last_name.toLowerCase().includes(term) ||
      (p.scout_name && p.scout_name.toLowerCase().includes(term))
    );
  });

  const togglePerson = (personId: number) => {
    const current = data.invited_user_ids || [];
    const updated = current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId];
    updateStep2({ invited_user_ids: updated });
  };

  const selectAllPersons = () => {
    const allIds = filteredPersons?.map((p) => p.id) || [];
    updateStep2({ invited_user_ids: allIds });
  };

  const deselectAllPersons = () => {
    updateStep2({ invited_user_ids: [] });
  };

  const toggleGroup = (groupId: number) => {
    const current = data.invited_group_ids || [];
    const updated = current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId];
    updateStep2({ invited_group_ids: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Gruppe & Einladung</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Lade Gruppen und Personen zu deinem Event ein. Du kannst dies auch später tun.
        </p>
      </div>

      {/* Group selection */}
      {!groupsLoading && groups && groups.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Gruppen einladen
            {selectedGroupIds.size > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">
                ({selectedGroupIds.size} ausgewählt)
              </span>
            )}
          </label>
          <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedGroupIds.has(group.id)}
                  onChange={() => toggleGroup(group.id)}
                  className="rounded"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{group.name}</span>
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({group.member_count} Mitglieder)
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Person selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Personen einladen
          {selectedUserIds.size > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({selectedUserIds.size} ausgewählt)
            </span>
          )}
        </label>

        {/* Search */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Person suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={selectAllPersons}
            className="text-xs text-primary hover:underline"
          >
            Alle auswählen
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <button
            type="button"
            onClick={deselectAllPersons}
            className="text-xs text-muted-foreground hover:underline"
          >
            Auswahl aufheben
          </button>
        </div>

        {/* Person list */}
        {personsLoading ? (
          <p className="text-sm text-muted-foreground">Lade Personen...</p>
        ) : filteredPersons && filteredPersons.length > 0 ? (
          <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
            {filteredPersons.map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(person.id)}
                  onChange={() => togglePerson(person.id)}
                  className="rounded"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">
                    {person.first_name} {person.last_name}
                  </span>
                  {person.scout_name && (
                    <span className="text-muted-foreground ml-1">({person.scout_name})</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
            {search ? 'Keine Personen gefunden.' : 'Noch keine Personen vorhanden.'}
            <p className="text-xs mt-1">
              Du kannst Personen unter "Meine Personen" anlegen.
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
          <div>
            <p className="text-blue-900 dark:text-blue-200">
              Du kannst auch nach dem Erstellen Personen und Gruppen einladen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
