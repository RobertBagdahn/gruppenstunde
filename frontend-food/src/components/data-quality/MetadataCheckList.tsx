import { useRecipeMetadataCheck } from '@/api/dataQuality';
import type { RecipeMetadataCheck } from '@/schemas/dataQuality';
import { Image, Tags, FileText } from 'lucide-react';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import ErrorDisplay from '@/components/ErrorDisplay';

interface MetadataCheckListProps {
  page?: number;
  pageSize?: number;
}

export default function MetadataCheckList({ page = 1, pageSize = 50 }: MetadataCheckListProps) {
  const { data, isLoading, error } = useRecipeMetadataCheck({ page, page_size: pageSize });

  if (isLoading)
    return (
      <SkeletonTableRows rows={5} columns={3} label="Einträge werden geladen" />
    );
  if (error) return <ErrorDisplay variant="inline" error={error} title="Daten konnten nicht geladen werden" />;
  if (!data?.items.length) return <div className="text-muted-foreground py-4">Alle Rezepte haben vollständige Metadaten</div>;

  return (
    <div className="space-y-2">
      {data.items.map((item: RecipeMetadataCheck) => (
        <a
          key={item.id}
          href={`/recipes/${item.slug}`}
          className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
        >
          <span className="font-medium block mb-1">{item.title}</span>
          <div className="flex gap-3 text-caption">
            {item.missing_image && (
              <span className="flex items-center gap-1 text-warning">
                <Image className="h-3 w-3" /> Kein Bild
              </span>
            )}
            {item.missing_tags && (
              <span className="flex items-center gap-1 text-warning">
                <Tags className="h-3 w-3" /> Keine Tags
              </span>
            )}
            {item.missing_summary && (
              <span className="flex items-center gap-1 text-warning">
                <FileText className="h-3 w-3" /> Keine Zusammenfassung
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
