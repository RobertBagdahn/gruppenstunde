/**
 * EventDashboardPage — Unified event detail page with consolidated 7 tabs.
 * Route: /events/app/:slug
 *
 * Tabs: Übersicht | Teilnehmende | Einladung & Gäste | Packliste | Zahlungen | Aktivität | Einstellungen
 *
 * Tab consolidation (12 → 7):
 * - Übersicht = Overview + Registration
 * - Teilnehmende = MemberParticipants + Participants (role toggle)
 * - Einladung & Gäste = InvitationText + Invitations
 * - Packliste = unchanged
 * - Zahlungen = unchanged (with filters)
 * - Aktivität = Timeline + Nachrichten + Exports
 * - Einstellungen = unchanged
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { useEvent } from '@/api/events';
import ErrorDisplay from '@/components/ErrorDisplay';
import Breadcrumb from '@/components/Breadcrumb';
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
import MessagingTab from '@/components/events/dashboard/MessagingTab';
import BudgetDetailView from '@/components/events/dashboard/BudgetDetailView';
import ParentAccessView from '@/components/events/dashboard/ParentAccessView';
import ProgramEditor from '@/components/events/dashboard/ProgramEditor';
import { getEventIcon } from '@/components/events/wizard/IconPicker';
import { getColorBgClass } from '@/components/events/wizard/ColorPicker';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Tab Configuration (consolidated 7 tabs)
// ---------------------------------------------------------------------------

interface TabConfig {
  key: string;
  label: string;
  icon: string;
  managerOnly: boolean;
}

const TABS: TabConfig[] = [
  { key: 'overview', label: 'Übersicht', icon: 'dashboard', managerOnly: false },
  { key: 'participants', label: 'Teilnehmende', icon: 'group', managerOnly: false },
  { key: 'invitation', label: 'Einladung & Gäste', icon: 'mail', managerOnly: false },
  { key: 'packing-list', label: 'Packliste', icon: 'checklist', managerOnly: false },
  { key: 'payments', label: 'Zahlungen', icon: 'payments', managerOnly: true },
  { key: 'activity', label: 'Aktivität', icon: 'timeline', managerOnly: true },
  { key: 'settings', label: 'Einstellungen', icon: 'settings', managerOnly: true },
];

// Map old tab keys to new ones for backwards compatibility
const TAB_REDIRECTS: Record<string, string> = {
  registration: 'overview',
  'manage-participants': 'participants',
  invitations: 'invitation',
  timeline: 'activity',
  emails: 'activity',
  messages: 'activity',
  exports: 'activity',
};

// ---------------------------------------------------------------------------
// Combined Tab Components
// ---------------------------------------------------------------------------

/** Combined Overview: Overview + Registration inline */
function CombinedOverviewTab({ event, isManager }: { event: EventDetailType; isManager: boolean }) {
  return (
    <div className="space-y-8">
      <OverviewTab event={event} isManager={isManager} />
      <div className="border-t pt-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">app_registration</span>
          Anmeldung
        </h3>
        <RegistrationTab event={event} />
      </div>
    </div>
  );
}

/** Combined Participants: MemberView + AdminView with toggle */
function CombinedParticipantsTab({ event, isManager }: { event: EventDetailType; isManager: boolean }) {
  const [showAdmin, setShowAdmin] = useState(false);

  if (!isManager) {
    return <MemberParticipantsTab event={event} isManager={false} />;
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2 border rounded-lg p-1 w-fit bg-muted/30">
        <button
          type="button"
          onClick={() => setShowAdmin(false)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            !showAdmin
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Teilnehmeransicht
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowAdmin(true)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            showAdmin
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            Verwaltung
          </span>
        </button>
      </div>

      {showAdmin ? (
        <ParticipantsTab event={event} />
      ) : (
        <MemberParticipantsTab event={event} isManager={isManager} />
      )}
    </div>
  );
}

/** Combined Invitation & Guests: InvitationText + Invitations + ParentAccess */
function CombinedInvitationTab({ event, isManager }: { event: EventDetailType; isManager: boolean }) {
  return (
    <div className="space-y-8">
      <InvitationTextTab event={event} isManager={isManager} />
      {isManager && (
        <div className="border-t pt-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Eingeladene Personen
          </h3>
          <InvitationsTab event={event} />
        </div>
      )}
      {isManager && (
        <div className="border-t pt-6">
          <ParentAccessView event={event} />
        </div>
      )}
    </div>
  );
}

/** Combined Activity: Timeline + Messaging + Exports + Budget + Programm */
function CombinedActivityTab({ event }: { event: EventDetailType }) {
  const [section, setSection] = useState<'timeline' | 'messages' | 'exports' | 'budget' | 'program'>('timeline');

  return (
    <div className="space-y-4">
      {/* Section selector */}
      <div className="flex items-center gap-1 border rounded-lg p-1 w-fit bg-muted/30 overflow-x-auto">
        {(
          [
            { key: 'timeline', label: 'Timeline', icon: 'timeline' },
            { key: 'program', label: 'Programm', icon: 'view_timeline' },
            { key: 'messages', label: 'Nachrichten', icon: 'send' },
            { key: 'exports', label: 'Exporte', icon: 'download' },
            { key: 'budget', label: 'Budget', icon: 'account_balance' },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              section === s.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {section === 'timeline' && <TimelineTab event={event} />}
      {section === 'program' && <ProgramEditor event={event} />}
      {section === 'messages' && <MessagingTab event={event} />}
      {section === 'exports' && <ExportTab event={event} />}
      {section === 'budget' && <BudgetDetailView slug={event.slug} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper type for event detail
// ---------------------------------------------------------------------------

type EventDetailType = NonNullable<ReturnType<typeof useEvent>['data']>;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EventDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: event, isLoading, error, refetch } = useEvent(slug || '');

  // Handle tab from URL, with redirect for old tab keys
  let activeTab = searchParams.get('tab') || 'overview';
  if (TAB_REDIRECTS[activeTab]) {
    activeTab = TAB_REDIRECTS[activeTab];
  }

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

  // Filter tabs based on role
  const visibleTabs = TABS.filter((t) => !t.managerOnly || isManager);

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

  // Event icon and color
  const EventIcon = getEventIcon(event.icon || 'tent');

  return (
    <EntityLinkContext.Provider value="detail">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Startseite', href: '/' },
            { label: 'Aktionen', href: '/events/app' },
            { label: event.name },
          ]}
        />

        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0',
              getColorBgClass(event.color || 'blue'),
            )}
          >
            <EventIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{event.name}</h1>
              <PhaseBadge phase={event.phase} />
              {event.is_template && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Vorlage
                </span>
              )}
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

      {/* Tab Navigation — scrollable on mobile */}
      <div className="border-b mb-6 overflow-x-auto scrollbar-none">
        <nav className="flex gap-0 min-w-max" role="tablist">
          {visibleTabs.map((tab, idx) => {
            // Separator between member and manager tabs
            const showSeparator =
              tab.managerOnly &&
              idx > 0 &&
              !visibleTabs[idx - 1].managerOnly;

            return (
              <div key={tab.key} className="flex items-center">
                {showSeparator && (
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
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {validTab === 'overview' && (
          <CombinedOverviewTab event={event} isManager={isManager} />
        )}
        {validTab === 'participants' && (
          <CombinedParticipantsTab event={event} isManager={isManager} />
        )}
        {validTab === 'invitation' && (
          <CombinedInvitationTab event={event} isManager={isManager} />
        )}
        {validTab === 'packing-list' && (
          <PackingListTab event={event} isManager={isManager} />
        )}
        {validTab === 'payments' && isManager && <PaymentsTab event={event} />}
        {validTab === 'activity' && isManager && <CombinedActivityTab event={event} />}
        {validTab === 'settings' && isManager && <SettingsTab event={event} />}
      </div>
    </div>
    </EntityLinkContext.Provider>
  );
}
