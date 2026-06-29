import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import HeatmapExplorer from '../components/HeatmapExplorer';
import TabFilters from '../components/TabFilters';

export default function EnvironmentVsPriceTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('environmental_score', 'price_per_kg', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sind umweltfreundlichere Zutaten teurer? Die Heatmap zeigt die Dichte der Datenpunkte.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <HeatmapExplorer
          data={data}
          xLabel="Umweltfreundlichkeit" yLabel="Preis" xUnit="pts" yUnit="€"
          formatX={(v) => v.toFixed(1)}
          formatY={(v) => v < 1 ? `${(v * 100).toFixed(0)}ct` : `€${v.toFixed(2)}`}
        />
      ) : null}
    </div>
  );
}
