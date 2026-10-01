import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, Loader2 } from 'lucide-react';
import { useDuplicateGroups, useMergeGroup } from '@/api/dataOffensive';
import type { DuplicateGroup } from '@/schemas/dataOffensive';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from './offensiveMeta';

interface DuplicateGroupsPanelProps {
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

function GroupCard({ group, onNotify }: { group: DuplicateGroup; onNotify: DuplicateGroupsPanelProps['onNotify'] }) {
  const merge = useMergeGroup();
  const [targetId, setTargetId] = useState(group.items[0]?.id);
  // Nothing is merged by default: every source must be ticked consciously.
  const [included, setIncluded] = useState<Set<number>>(new Set());

  const sources = group.items.filter((item) => item.id !== targetId && included.has(item.id));

  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 space-y-2">
      <ul className="space-y-1">
        {group.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name={`target-${group.key}`}
              checked={targetId === item.id}
              onChange={() => setTargetId(item.id)}
              aria-label={`${item.name} als Ziel behalten`}
            />
            <input
              type="checkbox"
              checked={included.has(item.id)}
              disabled={targetId === item.id}
              onChange={() =>
                setIncluded((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
              aria-label={`${item.name} zusammenführen`}
            />
            <Link
              to={`/ingredients/${item.slug}`}
              target="_blank"
              className={cn('truncate hover:text-primary', targetId === item.id && 'font-semibold')}
            >
              {item.name}
            </Link>
            <span className="ml-auto shrink-0 text-caption text-muted-foreground">
              {STATUS_LABELS[item.status] ?? item.status} · {item.usage_count}×
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">Punkt = behalten, Haken = hineinmergen</p>
        <Button
          size="sm"
          variant="outline"
          disabled={merge.isPending || sources.length === 0 || targetId === undefined}
          onClick={() =>
            targetId !== undefined &&
            merge.mutate(
              { targetId, sourceIds: sources.map((item) => item.id) },
              {
                onSuccess: (result) =>
                  onNotify('success', `${result.changed} Zutat(en) zusammengeführt.`),
                onError: (error) => onNotify('error', error.message),
              }
            )
          }
        >
          {merge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
          {sources.length} zusammenführen
        </Button>
      </div>
    </div>
  );
}

export default function DuplicateGroupsPanel({ onNotify }: DuplicateGroupsPanelProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useDuplicateGroups(page);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-display text-section font-bold">Ähnliche Namen</h2>
        <p className="text-body text-muted-foreground">
          Namensvarianten wie „Tomate“/„Tomaten“ oder „Brokkoli (Röschen)“. Meistgenutzte Gruppen zuerst.
          {data && ` ${data.total} Gruppen.`}
        </p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-body text-destructive">
          {error.message}{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Erneut versuchen
          </button>
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {data.items.map((group) => (
              <GroupCard key={group.items.map((item) => item.id).join('-')} group={group} onNotify={onNotify} />
            ))}
          </div>
          {data.total_pages > 1 && (
            <Pagination currentPage={data.page} totalPages={data.total_pages} onPageChange={setPage} />
          )}
        </>
      ) : (
        <p className="text-body text-muted-foreground">Keine ähnlichen Namen gefunden.</p>
      )}
    </section>
  );
}
