/**
 * Step Actions Bar
 *
 * Top-level action buttons for step editor:
 * Save, Undo, Redo, Add Step, Generate from Items (AI)
 */

import React from 'react';
import { Save, Undo2, Redo2, Plus, Loader, Sparkles } from 'lucide-react';

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
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={!hasChanges || isSaving}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <Loader size={18} className="animate-spin" />
            Wird gespeichert...
          </>
        ) : (
          <>
            <Save size={18} />
            Speichern
          </>
        )}
      </button>

      <div className="border-r border-gray-300 h-6" />

      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        title="Rückgängig machen"
      >
        <Undo2 size={18} />
        <span className="hidden sm:inline">Rückgängig</span>
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        title="Wiederherstellen"
      >
        <span className="hidden sm:inline">Wiederherstellen</span>
        <Redo2 size={18} />
      </button>

      <div className="border-r border-gray-300 h-6" />

      {/* Add Step Button */}
      <button
        onClick={onAddStep}
        className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">Schritt</span>
      </button>

      {/* AI Generate Steps Button */}
      {onGenerateSteps && (
        <button
          onClick={onGenerateSteps}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Generiere Schritte automatisch von den Zutaten"
        >
          {isGenerating ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span className="hidden sm:inline">Generiere...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span className="hidden sm:inline">KI Generierung</span>
            </>
          )}
        </button>
      )}

      {/* Status Indicator */}
      <div className="ml-auto text-sm text-gray-600">
        {hasChanges && <span className="text-orange-600 font-medium">● Ungespeichert</span>}
        {!hasChanges && <span className="text-green-600">✓ Gespeichert</span>}
      </div>
    </div>
  );
}
