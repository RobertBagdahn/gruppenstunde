import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import RetailSectionTab from './RetailSectionTab';
import NutritionalTagTab from './NutritionalTagTab';
import TagTab from './TagTab';
import RuleTab from './RuleTab';
import ApprovalTab from './ApprovalTab';
import AiFeedbackTab from './AiFeedbackTab';

const TABS = [
  { key: 'approvals', label: 'Freigaben' },
  { key: 'retail-sections', label: 'Abteilungen' },
  { key: 'nutritional-tags', label: 'Ernährungstags' },
  { key: 'tags', label: 'Tags' },
  { key: 'rules', label: 'Regeln' },
  { key: 'ai-feedback', label: 'KI Feedback' },
  { key: 'data-quality', label: 'Datenqualität', href: '/admin/data-quality/ingredients' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeTab: TabKey = (TABS.find((t) => t.key === section)?.key) ?? 'retail-sections';

  if (!section) {
    return <Navigate to="/admin/approvals" replace />;
  }

  // Redirect data-quality tab to its own page
  if (section === 'data-quality') {
    return <Navigate to="/admin/data-quality/ingredients" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <PageHeader
        title="Stammdaten"
        description="Abteilungen, Ernährungsmerkmale, Tags, Regeln und Freigaben pflegen."
        breadcrumbs={[{ label: 'Startseite', to: '/' }, { label: 'Stammdaten' }]}
      >
        {/* Tab Navigation (URL-State: /admin/:section) */}
        <nav aria-label="Stammdaten-Bereiche" className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key || (tab.key === 'data-quality' && section === 'data-quality');
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => navigate('href' in tab ? tab.href! : `/admin/${tab.key}`)}
                className={cn(
                  'press flex h-11 md:h-9 shrink-0 items-center rounded-full border bg-card px-4 text-body whitespace-nowrap transition-colors duration-200',
                  isActive
                    ? 'border-primary font-semibold text-primary-dark'
                    : 'border-border font-medium text-foreground hover:border-primary-soft-border',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </PageHeader>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalTab />}
      {activeTab === 'ai-feedback' && <AiFeedbackTab />}
      {activeTab === 'retail-sections' && <RetailSectionTab />}
      {activeTab === 'nutritional-tags' && <NutritionalTagTab />}
      {activeTab === 'tags' && <TagTab />}
      {activeTab === 'rules' && <RuleTab />}
    </div>
  );
}
