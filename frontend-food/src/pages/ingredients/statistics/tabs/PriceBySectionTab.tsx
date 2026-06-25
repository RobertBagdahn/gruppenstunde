import { useSearchParams } from 'react-router-dom';
import { useIngredientDistributions } from '@/api/supplies';
import DistributionChart from '../components/DistributionChart';
import TabFilters from '../components/TabFilters';

export default function PriceBySectionTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientDistributions('price_per_kg', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Preisverteilung pro Kilogramm – wo liegen die meisten Zutaten preislich?
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <DistributionChart data={data} unit="€" label="Preis" />
      ) : null}
    </div>
  );
}
