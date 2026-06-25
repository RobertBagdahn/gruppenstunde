import { useSearchParams } from 'react-router-dom';
import { useIngredientRankings } from '@/api/supplies';
import LeaderboardTable from '../components/LeaderboardTable';
import TabFilters from '../components/TabFilters';

export default function ProteinPerEuroTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientRankings('protein_g', { retailSectionId });

  const topWithPrice = data?.top.filter((item) => item.value < 50) ?? [];
  const bottomWithPrice = data?.bottom.filter((item) => item.value > 1) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Zutaten mit dem meisten Protein pro Gramm – ideal für die Scout-Ernährung.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <LeaderboardTable top={topWithPrice} bottom={bottomWithPrice} count={data.count} unit="g" />
      ) : null}
    </div>
  );
}
