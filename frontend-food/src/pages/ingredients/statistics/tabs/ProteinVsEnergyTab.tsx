import { useSearchParams } from 'react-router-dom';
import { useIngredientScatter } from '@/api/supplies';
import ScatterExplorer from '../components/ScatterExplorer';
import TabFilters from '../components/TabFilters';

export default function ProteinVsEnergyTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientScatter('protein_g', 'energy_kcal', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Korrelation zwischen Proteingehalt und Kalorien – liefern proteinreiche Zutaten mehr Energie?
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-96 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <ScatterExplorer data={data} xLabel="Protein" yLabel="Energie" xUnit="g" yUnit="kcal" />
      ) : null}
    </div>
  );
}
