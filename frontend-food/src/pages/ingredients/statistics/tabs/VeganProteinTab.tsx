import { useSearchParams, Link } from 'react-router-dom';
import { useIngredientTagLists } from '@/api/supplies';
import TabFilters from '../components/TabFilters';

export default function VeganProteinTab() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const { data, isLoading } = useIngredientTagLists('vegan', { sortBy: 'protein_g', retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vegane Proteinquellen – alle als „vegan" getaggten Zutaten, sortiert nach Proteingehalt.
      </p>
      <TabFilters showRetailSection />
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {data.total_count} vegane Zutaten gefunden (von {data.total_overall} insgesamt)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      <span className="text-xs text-muted-foreground ml-2">{item.retail_section_name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{item.protein_g ?? '–'}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs hidden sm:table-cell">{item.energy_kcal ?? '–'}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs hidden md:table-cell">{item.price_per_kg ?? '–'}</td>
                    <td className="py-2 px-3 text-center hidden lg:table-cell">
                      {item.nutri_class ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'][item.nutri_class - 1] || '#94a3b8' }}>
                          {['', 'A', 'B', 'C', 'D', 'E'][item.nutri_class]}
                        </span>
                      ) : '–'}
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
