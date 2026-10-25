/**
 * MaterialFormDialog — create or edit a material (device or consumable).
 *
 * Any logged-in user may create materials; editing is limited by `can_edit`
 * of the API. Prices and package size are optional.
 */
import { useState } from 'react';
import { notify } from '@/lib/notify';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRetailSections } from '@/api/supplies';
import { useCreateMaterial, useUpdateMaterial } from '@/api/materials';
import { MATERIAL_CATEGORY_OPTIONS, MaterialInSchema, type Material } from '@/schemas/supply';

const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-ring';

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing material to edit; creates a new one when omitted. */
  material?: Material;
  onSaved?: (material: Material) => void;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function MaterialFormDialog({ open, onOpenChange, material, onSaved }: MaterialFormDialogProps) {
  const create = useCreateMaterial();
  const update = useUpdateMaterial(material?.id ?? 0);
  const { data: retailSections } = useRetailSections();

  const [name, setName] = useState(material?.name ?? '');
  const [isConsumable, setIsConsumable] = useState(material?.is_consumable ?? false);
  const [category, setCategory] = useState(material?.material_category ?? 'kitchen');
  const [packageSize, setPackageSize] = useState(material?.package_size?.toString().replace('.', ',') ?? '');
  const [packageUnit, setPackageUnit] = useState(material?.package_unit ?? 'Stück');
  const [price, setPrice] = useState(material?.price_per_package?.toString().replace('.', ',') ?? '');
  const [retailSectionId, setRetailSectionId] = useState<string>(material?.retail_section_id?.toString() ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isPending = create.isPending || update.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const size = parseOptionalNumber(packageSize);
    const priceValue = parseOptionalNumber(price);
    const parsed = MaterialInSchema.safeParse({
      name,
      material_category: category,
      is_consumable: isConsumable,
      package_size: Number.isNaN(size) ? undefined : size,
      package_unit: packageUnit.trim() || 'Stück',
      price_per_package: Number.isNaN(priceValue) ? undefined : priceValue,
      retail_section_id: retailSectionId ? Number(retailSectionId) : null,
    });
    if (!parsed.success || Number.isNaN(size) || Number.isNaN(priceValue)) {
      const next: Record<string, string> = {};
      if (!parsed.success) {
        for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      }
      if (Number.isNaN(size)) next.package_size = 'Bitte eine Zahl eingeben';
      if (Number.isNaN(priceValue)) next.price_per_package = 'Bitte eine Zahl eingeben';
      setErrors(next);
      return;
    }
    setErrors({});

    const handlers = {
      onSuccess: (saved: Material) => {
        notify.success(material ? 'Material gespeichert' : 'Material angelegt');
        onSaved?.(saved);
        onOpenChange(false);
      },
      onError: (err: unknown) =>
        notify.error(material ? 'Material konnte nicht gespeichert werden' : 'Material konnte nicht angelegt werden', {
          error: err,
        }),
    };
    if (material) update.mutate(parsed.data, handlers);
    else create.mutate(parsed.data, handlers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{material ? 'Material bearbeiten' : 'Neues Material'}</DialogTitle>
            <DialogDescription>
              Geräte wie Backofen oder Topf und Verbrauchsmaterial wie Pappteller oder Zahnstocher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="material-name">Name</Label>
            <Input id="material-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            {errors.name && <p className="text-caption text-danger">{errors.name}</p>}
          </div>

          <label className="flex items-center gap-2 text-body cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isConsumable}
              onChange={(e) => setIsConsumable(e.target.checked)}
              data-testid="material-consumable"
            />
            Verbrauchsmaterial (wird aufgebraucht und kommt auf die Einkaufsliste)
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="material-category">Kategorie</Label>
            <select
              id="material-category"
              className={SELECT_CLASS}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {MATERIAL_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="material-package-size">Packungsgröße</Label>
              <Input
                id="material-package-size"
                inputMode="decimal"
                placeholder="z. B. 50"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
              />
              {errors.package_size && <p className="text-caption text-danger">{errors.package_size}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-package-unit">Einheit</Label>
              <Input
                id="material-package-unit"
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="material-price">Preis pro Packung (€)</Label>
              <Input
                id="material-price"
                inputMode="decimal"
                placeholder="z. B. 3,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {errors.price_per_package && <p className="text-caption text-danger">{errors.price_per_package}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-section">Einkaufs-Abschnitt</Label>
              <select
                id="material-section"
                className={SELECT_CLASS}
                value={retailSectionId}
                onChange={(e) => setRetailSectionId(e.target.value)}
              >
                <option value="">Keiner</option>
                {(retailSections ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending} data-testid="material-submit">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
