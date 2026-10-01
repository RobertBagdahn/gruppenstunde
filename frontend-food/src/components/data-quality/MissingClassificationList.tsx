import { useMissingClassification } from '@/api/dataQuality';
import type { MissingClassification } from '@/schemas/dataQuality';
import { Loader2, Tag, Store } from 'lucide-react';

interface MissingClassificationListProps {
  page?: number;
  pageSize?: number;
}

export default function MissingClassificationList({ page = 1, pageSize = 50 }: MissingClassificationListProps) {
  const { data, isLoading, error } = useMissingClassification({ page, page_size: pageSize });

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-title text-muted-foreground" />
      </div>
    );
  if (error) return <div className="text-danger py-4">Fehler beim Laden: {error.message}</div>;
  if (!data?.items.length) return <div className="text-muted-foreground py-4">Alle Zutaten sind klassifiziert</div>;

  const missingSection = data.items.filter((i: MissingClassification) => i.missing_retail_section);
  const missingTags = data.items.filter((i: MissingClassification) => i.missing_tags);

  return (
    <div className="space-y-6">
      {missingSection.length > 0 && (
        <details open className="rounded-xl border border-warning-border bg-warning-soft/30">
          <summary className="px-4 py-3 font-medium cursor-pointer flex items-center gap-2">
            <Store className="h-4 w-4 text-warning" />
            <span>Fehlende Abteilung ({missingSection.length})</span>
          </summary>
          <div className="border-t border-warning-border px-3 py-2 space-y-1">
            {missingSection.map((item: MissingClassification) => (
              <a
                key={item.id}
                href={`/ingredients/${item.slug}`}
                className="block rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-body"
              >
                {item.name}
              </a>
            ))}
          </div>
        </details>
      )}

      {missingTags.length > 0 && (
        <details open className="rounded-xl border border-warning-border bg-warning-soft/30">
          <summary className="px-4 py-3 font-medium cursor-pointer flex items-center gap-2">
            <Tag className="h-4 w-4 text-warning" />
            <span>Fehlende Ernährungstags ({missingTags.length})</span>
          </summary>
          <div className="border-t border-warning-border px-3 py-2 space-y-1">
            {missingTags.map((item: MissingClassification) => (
              <a
                key={item.id}
                href={`/ingredients/${item.slug}`}
                className="block rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-body"
              >
                {item.name}
              </a>
            ))}
          </div>
        </details>
      )}

      {data.items.length > 0 && missingSection.length === 0 && missingTags.length === 0 && (
        <div className="text-muted-foreground py-4">Alle Zutaten sind klassifiziert</div>
      )}
    </div>
  );
}
