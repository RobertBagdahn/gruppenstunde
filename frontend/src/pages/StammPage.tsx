import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import {
  useMyGroups,
  useMyJoinRequests,
  useGroups,
  useCreateGroup,
  useJoinGroup,
  useJoinByCode,
} from '@/api/profile';
import type { UserGroup } from '@/schemas/profile';

export default function StammPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();

  const { data: myGroups, isLoading: myGroupsLoading } = useMyGroups();
  const { data: myRequests } = useMyJoinRequests();

  const [tab, setTab] = useState<'my-groups' | 'browse' | 'create'>('my-groups');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allGroups, isLoading: allGroupsLoading } = useGroups(tab === 'browse' ? searchQuery : '');

  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const joinByCode = useJoinByCode();

  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupFreeJoin, setNewGroupFreeJoin] = useState(true);

  // Join by code
  const [joinCodeSlug, setJoinCodeSlug] = useState('');
  const [joinCodeValue, setJoinCodeValue] = useState('');
  const [showJoinCode, setShowJoinCode] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    createGroup.mutate(
      { name: newGroupName, description: newGroupDesc, free_to_join: newGroupFreeJoin },
      {
        onSuccess: () => {
          setNewGroupName('');
          setNewGroupDesc('');
          setNewGroupFreeJoin(true);
          setTab('my-groups');
        },
      },
    );
  }

  function handleJoinGroup(group: UserGroup) {
    joinGroup.mutate({ slug: group.slug });
  }

  function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    joinByCode.mutate(
      { slug: joinCodeSlug, join_code: joinCodeValue },
      {
        onSuccess: () => {
          setShowJoinCode(null);
          setJoinCodeSlug('');
          setJoinCodeValue('');
        },
      },
    );
  }

  const isLoading = userLoading || myGroupsLoading;

  if (isLoading || !user) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const myGroupIds = new Set(myGroups?.map((g) => g.id) || []);
  const pendingRequestGroupIds = new Set(myRequests?.map((r) => r.group_id) || []);

  return (
    <div className="container py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[24px]">groups</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meine Gruppen</h1>
          <p className="text-sm text-muted-foreground">Gruppen verwalten und beitreten</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl">
        {([
          { key: 'my-groups', label: 'Meine Gruppen', icon: 'group' },
          { key: 'browse', label: 'Gruppen finden', icon: 'search' },
          { key: 'create', label: 'Neue Gruppe', icon: 'add_circle' },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* My Groups Tab */}
      {tab === 'my-groups' && (
        <div className="space-y-3">
          {myGroups && myGroups.length > 0 ? (
            myGroups.map((group) => (
              <div
                key={group.id}
                className="bg-card rounded-xl border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/groups/${group.slug}`} className="font-semibold truncate hover:text-primary transition-colors">
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">group</span>
                        {group.member_count} Mitglieder
                      </span>
                      {group.free_to_join && (
                        <span className="flex items-center gap-1 text-green-600">
                          <span className="material-symbols-outlined text-[14px]">lock_open</span>
                          Offen
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-muted-foreground/40 mb-3 block">
                group_off
              </span>
              <p className="text-muted-foreground mb-4">Du bist noch keiner Gruppe beigetreten.</p>
              <button
                onClick={() => setTab('browse')}
                className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium hover:shadow-glow transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                Gruppen finden
              </button>
            </div>
          )}

          {/* Pending join requests */}
          {myRequests && myRequests.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Ausstehende Anfragen
              </h2>
              {myRequests.map((req) => (
                <div key={req.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">hourglass_top</span>
                    <span className="text-sm font-medium">{req.group_name}</span>
                    <span className="text-xs text-muted-foreground">– Warten auf Genehmigung</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browse Groups Tab */}
      {tab === 'browse' && (
        <div className="space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined text-[20px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Gruppen suchen..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {allGroupsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-muted rounded-xl" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ) : allGroups && allGroups.length > 0 ? (
            allGroups.map((group) => {
              const isMember = myGroupIds.has(group.id);
              const isPending = pendingRequestGroupIds.has(group.id);

              return (
                <div
                  key={group.id}
                  className="bg-card rounded-xl border p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to={`/groups/${group.slug}`} className="font-semibold truncate hover:text-primary transition-colors">
                        {group.name}
                      </Link>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          {group.member_count} Mitglieder
                        </span>
                        {group.free_to_join ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                            Offen
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            Geschlossen
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {isMember ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Mitglied
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                          Angefragt
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleJoinGroup(group)}
                            disabled={joinGroup.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white gradient-primary rounded-lg hover:shadow-glow disabled:opacity-50 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">group_add</span>
                            Beitreten
                          </button>
                          {!group.free_to_join && (
                            <button
                              onClick={() => {
                                setShowJoinCode(group.slug);
                                setJoinCodeSlug(group.slug);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground border rounded-lg hover:bg-muted transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">key</span>
                              Code
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Join by code inline form */}
                  {showJoinCode === group.slug && (
                    <form onSubmit={handleJoinByCode} className="mt-3 pt-3 border-t flex gap-2">
                      <input
                        type="text"
                        value={joinCodeValue}
                        onChange={(e) => setJoinCodeValue(e.target.value)}
                        placeholder="Beitrittscode eingeben"
                        className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="submit"
                        disabled={joinByCode.isPending || !joinCodeValue}
                        className="px-3 py-1.5 text-sm font-medium text-white gradient-primary rounded-lg disabled:opacity-50"
                      >
                        {joinByCode.isPending ? '...' : 'OK'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowJoinCode(null);
                          setJoinCodeValue('');
                        }}
                        className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
                      >
                        ✕
                      </button>
                    </form>
                  )}

                  {joinGroup.error && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {joinGroup.error.message}
                    </p>
                  )}
                  {joinByCode.error && showJoinCode === group.slug && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {joinByCode.error.message}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-muted-foreground/40 mb-3 block">
                search_off
              </span>
              <p className="text-muted-foreground">
                {searchQuery ? 'Keine Gruppen gefunden.' : 'Noch keine Gruppen vorhanden.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Group Tab */}
      {tab === 'create' && (
        <div className="bg-card rounded-xl border p-6">
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label htmlFor="group_name" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">group</span>
                Gruppenname
              </label>
              <input
                id="group_name"
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="z.B. Gruppe Silberfüchse"
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="group_desc" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-[18px]">description</span>
                Beschreibung
              </label>
              <textarea
                id="group_desc"
                rows={3}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Beschreibe deine Gruppe..."
                className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroupFreeJoin}
                  onChange={(e) => setNewGroupFreeJoin(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
              <div>
                <p className="text-sm font-medium">Offene Gruppe</p>
                <p className="text-xs text-muted-foreground">
                  Mitglieder können ohne Genehmigung beitreten
                </p>
              </div>
            </div>

            {createGroup.error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {createGroup.error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={createGroup.isPending || !newGroupName}
              className="flex items-center gap-2 px-6 py-2.5 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {createGroup.isPending ? 'Erstellen...' : 'Gruppe erstellen'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
