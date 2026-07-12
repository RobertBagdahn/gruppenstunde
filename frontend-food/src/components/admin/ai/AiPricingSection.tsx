import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAiPricing } from '@/api/aiInteraction';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AiPricingSection() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAiPricing();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Button
            variant="ghost"
            className="p-0 h-auto font-bold font-display text-base hover:bg-transparent"
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            Gemini-Preise
          </Button>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          {isLoading && (
            <p className="text-center text-muted-foreground py-4">Lade Preise...</p>
          )}
          {data && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Modell</th>
                      <th className="pb-2 pr-4">Typ</th>
                      <th className="pb-2 pr-4 text-right">Input (pro 1M)</th>
                      <th className="pb-2 pr-4 text-right">Output (pro 1M)</th>
                      <th className="pb-2 pr-4 text-right">Image Output (pro 1M)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pricing.map((entry) => (
                      <tr key={entry.model} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{entry.model}</td>
                        <td className="py-2 pr-4 capitalize">{entry.type}</td>
                        <td className="py-2 pr-4 text-right">
                          {entry.input_per_1m_usd.toFixed(4)} $
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {entry.output_per_1m_usd !== null
                            ? `${entry.output_per_1m_usd.toFixed(4)} $`
                            : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {entry.image_output_per_1m_usd !== null
                            ? `${entry.image_output_per_1m_usd.toFixed(2)} $`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Umrechnungskurs: 1 USD = {data.usd_to_eur.toFixed(4)} EUR
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
