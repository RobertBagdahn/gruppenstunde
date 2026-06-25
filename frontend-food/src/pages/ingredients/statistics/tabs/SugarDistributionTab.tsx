import { useSearchParams } from 'react-router-dom';
import { useIngredientDistributions } from '@/api/supplies';
import DistributionChart from '../components/DistributionChart';
import TabFilters from '../components/TabFilters';

export default function SugarDistributionTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientDistributions('sugar_g', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wie verteilt sich der Zuckergehalt über alle verifizierten Zutaten?
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <DistributionChart data={data} unit="g" label="Zucker" />
      ) : null}
    </div>
  );
}
