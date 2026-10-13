/**
 * MaterialDetailPage — one device or consumable with price info, the recipes
 * that need it, and edit/delete/merge actions limited by `can_edit`/`can_delete`.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Pencil, Trash2, GitMerge } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useDeleteMaterial, useMaterial, useMergeMaterial } from '@/api/materials';
import { useMaterialSearch } from '@/api/supplies';
import { BackButton } from '@/components/shared/BackButton';
import HeroBand from '@/components/shared/HeroBand';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import MaterialFormDialog from '@/components/material/MaterialFormDialog';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';
import { formatEuro } from '@/lib/materialAmount';

function MergeDialog({
  open,
  onOpenChange,
  sourceId,
  sourceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: number;
  sourceName: string;
}) {
  const navigate = useNavigate();
  const merge = useMergeMaterial();
  const [term, setTerm] = useState('');
  const [target, setTarget] = useState<{ id: number; name: string; slug: string } | null>(null);
  const { data: results } = useMaterialSearch(term, term.trim().length > 0 && target === null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>„{sourceName}“ zusammenführen</DialogTitle>
          <DialogDescription>
            Alle Rezepte wechseln zum gewählten Material, „{sourceName}“ wird danach entfernt.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Ziel-Material suchen"
          placeholder="Ziel-Material suchen"
          value={target ? target.name : term}
          onChange={(e) => {
            setTerm(e.target.value);
            setTarget(null);
          }}
        />
        {!target && results && (
          <ul className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {results
              .filter((m) => m.id !== sourceId)
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-body hover:bg-muted"
                    onClick={() => setTarget({ id: m.id, name: m.name, slug: m.slug })}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={!target || merge.isPending}
            onClick={() => {
              if (!target) return;
              merge.mutate(
                { sourceId, targetId: target.id },
                {
                  onSuccess: (merged) => {
                    notify.success('Material zusammengeführt');
                    onOpenChange(false);
                    navigate(`/material/${merged.slug}`, { replace: true });
                  },
                  onError: (err) => notify.error('Material konnte nicht zusammengeführt werden', { error: err }),
                },
              );
            }}
          >
            {merge.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Zusammenführen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MaterialDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: material, isPending, error, refetch } = useMaterial(slug);
  const deleteMaterial = useDeleteMaterial();
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ErrorDisplay error={error} onRetry={() => refetch()} onBack={() => navigate('/material')} backLabel="Zurück" />
      </div>
    );
  }
  if (isPending || !material) return <PageSkeleton />;

  const categoryLabel =
    MATERIAL_CATEGORY_OPTIONS.find((opt) => opt.value === material.material_category)?.label ??
    material.material_category;

  const facts: { label: string; value: string }[] = [
    { label: 'Art', value: material.is_consumable ? 'Verbrauchsmaterial' : 'Gerät' },
    { label: 'Kategorie', value: categoryLabel },
  ];
  if (material.package_size !== null) {
    facts.push({ label: 'Packung', value: `${material.package_size} ${material.package_unit}` });
  }
  if (material.price_per_package !== null) {
    facts.push({ label: 'Preis pro Packung', value: formatEuro(material.price_per_package) });
  }
  if (material.price_per_piece !== null) {
    facts.push({ label: 'Preis pro Stück', value: formatEuro(material.price_per_piece) });
  }
  if (material.retail_section_name) {
    facts.push({ label: 'Einkaufs-Abschnitt', value: material.retail_section_name });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <HeroBand pullUpClassName="-mt-8" innerClassName="max-w-3xl" className="mb-6">
        <BackButton to="/material" tone="hero" className="mb-5" />
        <h1 className="font-display text-display font-extrabold text-hero-foreground [overflow-wrap:anywhere]">
          {material.name}
        </h1>
        <p className="mt-2 text-body text-hero-muted">{material.is_consumable ? 'Verbrauchsmaterial' : 'Gerät'}</p>
      </HeroBand>

      <section className="bg-card rounded-xl p-5 shadow-card space-y-4">
        {material.description && <p className="text-body">{material.description}</p>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-caption text-muted-foreground">{fact.label}</dt>
              <dd className="text-body font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline">
            <Link to={`/recipes?material=${material.slug}`}>Rezepte mit diesem Material</Link>
          </Button>
          {material.can_edit && (
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)} data-testid="material-edit">
              <Pencil className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
          {material.can_delete && (
            <>
              <Button type="button" variant="outline" onClick={() => setMergeOpen(true)}>
                <GitMerge className="w-4 h-4 mr-1.5" />
                Zusammenführen
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1.5 text-destructive" />
                Löschen
              </Button>
            </>
          )}
        </div>
      </section>

      {editOpen && (
        <MaterialFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          material={material}
          onSaved={(saved) => {
            if (saved.slug !== material.slug) navigate(`/material/${saved.slug}`, { replace: true });
          }}
        />
      )}
      {mergeOpen && (
        <MergeDialog open={mergeOpen} onOpenChange={setMergeOpen} sourceId={material.id} sourceName={material.name} />
      )}
      <ConfirmDialog
        open={deleteOpen}
        title={`Material „${material.name}“ löschen?`}
        description="Das Material verschwindet aus allen Rezepten."
        confirmLabel="Löschen"
        loading={deleteMaterial.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          deleteMaterial.mutate(material.id, {
            onSuccess: () => {
              notify.success('Material gelöscht');
              navigate('/material', { replace: true });
            },
            onError: (err) => {
              notify.error('Material konnte nicht gelöscht werden', { error: err });
              setDeleteOpen(false);
            },
          })
        }
      />
    </div>
  );
}
