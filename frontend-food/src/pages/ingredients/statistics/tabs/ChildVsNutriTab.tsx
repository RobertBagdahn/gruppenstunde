import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import ScatterExplorer from '../components/ScatterExplorer';
import TabFilters from '../components/TabFilters';

export default function ChildVsNutriTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('child_score', 'nutri_score', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wie hängt der Child-Score mit dem Nutri-Score zusammen? Sind kindgerechte Zutaten automatisch ungesund?
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <ScatterExplorer data={data} xLabel="Child-Score" yLabel="Nutri-Score" xUnit="pts" yUnit="pts" />
      ) : null}
    </div>
  );
}
