import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import ScatterExplorer from '../components/ScatterExplorer';
import TabFilters from '../components/TabFilters';

export default function EnvironmentVsPriceTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('environmental_score', 'price_per_kg', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sind umweltfreundlichere Zutaten teurer? Ein Scatterplot zeigt den Zusammenhang.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <ScatterExplorer data={data} xLabel="Umweltfreundlichkeit" yLabel="Preis" xUnit="pts" yUnit="€" />
      ) : null}
    </div>
  );
}
