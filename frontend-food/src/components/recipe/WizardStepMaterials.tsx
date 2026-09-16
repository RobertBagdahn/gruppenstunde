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
        <h2 className="text-xl font-semibold">Materialien</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verbrauchs- und Hilfsmaterialien wie Zahnstocher, Holzspieße oder Backpapier — getrennt
          von Zutaten und Equipment.
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
