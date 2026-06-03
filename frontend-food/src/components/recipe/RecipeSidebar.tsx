import { toast } from 'sonner';
import PortionScaler from './PortionScaler';
import RecipeMetaCard from './RecipeMetaCard';
import type { RecipeDetail } from '@/schemas/recipe';

interface RecipeSidebarProps {
  recipe: RecipeDetail;
  recipeId: number;
  servings: number;
  onServingsChange: (servings: number) => void;
  onOpenShoppingList: () => void;
}

export default function RecipeSidebar({
  recipe,
  servings,
  onServingsChange,
  onOpenShoppingList,
}: RecipeSidebarProps) {
  const handleShare = async () => {
    const url = window.location.href;
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
      <RecipeMetaCard recipe={recipe} servings={servings} />

      {/* Portion Scaler (compact) */}
      <PortionScaler
        defaultServings={servings}
        onChange={onServingsChange}
        compact
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'cooking');
            url.searchParams.set('step', '0');
            window.location.href = url.toString();
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">skillet</span>
          Kochen starten
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Drucken
        </button>
        <button
          type="button"
          onClick={onOpenShoppingList}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
          Einkaufsliste
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          Teilen
        </button>
      </div>
    </aside>
  );
}
