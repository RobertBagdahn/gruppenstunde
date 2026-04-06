import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  usePackingLists,
  usePackingListTemplates,
  useCreatePackingList,
  useDeletePackingList,
  useClonePackingList,
} from '@/api/packingLists';
import type { PackingListSummary } from '@/schemas/packingList';
import ConfirmDialog from '@/components/ConfirmDialog';

function ProgressBar({ checked, total }: { checked: number; total: number }) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {checked}/{total}
      </span>
    </div>
  );
}

function PackingListCard({
  pl,
  onDelete,
  showDelete = true,
}: {
  pl: PackingListSummary;
  onDelete?: (id: number) => void;
  showDelete?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="border rounded-lg p-4 bg-card hover:shadow-md transition cursor-pointer"
      onClick={() => navigate(`/packing-lists/${pl.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{pl.title}</h3>
          {pl.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {pl.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">category</span>
              {pl.category_count} Kategorien
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">checklist</span>
              {pl.item_count} Gegenstaende
            </span>
            {pl.group_name && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">group</span>
                {pl.group_name}
              </span>
            )}
            <span>
              {new Date(pl.updated_at).toLocaleDateString('de-DE')}
            </span>
          </div>
          {!pl.is_template && pl.item_count > 0 && (
            <div className="mt-2">
              <ProgressBar checked={pl.checked_count} total={pl.item_count} />
            </div>
          )}
        </div>
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pl.id);
            }}
            className="text-destructive hover:bg-destructive/10 rounded p-1 ml-2 shrink-0"
            title="Loeschen"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClone,
  isCloning,
}: {
  template: PackingListSummary;
  onClone: (id: number) => void;
  isCloning: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-card hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{template.title}</h3>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{template.category_count} Kategorien</span>
            <span>{template.item_count} Gegenstaende</span>
          </div>
        </div>
        <button
          onClick={() => onClone(template.id)}
          disabled={isCloning}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-xs hover:opacity-90 transition disabled:opacity-50 shrink-0 ml-2"
          title="Als eigene Packliste uebernehmen"
        >
          <span className="material-symbols-outlined text-sm">content_copy</span>
          Verwenden
        </button>
      </div>
    </div>
  );
}

export default function PackingListsPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: packingLists, isLoading } = usePackingLists();
  const { data: templates, isLoading: templatesLoading } = usePackingListTemplates();
  const createPackingList = useCreatePackingList();
  const deletePackingList = useDeletePackingList();
  const clonePackingList = useClonePackingList();
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  if (userLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
          backpack
        </span>
        <h1 className="text-2xl font-bold mb-2">Packlisten</h1>
        <p className="text-muted-foreground mb-4">
          Melde dich an, um deine Packlisten zu verwalten.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm hover:opacity-90 transition"
        >
          Anmelden
        </button>
      </div>
    );
  }

  const handleClone = (templateId: number) => {
    clonePackingList.mutate(templateId, {
      onSuccess: (data) => {
        toast.success('Packliste aus Vorlage erstellt');
        navigate(`/packing-lists/${data.id}`);
      },
      onError: (err) => {
        toast.error('Fehler', { description: err.message });
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
            <span className="material-symbols-outlined text-[22px]">checklist</span>
          </div>
          <h1 className="text-2xl font-bold">Packlisten</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-3 py-2 border rounded-md text-sm hover:bg-muted transition"
          >
            <span className="material-symbols-outlined text-lg">library_books</span>
            <span className="hidden sm:inline">Vorlagen</span>
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm hover:opacity-90 transition"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Neue Packliste
          </button>
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600">library_books</span>
              Vorlagen
            </h2>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Waehle eine Vorlage als Ausgangspunkt fuer deine eigene Packliste.
          </p>
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse h-24 bg-muted rounded-lg" />
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClone={handleClone}
                  isCloning={clonePackingList.isPending}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Vorlagen verfuegbar.
            </p>
          )}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h2 className="text-sm font-semibold mb-3">Neue Packliste erstellen</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Titel der Packliste..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) {
                  createPackingList.mutate(
                    { title: newTitle.trim() },
                    {
                      onSuccess: (data) => {
                        setNewTitle('');
                        setShowCreate(false);
                        navigate(`/packing-lists/${data.id}`);
                      },
                    },
                  );
                }
              }}
              className="flex-1 px-3 py-2 rounded-md border text-sm bg-background"
              autoFocus
            />
            <button
              onClick={() => {
                if (newTitle.trim()) {
                  createPackingList.mutate(
                    { title: newTitle.trim() },
                    {
                      onSuccess: (data) => {
                        setNewTitle('');
                        setShowCreate(false);
                        navigate(`/packing-lists/${data.id}`);
                      },
                    },
                  );
                }
              }}
              disabled={!newTitle.trim() || createPackingList.isPending}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              Erstellen
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && packingLists && packingLists.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
            inventory_2
          </span>
          <h2 className="text-lg font-semibold mb-2">Noch keine Packlisten</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Erstelle deine erste Packliste oder waehle eine Vorlage als Ausgangspunkt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm"
            >
              Leere Packliste erstellen
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
            >
              Aus Vorlage erstellen
            </button>
          </div>
        </div>
      )}

      {/* Packing List Cards */}
      {packingLists && packingLists.length > 0 && (
        <div className="space-y-3">
          {packingLists.map((pl) => (
            <PackingListCard
              key={pl.id}
              pl={pl}
              onDelete={(id) => setDeleteTargetId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={() => {
          if (deleteTargetId === null) return;
          deletePackingList.mutate(deleteTargetId, {
            onSuccess: () => {
              toast.success('Packliste geloescht');
              setDeleteTargetId(null);
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setDeleteTargetId(null);
            },
          });
        }}
        onCancel={() => setDeleteTargetId(null)}
        title="Packliste loeschen?"
        description="Alle Kategorien und Gegenstaende werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deletePackingList.isPending}
      />
    </div>
  );
}
