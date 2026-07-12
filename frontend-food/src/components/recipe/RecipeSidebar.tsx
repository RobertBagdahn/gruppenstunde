import { UtensilsCrossed, Printer, ShoppingCart, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PortionScaler from './PortionScaler';
import RecipeMetaCard from './RecipeMetaCard';
import type { RecipeDetail } from '@/schemas/recipe';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface RecipeSidebarProps {
  recipe: RecipeDetail;
  recipeId: number;
  portions: number;
  totalPriceEur?: number | null;
  onPortionsChange: (portions: number) => void;
  onOpenShoppingList: () => void;
  onClone: () => void;
  /**
   * Hide the portion scaler, e.g. while the inline ingredient editor is open —
   * it already has its own person-count scaler for editing quantities, so
   * showing both at once is confusing/duplicated.
   */
  hidePortionScaler?: boolean;
}

export default function RecipeSidebar({
  recipe,
  portions,
  totalPriceEur,
  onPortionsChange,
  onOpenShoppingList,
  onClone,
  hidePortionScaler = false,
}: RecipeSidebarProps) {
  const navigate = useNavigate();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const handleShare = async () => {
    // Get current URL safely
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link kopiert');
    }
  };

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-80 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Recipe Meta Card (Unified & Compact) */}
      <RecipeMetaCard recipe={recipe} portions={portions} totalPriceEur={totalPriceEur} />

      {/* Portion Scaler (compact, controlled) */}
      {!hidePortionScaler && (
        <PortionScaler
          value={portions}
          onChange={onPortionsChange}
          defaultValue={portions}
          compact
        />
      )}

      {/* Action Buttons (compact) */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            navigate(
              { search: `?mode=cooking&step=0` },
              { replace: true },
            );
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Kochen starten
        </button>
        <button
          type="button"
          onClick={onOpenShoppingList}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          Einkaufsliste
        </button>

        {/* Secondary actions as a compact icon row */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPdfDialogOpen(true)}
            title="Als PDF öffnen"
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden xl:inline">PDF</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Teilen"
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden xl:inline">Teilen</span>
          </button>
          <button
            type="button"
            onClick={onClone}
            title="Rezept clonen"
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium border border-primary/40 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 hover:border-primary/60 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden xl:inline">Clonen</span>
          </button>
        </div>
      </div>
      <PdfExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        baseUrl={`${API_BASE_URL}/api/recipes/by-slug/${recipe.slug}/export/pdf/`}
        optionType="recipe"
      />
    </aside>
  );
}
