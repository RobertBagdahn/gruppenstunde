/**
 * Mobile Step Controls Component
 *
 * Provides up/down buttons for reordering steps on mobile devices.
 * Alternative to drag-and-drop for touch interfaces.
 */

import { ArrowUp, ArrowDown } from 'lucide-react';

interface MobileStepControlsProps {
  /**
   * Can move this step up (not first)
   */
  canMoveUp: boolean;

  /**
   * Can move this step down (not last)
   */
  canMoveDown: boolean;

  /**
   * Callback when moving up
   */
  onMoveUp: () => void;

  /**
   * Callback when moving down
   */
  onMoveDown: () => void;

  /**
   * Current step number (for display)
   */
  stepNumber?: number;

  /**
   * Total steps (for display)
   */
  totalSteps?: number;

  /**
   * Additional CSS class
   */
  className?: string;
}

export default function MobileStepControls({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  stepNumber,
  totalSteps,
  className = '',
}: MobileStepControlsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Up Button */}
      <button
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        title="Schritt nach oben verschieben"
        aria-label="Move step up"
      >
        <ArrowUp size={16} className="text-gray-600" />
      </button>

      {/* Step indicator (optional) */}
      {stepNumber !== undefined && totalSteps !== undefined && (
        <div className="text-xs font-medium text-gray-500 min-w-[2.5rem] text-center">
          {stepNumber}/{totalSteps}
        </div>
      )}

      {/* Down Button */}
      <button
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        title="Schritt nach unten verschieben"
        aria-label="Move step down"
      >
        <ArrowDown size={16} className="text-gray-600" />
      </button>
    </div>
  );
}
