import { Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { RecipeSearchResult } from '@/schemas/mealPlan';
import RecipePreviewContent from './RecipePreviewContent';

interface RecipePreviewSheetProps {
  recipe: RecipeSearchResult | null;
  normPortions: number;
  onOpenChange: (open: boolean) => void;
  onAdd: (recipe: RecipeSearchResult) => void;
}

/** Phone bottom sheet with the same details as the desktop preview column. */
export default function RecipePreviewSheet({ recipe, normPortions, onOpenChange, onAdd }: RecipePreviewSheetProps) {
  return (
    <Sheet open={recipe !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col gap-3 overflow-hidden rounded-t-xl p-4">
        <SheetTitle className="sr-only">Rezeptdetails</SheetTitle>
        <SheetDescription className="sr-only">Zutaten, Beschreibung und Hinweise zum Rezept</SheetDescription>
        {recipe && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <RecipePreviewContent recipe={recipe} normPortions={normPortions} />
            </div>
            <button
              type="button"
              onClick={() => onAdd(recipe)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-caption font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Gericht hinzufügen ({normPortions} P.)
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
