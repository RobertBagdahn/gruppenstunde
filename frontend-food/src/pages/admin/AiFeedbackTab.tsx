import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAiInteractionStats, useAiUserCosts } from '@/api/aiInteraction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import AiCostOverviewCards from '@/components/admin/ai/AiCostOverviewCards';
import AiContextTable from '@/components/admin/ai/AiContextTable';
import AiFilterBar from '@/components/admin/ai/AiFilterBar';
import AiCostChart from '@/components/admin/ai/AiCostChart';
import AiUserCostsTable from '@/components/admin/ai/AiUserCostsTable';
import AiUserCallsModal from '@/components/admin/ai/AiUserCallsModal';
import AiPricingSection from '@/components/admin/ai/AiPricingSection';
import AiRequestsTable from '@/components/admin/ai/AiRequestsTable';
import AiModelBreakdown from '@/components/admin/ai/AiModelBreakdown';

type DateRange = 'all' | '30d' | '90d' | 'year';

function getDateFilters(range: DateRange): { dateFrom?: string; dateTo?: string } {
  const today = new Date();
  const format = (d: Date) => d.toISOString().slice(0, 10);

  switch (range) {
    case '30d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return { dateFrom: format(d) };
    }
    case '90d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 90);
      return { dateFrom: format(d) };
    }
    case 'year':
      return { dateFrom: `${today.getFullYear()}-01-01` };
    default:
      return {};
  }
}

export default function AiFeedbackTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') === 'requests' ? 'requests' : 'overview';
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [includeEmbeddings, setIncludeEmbeddings] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: number;
    userName: string;
  } | null>(null);

  const dateFilters = useMemo(() => getDateFilters(dateRange), [dateRange]);

  const { data, isLoading, error, refetch } = useAiInteractionStats({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    includeBackground: includeEmbeddings,
  });

  const { data: userCosts } = useAiUserCosts({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    includeBackground: includeEmbeddings,
  });

  const viewNavigation = (
    <div className="flex gap-1 border-b overflow-x-auto">
      {(['overview', 'requests'] as const).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (view === 'requests') next.set('view', 'requests');
            else next.delete('view');
            return next;
          })}
          className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeView === view ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {view === 'overview' ? 'Übersicht' : 'Alle Anfragen'}
        </button>
      ))}
    </div>
  );

  if (activeView === 'requests') {
    return (
      <div className="space-y-4">
        {viewNavigation}
        <AiRequestsTable />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {viewNavigation}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-24 animate-pulse bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {viewNavigation}
        <div className="text-center py-12 text-muted-foreground">
          <p>KI-Feedback-Statistiken konnten nicht geladen werden.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewNavigation}
      <AiFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        includeEmbeddings={includeEmbeddings}
        onIncludeEmbeddingsChange={setIncludeEmbeddings}
      />

      <AiCostOverviewCards data={data} hasDateFilter={dateRange !== 'all'} />

      <AiContextTable contexts={data.by_context} />
      <AiModelBreakdown models={data.by_model} />

      <AiCostChart timeline={data.timeline} includeEmbeddings={includeEmbeddings} />

      <AiUserCostsTable
        users={userCosts || []}
        onUserClick={(userId, userName) => setSelectedUser({ userId, userName })}
      />

      <AiPricingSection />

      {selectedUser && (
        <AiUserCallsModal
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          userId={selectedUser.userId}
          userName={selectedUser.userName}
        />
      )}
    </div>
  );
}
