/**
 * Step Instruction Editor
 *
 * Edits the instruction text with live placeholder preview,
 * duration, and section field.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { RecipeStep } from '@/schemas/recipeStep';
import LivePreview from './LivePreview';
import PlaceholderInsertMenu from './PlaceholderInsertMenu';

interface StepInstructionEditorProps {
  instruction: string;
  durationMinutes: number | null | undefined;
  section: string | undefined;
  stepIngredientCount?: number;
  onUpdate: (updates: Partial<RecipeStep>) => void;
}

export default function StepInstructionEditor({
  instruction,
  durationMinutes,
  section,
  stepIngredientCount = 0,
  onUpdate,
}: StepInstructionEditorProps) {
  const [localInstruction, setLocalInstruction] = useState(instruction);
  const [localDuration, setLocalDuration] = useState(durationMinutes || '');
  const [localSection, setLocalSection] = useState(section || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalInstruction(instruction);
  }, [instruction]);

  useEffect(() => {
    setLocalDuration(durationMinutes || '');
  }, [durationMinutes]);

  useEffect(() => {
    setLocalSection(section || '');
  }, [section]);

  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInstruction(e.target.value);
  };

  const handleInstructionBlur = () => {
    if (localInstruction !== instruction) {
      onUpdate({ instruction: localInstruction });
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDuration(e.target.value);
  };

  const handleDurationBlur = () => {
    const duration = localDuration ? parseInt(String(localDuration), 10) : null;
    if (duration !== durationMinutes) {
      onUpdate({ duration_minutes: duration });
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSection(e.target.value);
  };

  const handleSectionBlur = () => {
    if (localSection !== section) {
      onUpdate({ section: localSection || '' });
    }
  };

  // Handle placeholder insertion
  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = localInstruction.substring(0, start);
    const after = localInstruction.substring(end);
    const newText = before + placeholder + after;

    setLocalInstruction(newText);
    
    // Move cursor after inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Anweisung</label>
          <PlaceholderInsertMenu
            onInsert={handleInsertPlaceholder}
            ingredientCount={stepIngredientCount}
            className="text-xs"
          />
        </div>
        <textarea
          ref={textareaRef}
          value={localInstruction}
          onChange={handleInstructionChange}
          onBlur={handleInstructionBlur}
          placeholder="z. B. 'Mehl und {ingredient_name} vermischen bis glatt...'"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-24 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Verwende das Platzhalter-Menü oder tippe manuell Platzhalter ein (z.B. {'{ingredient_name}'})
        </p>
      </div>

      {/* Live Preview */}
      <LivePreview
        instruction={localInstruction}
        title="Vorschau"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dauer (Min.)</label>
          <input
            type="number"
            min="0"
            max="999"
            value={localDuration}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
            placeholder="z. B. 5"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sektion</label>
          <input
            type="text"
            value={localSection}
            onChange={handleSectionChange}
            onBlur={handleSectionBlur}
            placeholder="z. B. 'Vorbereitung'"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
