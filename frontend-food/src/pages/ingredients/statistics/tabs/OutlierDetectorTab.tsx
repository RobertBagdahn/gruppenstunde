import { useSearchParams } from 'react-router-dom';
import { useIngredientOutliers } from '@/api/supplies';
import OutlierAccordion from '../components/OutlierAccordion';
import TabFilters from '../components/TabFilters';

export default function OutlierDetectorTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientOutliers({ retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        IQR-basierte Ausreißererkennung – welche Zutaten weichen extrem von der Norm ab?
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <OutlierAccordion fields={data.fields} summary={data.summary} />
      ) : null}
    </div>
  );
}
