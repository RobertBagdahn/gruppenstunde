import { useState } from 'react';

import { useApprovePlan, useOrderPlan, useSetQuantity } from '@/api/queries';
import { RecommendationPanel } from '@/components/blocks/RecommendationPanel';
import { QuantityStepper } from '@/components/blocks/QuantityStepper';
import { Page } from '@/components/layout/Page';
import { SidebarSection } from '@/components/layout/Sidebar';
import { QueryState } from '@/components/shared/QueryState';
import { QuestionPin } from '@/components/shared/QuestionPin';
import { SampleBadge } from '@/components/shared/SampleBadge';
import { formatInt } from '@/lib/format';

/** Own-brand order planner: target week and tranche, quantities only on the 5,000 grid, approval into the journal (BEM-01…11). */
export function OrderPlanPage() {
  const [targetYear, setTargetYear] = useState<number | undefined>(undefined);
  const [targetWeek, setTargetWeek] = useState<number | undefined>(undefined);
  const [tranche, setTranche] = useState<number | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const query = useOrderPlan({ target_year: targetYear, target_week: targetWeek, tranche });
  const data = query.data;
  const approve = useApprovePlan();

  return (
    <Page
      area="Arbeiten"
      page="Bestellplaner"
      filterTitle="Zieltermin"
      onResetFilters={() => {
        setTargetYear(undefined);
        setTargetWeek(undefined);
        setTranche(undefined);
      }}
      filters={
        <SidebarSection title="Zieltermin und Stufe">
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Jahr
            <input
              type="number"
              min={2026}
              max={2035}
              value={data?.target_year ?? ''}
              onChange={(e) => setTargetYear(Number(e.target.value))}
              className="h-8 rounded-md border border-border-strong bg-panel px-2 font-mono text-dense text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Kalenderwoche
            <input
              type="number"
              min={1}
              max={53}
              value={data?.target_week ?? ''}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              className="h-8 rounded-md border border-border-strong bg-panel px-2 font-mono text-dense text-foreground"
            />
          </label>
          {data && (
            <div role="radiogroup" aria-label="Stufe" className="flex flex-col gap-1 pt-2">
              {data.tranche_options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === data.tranche}
                  onClick={() => setTranche(option)}
                  className={`h-8 rounded-md px-3 text-left font-mono text-dense ${
                    option === data.tranche ? 'bg-row-active text-foreground-strong' : 'text-foreground-2 hover:bg-panel'
                  }`}
                >
                  {formatInt(option)}
                </button>
              ))}
            </div>
          )}
        </SidebarSection>
      }
    >
      <div className="flex flex-col gap-5 p-6">
        <QueryState error={query.error} isLoading={query.isLoading}>
          {data && (
            <>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <span className="text-section font-semibold text-foreground-strong">Ziel KW {data.target_week}/{data.target_year}</span>
                <span className="font-mono text-dense text-foreground-2">Gesamt {formatInt(data.total)} von {formatInt(data.tranche)}</span>
                <span className="font-mono text-dense text-muted-foreground">Vorschlag {formatInt(data.suggested_total)}</span>
                <QuestionPin pin="roundingThreshold" />
                <QuestionPin pin="tranche" />
                {data.unresolved !== 0 && (
                  <span role="alert" className="text-dense text-warning-text">
                    {data.unresolved > 0 ? `${formatInt(data.unresolved)} Einheiten fehlen` : `${formatInt(-data.unresolved)} Einheiten zu viel`} zur Stufe
                  </span>
                )}
              </div>

              {data.approval && (
                <p className="m-0 text-dense text-foreground-2">
                  Freigegeben am {data.approval.approved_at.slice(0, 10)} von {data.approval.author} (Tranche {formatInt(data.approval.tranche)}).
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border border-border bg-panel">
                <table className="w-full min-w-[760px] border-collapse text-dense">
                  <caption className="sr-only">Bestellpositionen</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
                      <th scope="col" className="px-4 py-2">Artikel</th>
                      <th scope="col" className="px-4 py-2 text-right">Bestand</th>
                      <th scope="col" className="px-4 py-2 text-right">Netto-Bedarf</th>
                      <th scope="col" className="px-4 py-2">Menge</th>
                      <th scope="col" className="px-4 py-2 text-right">Abweichung</th>
                      <th scope="col" className="px-4 py-2">Hinweise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.sku} className="border-b border-border-row align-top">
                        <td className="px-4 py-2.5">
                          <span className="text-foreground-strong">{row.title}</span>{' '}
                          <span className="font-mono text-caption text-muted-foreground">{row.sku}</span>
                          {row.tranche_adjustment !== 0 && (
                            <span className="block text-caption text-muted-foreground">
                              {row.tranche_adjustment > 0 ? '+' : '−'}
                              {formatInt(Math.abs(row.tranche_adjustment))} durch Tranche
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatInt(row.stock)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatInt(row.net_demand)}</td>
                        <td className="px-4 py-2.5">
                          <PlanQuantity sku={row.sku} title={row.title} quantity={row.quantity} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {row.deviation === 0 ? '–' : `${row.deviation > 0 ? '+' : '−'}${formatInt(Math.abs(row.deviation))}`}
                        </td>
                        <td className="px-4 py-2.5 text-caption text-warning-text">
                          {row.warnings.map((w) => (
                            <span key={w} className="block">
                              {w}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.special.length > 0 && (
                <section aria-label="Sonderartikel" className="rounded-lg border border-border bg-panel p-4 text-dense text-foreground-2">
                  <h3 className="m-0 mb-2 text-label uppercase text-muted-foreground">Sonderartikel (nicht in der Tranche)</h3>
                  {data.special.map((s) => (
                    <p key={s.sku} className="m-0">
                      <span className="font-mono">{s.sku}</span> {s.title} <SampleBadge />
                    </p>
                  ))}
                </section>
              )}

              {!confirming ? (
                <RecommendationPanel
                  title={`Bestellung ${formatInt(data.total)} Tüten freigeben`}
                  reason="Die Freigabe schreibt jede Menge und jede Abweichung ins Journal."
                  actions={[{ label: 'Freigeben …', primary: true, onClick: () => setConfirming(true) }]}
                />
              ) : (
                <section role="dialog" aria-label="Freigabe bestätigen" className="flex flex-col gap-3 rounded-lg border border-accent-border bg-panel p-4">
                  <p className="m-0 text-emphasis text-foreground-strong">
                    {formatInt(data.total)} Tüten für KW {data.target_week}/{data.target_year} freigeben?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        approve.mutate(
                          { target_year: data.target_year, target_week: data.target_week, tranche: data.tranche },
                          { onSuccess: () => setConfirming(false) },
                        )
                      }
                      className="h-8 rounded-md bg-accent px-3 text-dense font-semibold text-accent-foreground"
                    >
                      Freigeben
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-md border border-border-strong px-3 text-dense">
                      Abbrechen
                    </button>
                  </div>
                  {approve.error && <p role="alert" className="m-0 text-dense text-warning-text">{approve.error.message}</p>}
                </section>
              )}
            </>
          )}
        </QueryState>
      </div>
    </Page>
  );
}

/** One quantity cell: writes the change into the journal and refreshes the plan. */
function PlanQuantity({ sku, title, quantity }: { sku: string; title: string; quantity: number }) {
  const save = useSetQuantity(sku);
  return (
    <div className="flex flex-col gap-1">
      <QuantityStepper
        label={`Menge ${title}`}
        value={quantity}
        step={5_000}
        onChange={(next) => save.mutate({ quantity: next })}
      />
      {save.error && <span role="alert" className="text-caption text-warning-text">{save.error.message}</span>}
    </div>
  );
}
