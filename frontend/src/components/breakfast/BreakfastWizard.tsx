/**
 * BreakfastWizard.tsx
 * Main component for the breakfast wizard with step-by-step meal selection and creation.
 * Displays catalog items, allows clicking for details, and provides create buttons for custom items.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BreakfastCatalog, BaseIngredient, ToppingIngredient, ExtraIngredient } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { BreakfastItemCard } from './BreakfastItemCard';
import { CreateIngredientModal } from './CreateIngredientModal';
import { CreateRecipeModal } from './CreateRecipeModal';

export type BreakfastStep = 'base' | 'topping' | 'fat' | 'extra' | 'drink' | 'warm' | 'summary';

interface BreakfastWizardProps {
  groupId?: number;
  onComplete?: (selectedItems: any) => void;
}

export function BreakfastWizard({ groupId, onComplete }: BreakfastWizardProps) {
  const [currentStep, setCurrentStep] = useState<BreakfastStep>('base');
  const [selectedItems, setSelectedItems] = useState<Record<string, any[]>>({
    base: [],
    topping: [],
    fat: [],
    extra: [],
    drink: [],
    warm: [],
  });
  const [createModalOpen, setCreateModalOpen] = useState<{
    type: 'ingredient' | 'recipe' | null;
    step: BreakfastStep | null;
  }>({ type: null, step: null });
  const [detailView, setDetailView] = useState<{
    item: any;
    type: 'ingredient' | 'recipe';
  } | null>(null);

  // Fetch breakfast catalog
  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['breakfast-catalog', groupId],
    queryFn: async () => {
      const params = groupId ? `?group_id=${groupId}` : '';
      const response = await ApiClient.get(`/api/supply/breakfast-catalog/${params}`);
      return response.data as BreakfastCatalog;
    },
  });

  const steps: { key: BreakfastStep; label: string; field: keyof BreakfastCatalog }[] = [
    { key: 'base', label: 'Basis-Zutaten', field: 'base_ingredients' },
    { key: 'topping', label: 'Belag', field: 'topping_ingredients' },
    { key: 'fat', label: 'Streichfett', field: 'fat_ingredients' },
    { key: 'extra', label: 'Extras', field: 'extra_ingredients' },
    { key: 'drink', label: 'Getränke', field: 'drink_ingredients' },
    { key: 'warm', label: 'Warme Speisen', field: 'warm_meal_recipes' },
    { key: 'summary', label: 'Zusammenfassung', field: 'base_ingredients' },
  ];

  const currentStepData = steps.find((s) => s.key === currentStep);
  const items = currentStepData && catalog ? (catalog[currentStepData.field] as any[]) : [];

  const handleSelectItem = (item: any) => {
    setSelectedItems((prev) => {
      const stepItems = prev[currentStep] || [];
      const isSelected = stepItems.some((i) => i.id === item.id);
      return {
        ...prev,
        [currentStep]: isSelected
          ? stepItems.filter((i) => i.id !== item.id)
          : [...stepItems, item],
      };
    });
  };

  const handleNextStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const handleComplete = () => {
    onComplete?.(selectedItems);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error as Error} />;

  const isStepSelected = selectedItems[currentStep]?.length > 0;
  const canProceed = isStepSelected || currentStep === 'summary';

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <button
            key={step.key}
            onClick={() => setCurrentStep(step.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              currentStep === step.key
                ? 'bg-blue-600 text-white'
                : selectedItems[step.key]?.length > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-700'
            }`}
          >
            {step.label}
            {selectedItems[step.key]?.length > 0 && (
              <span className="ml-2">({selectedItems[step.key].length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      {currentStep === 'summary' ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Zusammenfassung</h2>
          {Object.entries(selectedItems).map(([step, items]) => (
            items.length > 0 && (
              <div key={step}>
                <h3 className="font-semibold">
                  {steps.find((s) => s.key === step)?.label}
                </h3>
                <ul className="space-y-2">
                  {(items as any[]).map((item) => (
                    <li key={item.id} className="text-sm ml-4">
                      • {item.name || item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{currentStepData?.label}</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCreateModalOpen({ type: 'ingredient', step: currentStep })
              }
            >
              + Neue {currentStep === 'drink' ? 'Getränk' : 'Zutat'} erstellen
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="cursor-pointer">
                <div
                  onClick={() => handleSelectItem(item)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedItems[currentStep]?.some((i) => i.id === item.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <h3 className="font-semibold">{item.name || item.title}</h3>
                  {item.energy_kcal && (
                    <p className="text-sm text-gray-600">{item.energy_kcal} kcal</p>
                  )}
                  {item.owner_name && (
                    <p className="text-xs text-gray-500 mt-1">von {item.owner_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePreviousStep}
          disabled={currentStep === 'base'}
        >
          ← Zurück
        </Button>

        {currentStep === 'summary' ? (
          <Button onClick={handleComplete} disabled={false}>
            Fertig ✓
          </Button>
        ) : (
          <Button
            onClick={handleNextStep}
            disabled={!canProceed}
          >
            Weiter →
          </Button>
        )}
      </div>

      {/* Modals */}
      <CreateIngredientModal
        isOpen={createModalOpen.type === 'ingredient' && createModalOpen.step === currentStep}
        onClose={() => setCreateModalOpen({ type: null, step: null })}
        onSuccess={() => {
          // Refresh catalog
          setCreateModalOpen({ type: null, step: null });
        }}
        groupId={groupId}
      />

      <CreateRecipeModal
        isOpen={createModalOpen.type === 'recipe' && createModalOpen.step === currentStep}
        onClose={() => setCreateModalOpen({ type: null, step: null })}
        onSuccess={() => {
          setCreateModalOpen({ type: null, step: null });
        }}
        groupId={groupId}
      />

      {/* Detail View Modal */}
      {detailView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {detailView.item.name || detailView.item.title}
            </h2>
            <p className="text-sm text-gray-600">
              {detailView.item.description}
            </p>
            {detailView.item.owner_name && (
              <p className="text-xs text-gray-500">von {detailView.item.owner_name}</p>
            )}
            <Button onClick={() => setDetailView(null)} className="w-full">
              Schließen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
