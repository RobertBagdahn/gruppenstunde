/**
 * Step Actions Bar
 *
 * Top-level action buttons for step editor:
 * Save, Undo, Redo, Add Step, Generate from Items (AI)
 */

import { Save, Undo2, Redo2, Plus, Loader, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepActionsBarProps {
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddStep: () => void;
  onGenerateSteps?: () => void;
  isGenerating?: boolean;
}

export default function StepActionsBar({
  hasChanges,
  canUndo,
  canRedo,
  isSaving,
  onSave,
  onUndo,
  onRedo,
  onAddStep,
  onGenerateSteps,
  isGenerating = false,
}: StepActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
      {/* Save Button */}
      <Button size="sm" onClick={onSave} disabled={!hasChanges || isSaving}>
        {isSaving ? (
          <>
            <Loader size={16} className="mr-2 animate-spin" />
            Wird gespeichert...
          </>
        ) : (
          <>
            <Save size={16} className="mr-2" />
            Speichern
          </>
        )}
      </Button>

      <div className="border-r border-border h-6" />

      {/* Undo Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Rückgängig machen"
      >
        <Undo2 size={16} className="mr-1" />
        <span className="hidden sm:inline">Rückgängig</span>
      </Button>

      {/* Redo Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="Wiederherstellen"
      >
        <span className="hidden sm:inline">Wiederherstellen</span>
        <Redo2 size={16} className="ml-1" />
      </Button>

      <div className="border-r border-border h-6" />

      {/* Add Step Button */}
      <Button variant="secondary" size="sm" onClick={onAddStep}>
        <Plus size={16} className="mr-1" />
        <span className="hidden sm:inline">Schritt</span>
      </Button>

      {/* AI Generate Steps Button */}
      {onGenerateSteps && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateSteps}
          disabled={isGenerating}
          title="Generiere Schritte automatisch von den Zutaten"
          className="text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
        >
          {isGenerating ? (
            <>
              <Loader size={16} className="mr-2 animate-spin" />
              <span className="hidden sm:inline">Generiere...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              <span className="hidden sm:inline">KI Generierung</span>
            </>
          )}
        </Button>
      )}

      {/* Status Indicator */}
      <div className="ml-auto text-sm text-muted-foreground">
        {hasChanges && <span className="text-orange-600 font-medium">● Ungespeichert</span>}
        {!hasChanges && <span className="text-green-600">✓ Gespeichert</span>}
      </div>
    </div>
  );
}
