/**
 * ContentEmotions — Generic emotion buttons with counts.
 * Works with any content type via callbacks.
 */
import { EMOTION_TYPES } from '@/schemas/content';

interface ContentEmotionsProps {
  /** Emotion counts from the API: { "happy": 3, "in_love": 1, ... } */
  emotionCounts: Record<string, number>;
  /** The emotion the current user has selected (null if none) */
  userEmotion: string | null;
  /** Callback when an emotion button is clicked */
  onToggle: (emotionType: string) => void;
  /** Whether the mutation is pending */
  isPending?: boolean;
}

export default function ContentEmotions({
  emotionCounts,
  userEmotion,
  onToggle,
  isPending = false,
}: ContentEmotionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTION_TYPES.map(({ value, label, icon }) => {
        const count = emotionCounts[value] ?? 0;
        const isActive = userEmotion === value;

        return (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => onToggle(value)}
            title={label}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
              text-sm font-semibold transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isActive
                  ? 'bg-primary/10 border-primary/40 text-primary shadow-sm scale-105'
                  : 'bg-muted/50 border-border hover:bg-muted hover:border-border/80 text-muted-foreground'
              }
            `}
          >
            <span className="text-base">{icon}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
