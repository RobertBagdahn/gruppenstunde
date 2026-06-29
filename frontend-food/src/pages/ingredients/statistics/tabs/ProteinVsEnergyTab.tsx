import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import HeatmapExplorer from '../components/HeatmapExplorer';
import TabFilters from '../components/TabFilters';

export default function ProteinVsEnergyTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('protein_g', 'energy_kcal', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Die Heatmap zeigt die Dichte der Zutaten nach Protein- und Energiegehalt.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <HeatmapExplorer data={data} xLabel="Protein" yLabel="Energie" xUnit="g" yUnit="kcal" />
      ) : null}
    </div>
  );
}
