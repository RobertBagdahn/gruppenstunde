import { useSearchParams } from 'react-router-dom';
import { useIngredientRankings } from '@/api/supplies';
import LeaderboardTable from '../components/LeaderboardTable';
import TabFilters from '../components/TabFilters';

export default function ProteinChampionsTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientRankings('protein_g', { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Die proteinreichsten und proteinärmsten verifizierten Zutaten pro 100g.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <LeaderboardTable top={data.top} bottom={data.bottom} count={data.count} unit="g" />
      ) : null}
    </div>
  );
}
