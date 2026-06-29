import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import HeatmapExplorer from '../components/HeatmapExplorer';
import TabFilters from '../components/TabFilters';

export default function SugarVsFatTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('sugar_g', 'fat_g', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Die Heatmap zeigt die Dichte der Zutaten nach Zucker- und Fettgehalt.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <HeatmapExplorer data={data} xLabel="Zucker" yLabel="Fett" xUnit="g" yUnit="g" />
      ) : null}
    </div>
  );
}
