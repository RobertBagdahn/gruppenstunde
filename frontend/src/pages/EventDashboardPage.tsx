/**
 * EventDashboardPage — Unified event detail page with role-based tabs.
 * Route: /events/app/:slug
 *
 * Member tabs: Übersicht | Anmeldung | Teilnehmende | Einladung | Packliste
 * Admin tabs (additional): Verwaltung | Eingeladene | Zahlungen | Timeline | E-Mails | Exporte | Einstellungen
 */
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/api/events';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PhaseBadge } from '@/components/events/PhaseBadge';
import PhaseTimeline from '@/components/events/PhaseTimeline';
import OverviewTab from '@/components/events/dashboard/OverviewTab';
import RegistrationTab from '@/components/events/dashboard/RegistrationTab';
import MemberParticipantsTab from '@/components/events/dashboard/MemberParticipantsTab';
import InvitationTextTab from '@/components/events/dashboard/InvitationTextTab';
import PackingListTab from '@/components/events/dashboard/PackingListTab';
import ParticipantsTab from '@/components/events/dashboard/ParticipantsTab';
import InvitationsTab from '@/components/events/dashboard/InvitationsTab';
import PaymentsTab from '@/components/events/dashboard/PaymentsTab';
import TimelineTab from '@/components/events/dashboard/TimelineTab';
import SettingsTab from '@/components/events/dashboard/SettingsTab';
import ExportTab from '@/components/events/dashboard/ExportTab';
import MailTab from '@/components/events/dashboard/MailTab';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Tab Configuration
// ---------------------------------------------------------------------------

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  scope: 'member' | 'manager';
}

const ALL_TABS: TabConfig[] = [
  // Member tabs
  { key: 'overview', label: 'Übersicht', icon: 'dashboard', scope: 'member' },
  { key: 'registration', label: 'Anmeldung', icon: 'app_registration', scope: 'member' },
  { key: 'participants', label: 'Teilnehmende', icon: 'group', scope: 'member' },
  { key: 'invitation', label: 'Einladung', icon: 'mail', scope: 'member' },
  { key: 'packing-list', label: 'Packliste', icon: 'checklist', scope: 'member' },
  // Admin tabs
  { key: 'manage-participants', label: 'Verwaltung', icon: 'manage_accounts', scope: 'manager' },
  { key: 'invitations', label: 'Eingeladene', icon: 'person_add', scope: 'manager' },
  { key: 'payments', label: 'Zahlungen', icon: 'payments', scope: 'manager' },
  { key: 'timeline', label: 'Timeline', icon: 'timeline', scope: 'manager' },
  { key: 'emails', label: 'E-Mails', icon: 'send', scope: 'manager' },
  { key: 'exports', label: 'Exporte', icon: 'download', scope: 'manager' },
  { key: 'settings', label: 'Einstellungen', icon: 'settings', scope: 'manager' },
];

export default function EventDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: event, isLoading, error, refetch } = useEvent(slug || '');

  const activeTab = searchParams.get('tab') || 'overview';

  const setTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  if (!slug) return null;
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-64 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  if (!event) return null;

  const isManager = event.is_manager;

  // Filter tabs: members see member tabs only, managers see all
  const visibleTabs = ALL_TABS.filter(
    (t) => t.scope === 'member' || (t.scope === 'manager' && isManager),
  );

  // Find separator index (first manager tab)
  const firstManagerIdx = visibleTabs.findIndex((t) => t.scope === 'manager');

  // Ensure active tab is valid
  const validTab = visibleTabs.find((t) => t.key === activeTab) ? activeTab : 'overview';

  // Format dates for header
  const startDate = event.start_date
    ? new Date(event.start_date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;
  const endDate = event.end_date
    ? new Date(event.end_date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/events/app')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Zurück zur Übersicht
        </button>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shrink-0">
            <span className="material-symbols-outlined text-[22px]">celebration</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{event.name}</h1>
              <PhaseBadge phase={event.phase} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
              {startDate && endDate && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {startDate} – {endDate}
                </span>
              )}
              {(event.event_location?.name || event.location) && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {event.event_location?.name || event.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">group</span>
                {event.participant_count} Teilnehmer
              </span>
            </div>
          </div>
        </div>

        {/* Phase Timeline */}
        <div className="mt-4 rounded-xl border p-4 bg-card">
          <PhaseTimeline
            currentPhase={event.phase}
            registrationStart={event.registration_start}
            registrationDeadline={event.registration_deadline}
            startDate={event.start_date}
            endDate={event.end_date}
            createdAt={event.created_at}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6 overflow-x-auto scrollbar-none">
        <nav className="flex gap-0 min-w-max" role="tablist">
          {visibleTabs.map((tab, idx) => (
            <div key={tab.key} className="flex items-center">
              {/* Visual separator before admin tabs */}
              {idx === firstManagerIdx && firstManagerIdx > 0 && (
                <div className="w-px h-6 bg-border mx-1.5 shrink-0" />
              )}
              <button
                role="tab"
                aria-selected={validTab === tab.key}
                onClick={() => setTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  validTab === tab.key
                    ? 'border-violet-500 text-violet-700'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {validTab === 'overview' && <OverviewTab event={event} isManager={isManager} />}
        {validTab === 'registration' && <RegistrationTab event={event} />}
        {validTab === 'participants' && <MemberParticipantsTab event={event} isManager={isManager} />}
        {validTab === 'invitation' && <InvitationTextTab event={event} isManager={isManager} />}
        {validTab === 'packing-list' && <PackingListTab event={event} isManager={isManager} />}
        {validTab === 'manage-participants' && isManager && <ParticipantsTab event={event} />}
        {validTab === 'invitations' && isManager && <InvitationsTab event={event} />}
        {validTab === 'payments' && isManager && <PaymentsTab event={event} />}
        {validTab === 'timeline' && isManager && <TimelineTab event={event} />}
        {validTab === 'emails' && isManager && <MailTab event={event} />}
        {validTab === 'exports' && isManager && <ExportTab event={event} />}
        {validTab === 'settings' && isManager && <SettingsTab event={event} />}
      </div>
    </div>
  );
}
