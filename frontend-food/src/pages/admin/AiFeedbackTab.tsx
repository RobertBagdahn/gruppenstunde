import { useState, useMemo } from 'react';
import { useAiInteractionStats, useAiUserCosts } from '@/api/aiInteraction';
import { Card, CardContent } from '@/components/ui/card';
import AiCostOverviewCards from '@/components/admin/ai/AiCostOverviewCards';
import AiContextTable from '@/components/admin/ai/AiContextTable';
import AiFilterBar from '@/components/admin/ai/AiFilterBar';
import AiCostChart from '@/components/admin/ai/AiCostChart';
import AiUserCostsTable from '@/components/admin/ai/AiUserCostsTable';
import AiUserCallsModal from '@/components/admin/ai/AiUserCallsModal';
import AiPricingSection from '@/components/admin/ai/AiPricingSection';

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
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [includeEmbeddings, setIncludeEmbeddings] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: number;
    userName: string;
  } | null>(null);

  const dateFilters = useMemo(() => getDateFilters(dateRange), [dateRange]);

  const { data, isLoading, error } = useAiInteractionStats({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    includeBackground: includeEmbeddings,
  });

  const { data: userCosts } = useAiUserCosts({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    includeBackground: includeEmbeddings,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
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
      <div className="text-center py-12 text-muted-foreground">
        KI-Feedback-Statistiken konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AiFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        includeEmbeddings={includeEmbeddings}
        onIncludeEmbeddingsChange={setIncludeEmbeddings}
      />

      <AiCostOverviewCards data={data} />

      <AiContextTable contexts={data.by_context} />

      <AiCostChart timeline={data.timeline} />

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
