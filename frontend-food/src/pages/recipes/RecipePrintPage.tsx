/**
 * RecipePrintPage — Dedizierte Druckansicht für Rezepte.
 * Route: /recipes/:slug/print
 *
 * A4-optimiert, kein App-Layout, alle Sektionen ausgeklappt.
 * Öffne in neuem Tab, dann Browser-Drucken (Strg+P).
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { useRecipeBySlug } from '@/api/recipes';
import { useRecipeItems } from '@/api/recipes';
import { Loader2 } from 'lucide-react';
import { resolveStepPlaceholders } from '@/services/stepHelpers';
import type { RecipeStep } from '@/schemas/recipeStep';


function parseSteps(description: string): string[] {
  if (!description) return [];
  // Try to split by numbered list (1. 2. etc.) or newlines
  const lines = description.split('\n').filter((l) => l.trim());
  return lines.length > 1 ? lines : [description];
}

/**
 * Resolve the correct unit label for a recipe item, honoring the
 * composite-portion labeling rule (recipe #434 bug class): portions with
 * quantity !== 1 (e.g. "1 Portion Nudeln" = 125g) are pre-scaled conversion
 * factors — their own name MUST be used as the label, not the underlying
 * measuring_unit name ("Gramm"), which would misleadingly suggest the
 * quantity is a gram amount.
 */
function resolveUnitLabel(item: {
  portion_id: number;
  measuring_unit_name: string | null;
  ingredient_portions: { id: number; name: string; quantity: number }[];
}): string {
  const currentPortion = item.ingredient_portions.find((p) => p.id === item.portion_id);
  if (currentPortion && currentPortion.quantity !== 1) {
    return currentPortion.name;
  }
  return item.measuring_unit_name ?? '';
}

export default function RecipePrintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { data: recipe, isLoading, error } = useRecipeBySlug(slug ?? '');
  const { data: items = [] } = useRecipeItems(recipe?.id ?? 0);
  const portionsParam = Number(searchParams.get('portions')) || 0;
  const portions = portionsParam > 0 ? portionsParam : (recipe?.portions ?? 1);

  // Create RecipeItemMap for placeholder resolution
  const recipeItemMap = items.reduce(
    (map, item) => {
      map[item.id] = {
        id: item.id,
        name: item.ingredient_name || '',
        portion: {
          ingredient: { name: item.ingredient_name },
          measuring_unit: { name: item.measuring_unit_name },
        },
      };
      return map;
    },
    {} as Record<number, any>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Rezept nicht gefunden.
      </div>
    );
  }

  const steps = parseSteps(recipe.description);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="max-w-[21cm] mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-1">{recipe.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
            <span>Portionen: {portions}</span>
            {recipe.execution_time && <span>Kochzeit: {recipe.execution_time} Min.</span>}
            {recipe.preparation_time && <span>Vorbereitung: {recipe.preparation_time} Min.</span>}
            {recipe.difficulty && <span>Schwierigkeit: {recipe.difficulty}</span>}
          </div>
          {recipe.summary && (
            <p className="mt-2 text-sm text-gray-700 italic">{recipe.summary}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
          {/* Zutaten */}
          <section>
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wide border-b border-gray-300 pb-1">
              Zutaten
            </h2>
            {items.length > 0 ? (
              <ul className="space-y-1.5">
                  {items.map((item) => {
                  const basePortions = recipe?.portions ?? 1;
                  const scale = basePortions > 0 ? portions / basePortions : 1;
                  const scaledQty = item.quantity * scale;
                  const unitLabel = resolveUnitLabel({
                    portion_id: item.portion_id,
                    measuring_unit_name: item.measuring_unit_name ?? null,
                    ingredient_portions: item.ingredient_portions || [],
                  });
                  return (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="font-semibold min-w-[80px] text-right shrink-0">
                      {scaledQty % 1 === 0 ? scaledQty : parseFloat(scaledQty.toFixed(2))} {unitLabel}
                    </span>
                    <span>
                      {item.ingredient_name}
                      {item.note && (
                        <span className="text-gray-500 italic ml-1">({item.note})</span>
                      )}
                    </span>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Keine Zutaten</p>
            )}
          </section>

          {/* Nährwerte */}
          {(recipe.cached_energy_kcal || recipe.cached_protein_g) && (
            <section>
              <h2 className="text-xl font-bold mb-4 uppercase tracking-wide border-b border-gray-300 pb-1">
                Nährwerte pro 100g
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {recipe.cached_energy_kcal && (
                  <>
                    <dt className="text-gray-600">Energie</dt>
                    <dd className="font-medium">{Math.round(recipe.cached_energy_kcal)} kcal</dd>
                  </>
                )}
                {recipe.cached_protein_g && (
                  <>
                    <dt className="text-gray-600">Protein</dt>
                    <dd className="font-medium">{recipe.cached_protein_g.toFixed(1)} g</dd>
                  </>
                )}
                {recipe.cached_fat_g && (
                  <>
                    <dt className="text-gray-600">Fett</dt>
                    <dd className="font-medium">{recipe.cached_fat_g.toFixed(1)} g</dd>
                  </>
                )}
                {recipe.cached_carbohydrate_g && (
                  <>
                    <dt className="text-gray-600">Kohlenhydrate</dt>
                    <dd className="font-medium">{recipe.cached_carbohydrate_g.toFixed(1)} g</dd>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>

        {/* Zubereitung — Structured Steps or Fallback */}
        {recipe.has_structured_steps && recipe.steps && recipe.steps.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wide border-b border-gray-300 pb-1">
              Zubereitung
            </h2>
            <div className="space-y-6">
              {recipe.steps.map((step: RecipeStep, index: number) => {
                const resolvedInstruction = resolveStepPlaceholders(step, recipeItemMap);
                return (
                  <div key={step.id} className="border-l-4 border-black pl-4">
                    {/* Step header with number and duration */}
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      {step.section && (
                        <span className="text-xs font-semibold uppercase text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {step.section}
                        </span>
                      )}
                      {step.duration_minutes && (
                        <span className="text-xs text-gray-600 ml-auto">
                          ⏱ {step.duration_minutes} min
                        </span>
                      )}
                    </div>

                    {/* Instruction text */}
                    <p className="text-sm leading-relaxed mb-2 text-black">
                      {resolvedInstruction || '(Keine Anleitung)'}
                    </p>

                    {/* Step ingredients (if any) */}
                    {step.step_ingredients && step.step_ingredients.length > 0 && (
                      <div className="mt-2 ml-2 text-xs bg-gray-50 p-2 rounded border border-gray-200">
                        <p className="font-semibold text-gray-700 mb-1">Zutaten für diesen Schritt:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                          {step.step_ingredients.map((ing) => {
                            const item = items.find((i) => i.id === ing.recipe_item_id);
                            if (!item) return null;
                            const basePortions = recipe?.portions ?? 1;
                            const scale = basePortions > 0 ? portions / basePortions : 1;
                            const scaledQty = (item.quantity ?? 0) * (ing.quantity_modifier ?? 1.0) * scale;
                            const unitLabel = resolveUnitLabel({
                              portion_id: item.portion_id,
                              measuring_unit_name: item.measuring_unit_name ?? null,
                              ingredient_portions: item.ingredient_portions || [],
                            });
                            return (
                              <li key={ing.id}>
                                {scaledQty % 1 === 0 ? scaledQty : parseFloat(scaledQty.toFixed(2))} {unitLabel}{' '}
                                {item.ingredient_name || `Item #${ing.recipe_item_id}`}
                                {ing.preparation && <span className="italic ml-1">({ing.preparation})</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : steps.length > 0 ? (
          // Fallback: render from description
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wide border-b border-gray-300 pb-1">
              Zubereitung
            </h2>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
          <span>Inspi — {window.location.origin}/recipes/{slug}</span>
          <button
            onClick={() => window.print()}
            className="print:hidden text-blue-600 underline"
          >
            Drucken
          </button>
        </div>
      </div>
    </div>
  );
}
