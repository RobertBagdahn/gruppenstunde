import { useSearchParams, Link } from 'react-router-dom';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import { useIngredientTagLists } from '@/api/supplies';
import TabFilters from '../components/TabFilters';

export default function VeganProteinTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientTagLists('vegan', { sortBy: 'protein_g', retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-body text-muted-foreground">
        Vegane Proteinquellen – alle als „vegan" getaggten Zutaten, sortiert nach Proteingehalt.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">
            {data.total_count} vegane Zutaten gefunden (von {data.total_overall} insgesamt)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">Zutat</th>
                  <th className="text-right py-2 px-3 font-medium">Protein</th>
                  <th className="text-right py-2 px-3 font-medium hidden sm:table-cell">Energie</th>
                  <th className="text-right py-2 px-3 font-medium hidden md:table-cell">Preis/kg</th>
                  <th className="text-center py-2 px-3 font-medium hidden lg:table-cell">Nutri</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3">
                      <Link to={`/ingredients/${item.slug}`} className="text-primary hover:underline font-medium">
                        {item.name}
                      </Link>
                      <span className="text-caption text-muted-foreground ml-2">{item.retail_section_name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-caption">{item.protein_g ?? '–'}</td>
                    <td className="py-2 px-3 text-right font-mono text-caption hidden sm:table-cell">{item.energy_kcal ?? '–'}</td>
                    <td className="py-2 px-3 text-right font-mono text-caption hidden md:table-cell">{item.price_per_kg ?? '–'}</td>
                    <td className="py-2 px-3 text-center hidden lg:table-cell">
                      <NutriScoreBadge value={item.nutri_class} size="sm" emptyLabel="–" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
