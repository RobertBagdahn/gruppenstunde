/**
 * WizardStepMaterials — wizard step for recipe materials.
 *
 * The editor persists changes immediately through its own mutations, so this
 * step has no imperative save handle; advancing always succeeds.
 */
import { useState } from 'react';
import { Package } from 'lucide-react';
import RecipeMaterialsEditor from './RecipeMaterialsEditor';
import RecipeMaterialSuggestionsDialog from './RecipeMaterialSuggestionsDialog';

interface WizardStepMaterialsProps {
  recipeId: number;
}

export default function WizardStepMaterials({ recipeId }: WizardStepMaterialsProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-4 sm:p-5 shadow-card">
        <div className="mb-4">
          <h2 className="mb-2 flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Package className="h-5 w-5" />
            </span>
            Material
          </h2>
          <p className="text-body text-muted-foreground">
            Geräte wie Backofen oder Topf und Verbrauchsmaterial wie Pappteller, Zahnstocher oder
            Backpapier — getrennt von den Zutaten.
          </p>
        </div>
        <RecipeMaterialsEditor recipeId={recipeId} onSuggestClick={() => setSuggestionsOpen(true)} />
      </section>
      <RecipeMaterialSuggestionsDialog
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        recipeId={recipeId}
      />
    </div>
  );
}
