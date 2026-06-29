import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Pencil, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import { useRecipeFolders, useCreateRecipeFolder, useUpdateRecipeFolder, useDeleteRecipeFolder } from '@/api/recipeFolders';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import type { RecipeFolder } from '@/schemas/recipeFolder';

export default function RecipeFoldersPage() {
  const { data: folders, isLoading } = useRecipeFolders();
  const createFolder = useCreateRecipeFolder();
  const updateFolder = useUpdateRecipeFolder();
  const deleteFolder = useDeleteRecipeFolder();

  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useDocumentMeta({
    title: 'Ordner verwalten',
    description: 'Rezept-Ordner verwalten',
    url: '/recipes/folders',
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createFolder.mutateAsync({
      name: newName.trim(),
      parent_id: newParentId || null,
    });
    setNewName('');
    setNewParentId(null);
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    await updateFolder.mutateAsync({ id, data: { name: editName.trim() } });
    setEditingId(null);
    setEditName('');
  };

  const rootFolders = folders?.filter((f) => !f.parent_id) ?? [];
  const getChildren = (parentId: number) => folders?.filter((f) => f.parent_id === parentId) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <div className="mb-4">
        <Link
          to="/recipes/my-recipes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Meine Rezepte
        </Link>
      </div>

      <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-2">
        Ordner verwalten
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Organisiere deine persönlichen Rezepte in Ordnern
      </p>

      {/* Create form */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6 shadow-sm">
        <h2 className="font-display font-semibold text-base mb-3">Neuen Ordner erstellen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ordnername"
              className="w-full px-3 py-1.5 rounded-xl border border-border text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {rootFolders.length > 0 && (
            <div className="min-w-[160px]">
              <label className="block text-xs text-muted-foreground mb-1">Überordner (optional)</label>
              <select
                value={newParentId ?? ''}
                onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-1.5 rounded-xl border border-border text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Erstellen
          </button>
        </div>
      </div>

      {/* Folder list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !folders?.length ? (
        <div className="text-center py-16 space-y-4 bg-card rounded-2xl border border-border p-8">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-semibold">Noch keine Ordner</p>
          <p className="text-sm text-muted-foreground">
            Erstelle deinen ersten Ordner, um Rezepte zu organisieren.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
              onDelete={(id) => {
                if (window.confirm('Ordner wirklich löschen? Rezepte bleiben erhalten.')) {
                  deleteFolder.mutate(id);
                }
              }}
              isDeleting={deleteFolder.isPending}
            />
          ))}
        </div>
      )}
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
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FolderOpen className="w-5 h-5 text-muted-foreground shrink-0" />
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg border border-border text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit(folder.id);
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={() => onSaveEdit(folder.id)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Speichern
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs text-muted-foreground hover:underline"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">{folder.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {folder.recipe_count} Rezept{folder.recipe_count === 1 ? '' : 'e'}
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onStartEdit(folder)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Umbenennen"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(folder.id)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="border-t border-border px-4 py-2 space-y-1">
          {children.map((child) => (
            <div key={child.id} className="flex items-center justify-between py-1.5 pl-6">
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{child.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {child.recipe_count}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDelete(child.id)}
                  disabled={isDeleting}
                  className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
