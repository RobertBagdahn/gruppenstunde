/**
 * CreateRecipePage — Recipe creation using the RecipeWizard (5-step wizard).
 * Replaces the generic ContentStepper for recipe-specific creation flow.
 */
import RecipeWizard from '@/components/recipe/RecipeWizard';

export default function CreateRecipePage() {
  return <RecipeWizard />;
}
