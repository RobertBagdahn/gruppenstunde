import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import RetailSectionTab from './RetailSectionTab';
import NutritionalTagTab from './NutritionalTagTab';
import RuleTab from './RuleTab';
import ApprovalTab from './ApprovalTab';
import AiFeedbackTab from './AiFeedbackTab';

const TABS = [
  { key: 'approvals', label: 'Freigaben' },
  { key: 'retail-sections', label: 'Abteilungen' },
  { key: 'nutritional-tags', label: 'Ernährungstags' },
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
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold font-display">Stammdaten</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate('href' in tab ? tab.href! : `/admin/${tab.key}`)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key || (tab.key === 'data-quality' && section === 'data-quality')
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalTab />}
      {activeTab === 'ai-feedback' && <AiFeedbackTab />}
      {activeTab === 'retail-sections' && <RetailSectionTab />}
      {activeTab === 'nutritional-tags' && <NutritionalTagTab />}
      {activeTab === 'rules' && <RuleTab />}
    </div>
  );
}
