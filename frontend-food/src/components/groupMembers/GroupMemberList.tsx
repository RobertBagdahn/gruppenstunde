import { Trash2 } from 'lucide-react';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import type { GroupMember } from '@/schemas/mealPlan';

const GENDER_LABELS: Record<string, string> = {
  male: 'M',
  female: 'W',
  no_answer: 'k.A.',
};

interface Props {
  members: GroupMember[];
  onDelete: (memberId: number) => void;
  isDeleting: boolean;
}

export function GroupMemberList({ members, onDelete, isDeleting }: Props) {
  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Noch keine Personen in der Gruppe.
      </div>
    );
  }

  return (
    <CardTable>
      {members.map((member) => (
        <DataCardRow key={member.id}>
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-medium text-sm truncate">
                {member.name || <span className="italic text-muted-foreground">Ohne Namen</span>}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {member.age} J.
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                {GENDER_LABELS[member.gender] || 'k.A.'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {member.nutritional_tags.length > 0 && (
                <div className="hidden sm:flex gap-1">
                  {member.nutritional_tags.map((tag) => (
                    <span key={tag.id} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => onDelete(member.id)}
                disabled={isDeleting}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Person entfernen"
                title="Person entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {member.nutritional_tags.length > 0 && (
            <div className="sm:hidden flex gap-1 mt-1 flex-wrap">
              {member.nutritional_tags.map((tag) => (
                <span key={tag.id} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </DataCardRow>
      ))}
    </CardTable>
  );
}
