import HeroBand from '@/components/shared/HeroBand';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import RetailSectionTab from './RetailSectionTab';
import NutritionalTagTab from './NutritionalTagTab';
import EquipmentTab from './EquipmentTab';
import TagTab from './TagTab';
import RuleTab from './RuleTab';
import ApprovalTab from './ApprovalTab';
import AiFeedbackTab from './AiFeedbackTab';

const TABS = [
  { key: 'approvals', label: 'Freigaben' },
  { key: 'retail-sections', label: 'Abteilungen' },
  { key: 'equipment', label: 'Equipment' },
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-6">
<HeroBand pullUpClassName="-mt-4 md:-mt-8" className="mb-6">
      <h1 className="font-display text-display font-extrabold text-hero-foreground">Stammdaten</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pt-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate('href' in tab ? tab.href! : `/admin/${tab.key}`)}
            className={cn(
              'press h-10 px-4 rounded-full text-body font-semibold whitespace-nowrap transition-colors',
              activeTab === tab.key || (tab.key === 'data-quality' && section === 'data-quality')
                ? 'bg-hero-foreground text-foreground'
                : 'text-hero-muted hover:bg-hero-soft hover:text-hero-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      </HeroBand>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalTab />}
      {activeTab === 'ai-feedback' && <AiFeedbackTab />}
      {activeTab === 'retail-sections' && <RetailSectionTab />}
      {activeTab === 'equipment' && <EquipmentTab />}
      {activeTab === 'nutritional-tags' && <NutritionalTagTab />}
      {activeTab === 'tags' && <TagTab />}
      {activeTab === 'rules' && <RuleTab />}
    </div>
  );
}
