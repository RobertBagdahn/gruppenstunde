import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useVoteAiInteraction } from '@/api/aiInteraction';

interface AiVoteButtonsProps {
  interactionId: string;
}

export function AiVoteButtons({ interactionId }: AiVoteButtonsProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const { mutate, isPending } = useVoteAiInteraction();

  const handleVote = (vote: 'up' | 'down') => {
    if (voted === vote || isPending) return;
    mutate(
      { interactionId, vote },
      {
        onSuccess: () => {
          setVoted(vote);
          toast.success(vote === 'up' ? 'Gefällt mir' : 'Nicht hilfreich');
        },
        onError: (err) => {
          toast.error('Fehler', { description: err.message });
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote('up')}
        disabled={isPending}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1.5 text-sm transition-colors',
          voted === 'up'
            ? 'bg-green-100 text-green-700'
            : 'text-muted-foreground hover:bg-muted',
        )}
        aria-label="Gefällt mir"
        title="Gefällt mir"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={voted === 'up' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => handleVote('down')}
        disabled={isPending}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-1.5 text-sm transition-colors',
          voted === 'down'
            ? 'bg-red-100 text-red-700'
            : 'text-muted-foreground hover:bg-muted',
        )}
        aria-label="Nicht hilfreich"
        title="Nicht hilfreich"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={voted === 'down' ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>
    </div>
  );
}
