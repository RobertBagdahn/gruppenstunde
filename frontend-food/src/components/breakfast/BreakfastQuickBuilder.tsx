import { useState, useMemo } from 'react';
import {
  Coffee,
  Apple,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Utensils,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBreakfastCatalog, useSaveDirectMeal, type WizardItemIn } from '@/api/breakfast';
import { toast } from 'sonner';

interface BreakfastQuickBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanId: number;
  mealId: number;
  normPortions?: number;
  onSaved?: () => void;
}

export function BreakfastQuickBuilder({
  open,
  onOpenChange,
  mealPlanId,
  mealId,
  normPortions = 10,
  onSaved,
}: BreakfastQuickBuilderProps) {
  const { data: catalog, isLoading } = useBreakfastCatalog();
  const saveMutation = useSaveDirectMeal(mealPlanId);

  // Selected item IDs
  const [selectedBaseIds, setSelectedBaseIds] = useState<number[]>([1]); // Default Mischbrot
  const [selectedFatIds, setSelectedFatIds] = useState<number[]>([1]); // Default Butter
  const [selectedToppingIds, setSelectedToppingIds] = useState<number[]>([1, 2]); // Default Gouda, Marmelade
  const [selectedDrinkIds, setSelectedDrinkIds] = useState<number[]>([1, 2]); // Default Kaffee, Tee
  const [selectedExtraIds, setSelectedExtraIds] = useState<number[]>([1]); // Default Äpfel

  const [showExpertMode, setShowExpertMode] = useState(false);

  // Auto-calculated portions for standard group size
  // Standard per person: Bread = 80g, Butter = 15g, Topping = 35g, Fruit = 100g, Drink = 250ml
  const portions = normPortions > 0 ? normPortions : 10;

  const toggleSelection = (
    id: number,
    current: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (current.includes(id)) {
      if (current.length > 1) {
        setter(current.filter((item) => item !== id));
      }
    } else {
      setter([...current, id]);
    }
  };

  // Estimated stats
  const estimatedStats = useMemo(() => {
    const kcalPerPerson = 550 + selectedToppingIds.length * 40 + selectedExtraIds.length * 30;
    const costPerPerson = 1.2 + (selectedToppingIds.length + selectedBaseIds.length) * 0.15;
    return {
      kcalPerPerson: Math.round(kcalPerPerson),
      costPerPerson: Number(costPerPerson.toFixed(2)),
      totalCost: Number((costPerPerson * portions).toFixed(2)),
    };
  }, [selectedBaseIds, selectedToppingIds, selectedExtraIds, portions]);

  const handleSave = () => {
    if (!catalog) return;

    const items: WizardItemIn[] = [];

    // Bases
    selectedBaseIds.forEach((id) => {
      const base = catalog.base_ingredients.find((b) => b.id === id);
      if (base) {
        const defaultPortion = base.portions?.[0];
        const qtyG = Math.round((80 / selectedBaseIds.length) * portions);
        items.push({
          ingredient_id: base.id,
          measuring_unit_id: defaultPortion?.measuring_unit_id || null,
          quantity: qtyG,
          display_name: base.name,
          factor: 1.0,
        });
      }
    });

    // Fats
    selectedFatIds.forEach((id) => {
      const fat = catalog.fat_ingredients.find((f) => f.id === id);
      if (fat) {
        const defaultPortion = fat.portions?.[0];
        const qtyG = Math.round((15 / selectedFatIds.length) * portions);
        items.push({
          ingredient_id: fat.id,
          measuring_unit_id: defaultPortion?.measuring_unit_id || null,
          quantity: qtyG,
          display_name: fat.name,
          factor: 1.0,
        });
      }
    });

    // Toppings
    selectedToppingIds.forEach((id) => {
      const top = catalog.topping_ingredients.find((t) => t.id === id);
      if (top) {
        const defaultPortion = top.portions?.[0];
        const qtyG = Math.round((35 / selectedToppingIds.length) * portions);
        items.push({
          ingredient_id: top.id,
          measuring_unit_id: defaultPortion?.measuring_unit_id || null,
          quantity: qtyG,
          display_name: top.name,
          factor: 1.0,
        });
      }
    });

    saveMutation.mutate(
      { planId: mealPlanId, mealId, items },
      {
        onSuccess: () => {
          toast.success('Frühstücksbuffet gespeichert', {
            description: `Konfiguriert für ${portions} Personen`,
          });
          onSaved?.();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error('Fehler beim Speichern', { description: err.message });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-display font-bold text-foreground">
              <Sparkles className="w-5 h-5 text-chart-4" />
              <span>1-Screen Frühstücksbaukasten</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {portions} Personen
              </span>
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Wähle einfach deine Komponenten. Die Mengen werden für {portions} Personen automatisch berechnet.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Lade Frühstücks-Katalog...</div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Brot & Basis */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="font-display font-bold text-sm text-foreground">Brot & Basis</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(catalog?.base_ingredients || []).slice(0, 6).map((base) => {
                    const active = selectedBaseIds.includes(base.id);
                    return (
                      <button
                        key={base.id}
                        type="button"
                        onClick={() => toggleSelection(base.id, selectedBaseIds, setSelectedBaseIds)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="truncate">{base.name}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Berechnung: ca. {Math.round(80 * portions)} g Basis gesamt
                </p>
              </div>

              {/* 2. Aufstriche & Belag */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="font-display font-bold text-sm text-foreground">Aufstriche & Belag</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(catalog?.topping_ingredients || []).slice(0, 6).map((top) => {
                    const active = selectedToppingIds.includes(top.id);
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => toggleSelection(top.id, selectedToppingIds, setSelectedToppingIds)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="truncate">{top.name}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span>Streichfett:</span>
                  {(catalog?.fat_ingredients || []).slice(0, 2).map((fat) => {
                    const active = selectedFatIds.includes(fat.id);
                    return (
                      <button
                        key={fat.id}
                        type="button"
                        onClick={() => toggleSelection(fat.id, selectedFatIds, setSelectedFatIds)}
                        className={`px-2 py-0.5 rounded-full font-semibold border ${
                          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {fat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Frisches & Extras */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-display font-bold text-sm text-foreground">Frisches & Extras</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(catalog?.extra_ingredients || []).slice(0, 4).map((extra) => {
                    const active = selectedExtraIds.includes(extra.id);
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        onClick={() => toggleSelection(extra.id, selectedExtraIds, setSelectedExtraIds)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="truncate">{extra.name}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Berechnung: ca. {Math.round(100 * portions)} g Frisches gesamt
                </p>
              </div>

              {/* 4. Getränke */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <h4 className="font-display font-bold text-sm text-foreground">Getränke</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(catalog?.drink_recipes || []).slice(0, 4).map((drink) => {
                    const active = selectedDrinkIds.includes(drink.id);
                    return (
                      <button
                        key={drink.id}
                        type="button"
                        onClick={() => toggleSelection(drink.id, selectedDrinkIds, setSelectedDrinkIds)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between text-left transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="truncate">{drink.title}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Berechnung: ca. {(0.25 * portions).toFixed(1)} L pro Getränk
                </p>
              </div>
            </div>

            {/* DGE Expert Mode Toggle */}
            <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
              <button
                type="button"
                onClick={() => setShowExpertMode(!showExpertMode)}
                className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-primary" />
                  DGE-Nährwert-Feinjustierung (Expertenmodus)
                </span>
                {showExpertMode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showExpertMode && (
                <div className="pt-3 mt-3 border-t border-border/40 text-xs space-y-2 text-muted-foreground animate-in fade-in-50">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-card border">
                      <span className="text-[11px] block">Basis-Anteil</span>
                      <span className="font-bold text-foreground">50%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-card border">
                      <span className="text-[11px] block">Belag-Anteil</span>
                      <span className="font-bold text-foreground">35%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-card border">
                      <span className="text-[11px] block">Fett-Anteil</span>
                      <span className="font-bold text-foreground">15%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-center pt-1">
                    Standard-Verteilung deckt ca. 25% des DGE-Tagesbedarfs ab.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer with estimation and save action */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <span className="material-symbols-outlined text-[16px] text-amber-500">local_fire_department</span>
              ca. {estimatedStats.kcalPerPerson} kcal / Person
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              ca. {estimatedStats.costPerPerson} € / P. ({estimatedStats.totalCost} €)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveMutation.isPending ? 'Speichert...' : 'Buffet übernehmen'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
