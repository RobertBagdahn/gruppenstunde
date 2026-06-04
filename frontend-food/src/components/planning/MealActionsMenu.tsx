import { useState, useEffect } from 'react';
import {
  MoreVertical,
  Edit,
  Scale,
  Unlink,
  Link2,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';

interface MealActionsMenuProps {
  meal: Meal;
  canEdit: boolean;
  onDeleteMeal: (id: number) => void;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
    external_cost_per_person?: number | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onUnlinkMeal: (mealId: number) => void;
  onLinkMeal: (mealId: number, mealType: string) => void;
}

export function MealActionsMenu({
  meal,
  canEdit,
  onDeleteMeal,
  onUpdateMeal,
  onScaleMeal,
  onUnlinkMeal,
  onLinkMeal,
}: MealActionsMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [dayPartFactor, setDayPartFactor] = useState(meal.day_part_factor);
  const [overridePortions, setOverridePortions] = useState<string>(
    meal.override_portions !== null ? String(meal.override_portions) : ''
  );
  const [note, setNote] = useState(meal.note || '');
  const [isExternal, setIsExternal] = useState(meal.is_external || false);
  const [externalEnergyKcal, setExternalEnergyKcal] = useState<string>(
    meal.external_energy_kcal !== null ? String(meal.external_energy_kcal) : ''
  );
  const [externalCostPerPerson, setExternalCostPerPerson] = useState<string>(
    meal.external_cost_per_person !== null ? String(meal.external_cost_per_person) : ''
  );

  // Keep state in sync with prop changes
  useEffect(() => {
    if (showSettings) {
      setDayPartFactor(meal.day_part_factor);
      setOverridePortions(meal.override_portions !== null ? String(meal.override_portions) : '');
      setNote(meal.note || '');
      setIsExternal(meal.is_external || false);
      setExternalEnergyKcal(meal.external_energy_kcal !== null ? String(meal.external_energy_kcal) : '');
      setExternalCostPerPerson(meal.external_cost_per_person !== null ? String(meal.external_cost_per_person) : '');
    }
  }, [showSettings, meal]);

  if (!canEdit) return null;

  const handleSave = () => {
    const updatedPortions = overridePortions.trim() === '' ? null : Number(overridePortions);
    const updatedEnergy = externalEnergyKcal.trim() === '' ? null : Number(externalEnergyKcal);
    const updatedCost = externalCostPerPerson.trim() === '' ? null : Number(externalCostPerPerson);

    onUpdateMeal(meal.id, {
      day_part_factor: Number(dayPartFactor),
      override_portions: updatedPortions,
      note: note.trim() === '' ? null : note,
      is_external: isExternal,
      external_energy_kcal: updatedEnergy,
      external_cost_per_person: updatedCost,
    });
    setShowSettings(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
            title="Aktionen"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Edit className="mr-2 h-4 w-4 text-primary" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          {canEdit && !meal.is_synced && !meal.is_external && meal.items.length > 0 && (
            <DropdownMenuItem onClick={() => onScaleMeal(meal.id)}>
              <Scale className="mr-2 h-4 w-4 text-primary" />
              <span>Auf Soll skalieren</span>
            </DropdownMenuItem>
          )}
          {meal.is_synced ? (
            <DropdownMenuItem onClick={() => onUnlinkMeal(meal.id)}>
              <Unlink className="mr-2 h-4 w-4 text-primary" />
              <span>Vom RefMeal entkoppeln</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onLinkMeal(meal.id, meal.meal_type)}>
              <Link2 className="mr-2 h-4 w-4 text-primary" />
              <span>Mit RefMeal verknüpfen</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDeleteMeal(meal.id)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Mahlzeit löschen</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mahlzeit-Einstellungen: {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="day_part_factor">Tagesanteil-Faktor (Soll)</Label>
                <Input
                  id="day_part_factor"
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={dayPartFactor}
                  onChange={(e) => setDayPartFactor(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="override_portions">Abweichende Portionen</Label>
                <Input
                  id="override_portions"
                  type="number"
                  min={1}
                  placeholder="Wie Plan"
                  value={overridePortions}
                  onChange={(e) => setOverridePortions(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 border-t pt-4">
              <Switch
                id="is_external"
                checked={isExternal}
                onCheckedChange={setIsExternal}
              />
              <Label htmlFor="is_external" className="cursor-pointer font-medium">Externe Mahlzeit (z.B. Restaurant)</Label>
            </div>

            {isExternal && (
              <div className="grid grid-cols-2 gap-4 border bg-muted/10 p-3 rounded-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="external_cost">Preis / Person (€)</Label>
                  <Input
                    id="external_cost"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="z.B. 4,50"
                    value={externalCostPerPerson}
                    onChange={(e) => setExternalCostPerPerson(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="external_energy">Energie (kcal)</Label>
                  <Input
                    id="external_energy"
                    type="number"
                    min={0}
                    step={10}
                    placeholder="Auto (Soll)"
                    value={externalEnergyKcal}
                    onChange={(e) => setExternalEnergyKcal(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 border-t pt-4">
              <Label htmlFor="note">Notiz / Speiseplan-Hinweis</Label>
              <Textarea
                id="note"
                placeholder="Hinweis für die Gruppe..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
