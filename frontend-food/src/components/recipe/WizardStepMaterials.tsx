/**
 * WizardStepMaterials — wizard step for recipe materials.
 *
 * The editor persists changes immediately through its own mutations, so this
 * step has no imperative save handle; advancing always succeeds.
 */
import { useState } from 'react';
import RecipeMaterialsEditor from './RecipeMaterialsEditor';
import RecipeMaterialSuggestionsDialog from './RecipeMaterialSuggestionsDialog';

interface WizardStepMaterialsProps {
  recipeId: number;
}

export default function WizardStepMaterials({ recipeId }: WizardStepMaterialsProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-section font-semibold">Material</h2>
        <p className="text-body text-muted-foreground mt-1">
          Geräte wie Backofen oder Topf und Verbrauchsmaterial wie Pappteller, Zahnstocher oder
          Backpapier — getrennt von den Zutaten.
        </p>
      </div>
      <RecipeMaterialsEditor recipeId={recipeId} onSuggestClick={() => setSuggestionsOpen(true)} />
      <RecipeMaterialSuggestionsDialog
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        recipeId={recipeId}
      />
    </div>
  );
}
