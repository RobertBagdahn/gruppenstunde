/**
 * RecipeFoldersPage — manage the personal recipe folders.
 * Canvas layout (food-canvas-layout): white PageHeader with count pill and back action,
 * neutral white folder cards (no recipe-type tint), 44 px touch targets on the phone.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useRecipeFolders, useCreateRecipeFolder, useUpdateRecipeFolder, useDeleteRecipeFolder } from '@/api/recipeFolders';
import type { RecipeFolder } from '@/schemas/recipeFolder';
import { notify } from '@/lib/notify';
import ConfirmDialog from '@/components/ConfirmDialog';

const FIELD_CLASS =
  'w-full min-h-11 rounded-lg border border-border bg-background px-3 text-emphasis text-foreground md:text-body focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none';

export default function RecipeFoldersPage() {
  const { data: folders, isLoading } = useRecipeFolders();
  const createFolder = useCreateRecipeFolder();
  const updateFolder = useUpdateRecipeFolder();
  const deleteFolder = useDeleteRecipeFolder();

  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createFolder.mutateAsync({ name: newName.trim(), parent_id: newParentId || null });
      setNewName('');
      setNewParentId(null);
    } catch (error) {
      notify.error('Ordner konnte nicht erstellt werden', { error: error });
    }
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateFolder.mutateAsync({ id, data: { name: editName.trim() } });
      setEditingId(null);
      setEditName('');
    } catch (error) {
      notify.error('Ordner konnte nicht gespeichert werden', { error: error });
    }
  };

  const rootFolders = folders?.filter((f) => !f.parent_id) ?? [];
  const getChildren = (parentId: number) => folders?.filter((f) => f.parent_id === parentId) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-8">
      <PageHeader
        title="Ordner verwalten"
        description="Organisiere deine persönlichen Rezepte in Ordnern"
        count={folders ? folders.length : undefined}
        countLoading={isLoading}
        countLabel={{ one: 'Ordner', other: 'Ordner' }}
        actions={
          <Link
            to="/recipes/my-recipes"
            className="press inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/60"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Meine Rezepte
          </Link>
        }
      />

      {/* Create form */}
      <section className="rounded-xl bg-card p-4 md:p-5 mb-6 shadow-card">
        <h2 className="font-display text-section font-bold text-foreground mb-3">Neuen Ordner erstellen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="folder-new-name" className="block text-caption text-muted-foreground mb-1">Name</label>
            <input
              id="folder-new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ordnername"
              className={FIELD_CLASS}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {rootFolders.length > 0 && (
            <div className="min-w-[160px]">
              <label htmlFor="folder-new-parent" className="block text-caption text-muted-foreground mb-1">Überordner (optional)</label>
              <select
                id="folder-new-parent"
                value={newParentId ?? ''}
                onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
                className={FIELD_CLASS}
              >
                <option value="">Kein Überordner</option>
                {rootFolders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createFolder.isPending}
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-body font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Erstellen
          </button>
        </div>
      </section>

      {/* Folder list */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Ordner werden geladen">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : !folders?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card px-6 py-14 text-center shadow-card">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-xl bg-primary-soft">
            <FolderOpen className="w-12 h-12 text-primary" aria-hidden="true" />
          </div>
          <h2 className="font-display text-section font-extrabold text-foreground">Noch keine Ordner</h2>
          <p className="text-body text-muted-foreground mt-1 max-w-md">
            Erstelle deinen ersten Ordner, um Rezepte zu organisieren.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-2">
          {rootFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              children={getChildren(folder.id)}
              editingId={editingId}
              editName={editName}
              onStartEdit={(f) => { setEditingId(f.id); setEditName(f.name); }}
              onEditNameChange={setEditName}
              onSaveEdit={handleEdit}
              onCancelEdit={() => setEditingId(null)}
              onDelete={(id) => setDeleteFolderId(id)}
              isDeleting={deleteFolder.isPending}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={deleteFolderId !== null}
        onConfirm={() => {
          if (deleteFolderId === null) return;
          deleteFolder.mutate(deleteFolderId, {
            onSuccess: () => {
              setDeleteFolderId(null);
              notify.deleted('Ordner');
            },
            onError: (error) => notify.failed('Ordner', 'gelöscht', error),
          });
        }}
        onCancel={() => setDeleteFolderId(null)}
        title="Ordner löschen?"
        description="Die Rezepte im Ordner bleiben erhalten."
        confirmLabel="Löschen"
        loading={deleteFolder.isPending}
      />
    </div>
  );
}

function FolderCard({
  folder,
  children,
  editingId,
  editName,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isDeleting,
}: {
  folder: RecipeFolder;
  children: RecipeFolder[];
  editingId: number | null;
  editName: string;
  onStartEdit: (f: RecipeFolder) => void;
  onEditNameChange: (v: string) => void;
  onSaveEdit: (id: number) => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const isEditing = editingId === folder.id;

  return (
    <div className="rounded-xl bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 md:p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
            <FolderOpen className="w-5 h-5 text-primary-dark" aria-hidden="true" />
          </div>
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                aria-label="Neuer Ordnername"
                className="flex-1 min-w-[160px] min-h-11 rounded-lg border border-border bg-background px-3 text-emphasis text-foreground md:text-body focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit(folder.id);
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={() => onSaveEdit(folder.id)}
                className="press inline-flex min-h-11 items-center rounded-lg bg-primary-soft px-3 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/60"
              >
                Speichern
              </button>
              <button
                onClick={onCancelEdit}
                className="press inline-flex min-h-11 items-center rounded-lg px-3 text-body text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
              <span className="font-display text-emphasis font-semibold text-foreground truncate">{folder.name}</span>
              <span className="text-caption text-muted-foreground shrink-0">
                {folder.recipe_count} Rezept{folder.recipe_count === 1 ? '' : 'e'}
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onStartEdit(folder)}
              className="press inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Umbenennen"
              aria-label={`${folder.name} umbenennen`}
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDelete(folder.id)}
              disabled={isDeleting}
              className="press inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              title="Löschen"
              aria-label={`${folder.name} löschen`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <ul className="border-t border-border px-3 py-1 md:px-4">
          {children.map((child) => (
            <li key={child.id} className="flex items-center justify-between gap-2 min-h-11 pl-6">
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-body text-foreground truncate">{child.name}</span>
                <span className="text-caption text-muted-foreground shrink-0">
                  {child.recipe_count}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDelete(child.id)}
                  disabled={isDeleting}
                  className="press inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Löschen"
                  aria-label={`${child.name} löschen`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
