/**
 * Step 6: Packliste & Felder — packing list selector.
 * Custom fields and labels are managed in the dashboard after creation.
 */
import { useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { usePackingLists } from '@/api/packingLists';
import { cn } from '@/lib/utils';

export default function StepPackingFields() {
  const { data, updateStep6, setStepValid } = useEventWizardStore();
  const { data: packingLists, isLoading } = usePackingLists();

  // Always valid (optional step)
  useEffect(() => {
    setStepValid(5, true);
  }, [setStepValid]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Packliste & Felder</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Verknüpfe eine Packliste mit deinem Event. Benutzerdefinierte Felder und Labels
          kannst du nach dem Erstellen im Dashboard hinzufügen.
        </p>
      </div>

      {/* Packing list selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Packliste</label>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade Packlisten...</p>
        ) : packingLists && packingLists.length > 0 ? (
          <div className="grid gap-2">
            {/* None option */}
            <button
              type="button"
              onClick={() => updateStep6({ packing_list_id: null })}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm',
                data.packing_list_id === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted border-border',
              )}
            >
              <div className="font-medium">Keine Packliste</div>
              <div
                className={cn(
                  'text-xs mt-0.5',
                  data.packing_list_id === null
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground',
                )}
              >
                Packliste kann später hinzugefügt werden
              </div>
            </button>

            {packingLists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => updateStep6({ packing_list_id: pl.id })}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm',
                  data.packing_list_id === pl.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'hover:bg-muted border-border',
                )}
              >
                <div className="font-medium">{pl.title}</div>
                {pl.description && (
                  <div
                    className={cn(
                      'text-xs mt-0.5',
                      data.packing_list_id === pl.id
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    {pl.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
            <p>Noch keine Packlisten vorhanden.</p>
            <p className="text-xs mt-1">
              Du kannst unter "Packlisten" eine neue erstellen und hier verknüpfen.
            </p>
          </div>
        )}
      </div>

      {/* Info about custom fields */}
      <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 text-sm">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
          <div className="text-blue-900 dark:text-blue-200">
            <p className="font-medium">Benutzerdefinierte Felder & Labels</p>
            <p className="text-xs mt-0.5">
              Du kannst im Dashboard nach dem Erstellen benutzerdefinierte Felder
              (z.B. T-Shirt-Größe) und Labels (z.B. Vegetarisch) für Teilnehmer anlegen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
