import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Boxes, Ruler, Users } from 'lucide-react';
import { useAdminStats, useModerationQueue, useModerateComment, useAdminUsers, useRecentActivity, useTrending } from '@/api/admin';
import {
  useAdminMaterials,
  useAdminUnits,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from '@/api/materials';

type AdminSection = 'dashboard' | 'moderation' | 'materials' | 'units' | 'users';

const MENU_ITEMS: { key: AdminSection; label: string; icon: ReactNode }[] = [
  { key: 'dashboard', label: 'Übersicht', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'moderation', label: 'Moderation', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'materials', label: 'Materialien', icon: <Boxes className="w-4 h-4" /> },
  { key: 'units', label: 'Einheiten', icon: <Ruler className="w-4 h-4" /> },
  { key: 'users', label: 'Benutzer', icon: <Users className="w-4 h-4" /> },
];

const VALID_SECTIONS: AdminSection[] = ['dashboard', 'moderation', 'materials', 'units', 'users'];

export default function AdminPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const activeSection: AdminSection = VALID_SECTIONS.includes(section as AdminSection)
    ? (section as AdminSection)
    : 'dashboard';

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: queue } = useModerationQueue();
  const moderate = useModerateComment();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { data: trending, isLoading: trendingLoading } = useTrending();

  const { data: users } = useAdminUsers();
  const [materialPage, setMaterialPage] = useState(1);
  const [materialSearch, setMaterialSearch] = useState('');
  const { data: materialsData } = useAdminMaterials(materialPage, 20, materialSearch);
  const { data: units } = useAdminUnits();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<{ id: number; name: string; description: string } | null>(null);
  const [editingUnit, setEditingUnit] = useState<{ id: number; name: string } | null>(null);

  // Redirect bare /admin to /admin/dashboard (via effect so content still renders)
  useEffect(() => {
    if (!section) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [section, navigate]);

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Navigation Menu - horizontal on mobile, vertical sidebar on desktop */}
        <nav className="w-full md:w-56 md:shrink-0">
          <ul className="flex md:flex-col gap-1 md:space-y-1 overflow-x-auto md:overflow-x-visible md:sticky md:top-24">
            {MENU_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => navigate(`/admin/${item.key}`)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${
                    activeSection === item.key
                      ? 'bg-primary text-white'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.key === 'moderation' && queue && queue.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {queue.length}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content Area */}
        <main className="flex-1 min-w-0">

          {/* Dashboard / Übersicht */}
          {activeSection === 'dashboard' && (
            <div>
              {statsLoading ? (
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-muted animate-pulse h-24" />
                  ))}
                </div>
              ) : stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.total_ideas}</p>
                    <p className="text-sm text-muted-foreground">Ideen gesamt</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.published_ideas}</p>
                    <p className="text-sm text-muted-foreground">Veröffentlicht</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.total_users}</p>
                    <p className="text-sm text-muted-foreground">Benutzer</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.total_comments}</p>
                    <p className="text-sm text-muted-foreground">Kommentare</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.pending_comments}</p>
                    <p className="text-sm text-muted-foreground">Ausstehend</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-2xl font-bold">{stats.views_last_30_days}</p>
                    <p className="text-sm text-muted-foreground">Aufrufe (30 Tage)</p>
                  </div>
                </div>
              )}

              {/* Trending: Most Viewed & Most Liked (7 days) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <section>
                  <h2 className="text-lg font-semibold mb-3">🔥 Meistgesehen (7 Tage)</h2>
                  {trendingLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-muted animate-pulse h-12" />
                      ))}
                    </div>
                  ) : trending?.most_viewed && trending.most_viewed.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">#</th>
                            <th className="text-left px-3 py-2 font-medium">Idee</th>
                            <th className="text-right px-3 py-2 font-medium">Aufrufe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trending.most_viewed.map((idea, idx) => (
                            <tr key={idea.id} className="border-t">
                              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <a href={`/idea/${idea.slug}`} className="hover:text-primary font-medium">
                                  {idea.title}
                                </a>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{idea.views_7d}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Aufrufe in den letzten 7 Tagen.</p>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-3">❤️ Meistgeliked (7 Tage)</h2>
                  {trendingLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-muted animate-pulse h-12" />
                      ))}
                    </div>
                  ) : trending?.most_liked && trending.most_liked.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">#</th>
                            <th className="text-left px-3 py-2 font-medium">Idee</th>
                            <th className="text-right px-3 py-2 font-medium">Likes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trending.most_liked.map((idea, idx) => (
                            <tr key={idea.id} className="border-t">
                              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <a href={`/idea/${idea.slug}`} className="hover:text-primary font-medium">
                                  {idea.title}
                                </a>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{idea.likes_7d}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Likes in den letzten 7 Tagen.</p>
                  )}
                </section>
              </div>

              {/* Recent Activity Tables */}
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3">📋 Letzte Aktivitäten</h2>
                {activityLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-lg border bg-muted animate-pulse h-12" />
                    ))}
                  </div>
                ) : recentActivity && (
                  <div className="space-y-6">
                    {/* Recent Views */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Letzte Aufrufe</h3>
                      {recentActivity.recent_views.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium">Idee</th>
                                <th className="text-left px-3 py-2 font-medium">Benutzer</th>
                                <th className="text-right px-3 py-2 font-medium">Zeit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentActivity.recent_views.map((view) => (
                                <tr key={view.id} className="border-t">
                                  <td className="px-3 py-2">
                                    {view.idea_slug ? (
                                      <a href={`/idea/${view.idea_slug}`} className="hover:text-primary font-medium">
                                        {view.idea_title}
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">Gelöscht</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {view.user_email || 'Anonym'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">
                                    {new Date(view.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine Aufrufe vorhanden.</p>
                      )}
                    </div>

                    {/* Recent Searches */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Letzte Suchen</h3>
                      {recentActivity.recent_searches.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium">Suchbegriff</th>
                                <th className="text-left px-3 py-2 font-medium">Ergebnisse</th>
                                <th className="text-left px-3 py-2 font-medium">Benutzer</th>
                                <th className="text-right px-3 py-2 font-medium">Zeit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentActivity.recent_searches.map((search) => (
                                <tr key={search.id} className="border-t">
                                  <td className="px-3 py-2 font-medium">"{search.query}"</td>
                                  <td className="px-3 py-2 text-muted-foreground">{search.results_count}</td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {search.user_email || 'Anonym'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">
                                    {new Date(search.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine Suchanfragen vorhanden.</p>
                      )}
                    </div>

                    {/* Recent Ideas */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Zuletzt erstellt</h3>
                      {recentActivity.recent_ideas.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium">Titel</th>
                                <th className="text-left px-3 py-2 font-medium">Typ</th>
                                <th className="text-left px-3 py-2 font-medium">Status</th>
                                <th className="text-left px-3 py-2 font-medium">Autor</th>
                                <th className="text-right px-3 py-2 font-medium">Erstellt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentActivity.recent_ideas.map((idea) => (
                                <tr key={idea.id} className="border-t">
                                  <td className="px-3 py-2">
                                    <a href={`/idea/${idea.slug}`} className="hover:text-primary font-medium">
                                      {idea.title}
                                    </a>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {idea.idea_type === 'idea' ? 'Idee' : idea.idea_type === 'knowledge' ? 'Wissen' : 'Rezept'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                      idea.status === 'published' ? 'bg-green-100 text-green-700' :
                                      idea.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                      idea.status === 'review' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {idea.status === 'published' ? 'Veröffentlicht' :
                                       idea.status === 'draft' ? 'Entwurf' :
                                       idea.status === 'review' ? 'Review' : 'Archiviert'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {idea.author_email || '–'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">
                                    {new Date(idea.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine Ideen vorhanden.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Moderation */}
          {activeSection === 'moderation' && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Moderationswarteschlange
                {queue && <span className="ml-2 text-sm text-muted-foreground">({queue.length})</span>}
              </h2>

              {queue && queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <p className="text-sm mb-3">{comment.text}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moderate.mutate({ comment_id: comment.id, action: 'approve' })}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                        >
                          Freigeben
                        </button>
                        <button
                          onClick={() => moderate.mutate({ comment_id: comment.id, action: 'reject' })}
                          className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Kommentare zur Moderation.</p>
              )}
            </section>
          )}

          {/* Materials */}
          {activeSection === 'materials' && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Materialien verwalten</h2>

              <input
                type="text"
                placeholder="Material suchen…"
                value={materialSearch}
                onChange={(e) => {
                  setMaterialSearch(e.target.value);
                  setMaterialPage(1);
                }}
                className="w-full px-3 py-1.5 border rounded-md text-sm mb-4"
              />

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Materialname"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <input
                  type="text"
                  placeholder="Beschreibung (optional)"
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button
                  onClick={() => {
                    if (newMaterialName.trim()) {
                      createMaterial.mutate({ name: newMaterialName.trim(), description: newMaterialDesc.trim() });
                      setNewMaterialName('');
                      setNewMaterialDesc('');
                    }
                  }}
                  className="px-4 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                >
                  Hinzufügen
                </button>
              </div>

              {materialsData && materialsData.items.length > 0 ? (
                <div className="space-y-2">
                  {materialsData.items.map((mat) => (
                    <div key={mat.id} className="flex items-center justify-between border rounded-lg p-3">
                      {editingMaterial?.id === mat.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editingMaterial.name}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            value={editingMaterial.description}
                            onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => {
                              updateMaterial.mutate({ id: editingMaterial.id, name: editingMaterial.name, description: editingMaterial.description });
                              setEditingMaterial(null);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            Speichern
                          </button>
                          <button onClick={() => setEditingMaterial(null)} className="px-3 py-1 border rounded text-xs">
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-sm font-medium">{mat.name}</span>
                            {mat.default_unit && (
                              <span className="text-xs text-muted-foreground ml-2">({mat.default_unit})</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingMaterial({ id: mat.id, name: mat.name, description: '' })}
                              className="px-3 py-1 border rounded text-xs hover:bg-muted"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => deleteMaterial.mutate(mat.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Löschen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Materialien vorhanden.</p>
              )}

              {/* Pagination */}
              {materialsData && materialsData.total_pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: materialsData.total_pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMaterialPage(i + 1)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                        materialPage === i + 1
                          ? 'bg-primary text-white shadow-lg'
                          : 'border bg-card hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Units */}
          {activeSection === 'units' && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Einheiten verwalten</h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Einheitenname (z.B. Stück, Meter, Liter)"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button
                  onClick={() => {
                    if (newUnitName.trim()) {
                      createUnit.mutate({ name: newUnitName.trim() });
                      setNewUnitName('');
                    }
                  }}
                  className="px-4 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                >
                  Hinzufügen
                </button>
              </div>

              {units && units.length > 0 ? (
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between border rounded-lg p-3">
                      {editingUnit?.id === unit.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editingUnit.name}
                            onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => {
                              updateUnit.mutate({ id: editingUnit.id, name: editingUnit.name });
                              setEditingUnit(null);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            Speichern
                          </button>
                          <button onClick={() => setEditingUnit(null)} className="px-3 py-1 border rounded text-xs">
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{unit.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingUnit({ id: unit.id, name: unit.name })}
                              className="px-3 py-1 border rounded text-xs hover:bg-muted"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => deleteUnit.mutate(unit.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Löschen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Einheiten vorhanden.</p>
              )}
            </section>
          )}

          {/* Users */}
          {activeSection === 'users' && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Benutzer
                {users && <span className="ml-2 text-sm text-muted-foreground">({users.length})</span>}
              </h2>

              {users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-3 py-2 font-semibold">E-Mail</th>
                        <th className="px-3 py-2 font-semibold">Vorname</th>
                        <th className="px-3 py-2 font-semibold">Nachname</th>
                        <th className="px-3 py-2 font-semibold">Beitrittsdatum</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="px-3 py-2">
                            <Link to={`/admin/users/${user.id}`} className="hover:text-primary font-medium underline-offset-2 hover:underline">
                              {user.email}
                            </Link>
                          </td>
                          <td className="px-3 py-2">{user.first_name}</td>
                          <td className="px-3 py-2">{user.last_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(user.date_joined).toLocaleDateString('de-DE')}
                          </td>
                          <td className="px-3 py-2">
                            {user.is_active ? (
                              <span className="inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800 px-2 py-0.5">Aktiv</span>
                            ) : (
                              <span className="inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800 px-2 py-0.5">Inaktiv</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {user.is_staff ? (
                              <span className="inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 px-2 py-0.5">Admin</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Benutzer vorhanden.</p>
              )}
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
