import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMyIdeas, useMyGroups, useMyProfile } from '@/api/profile';
import { useMyInvitedEvents, useMyRegisteredEvents, usePersons } from '@/api/events';
import { usePlanners } from '@/api/planner';
import type { Person } from '@/schemas/event';
import type { MyIdea } from '@/schemas/profile';
import type { EventList } from '@/schemas/event';
import type { Planner } from '@/schemas/planner';
import type { UserGroup } from '@/schemas/profile';

const IDEA_TYPE_LABELS: Record<string, string> = {
  idea: 'Idee',
  knowledge: 'Wissen',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Veröffentlicht', color: 'bg-green-100 text-green-800' },
  archived: { label: 'Archiviert', color: 'bg-gray-100 text-gray-800' },
  review: { label: 'In Prüfung', color: 'bg-blue-100 text-blue-800' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function SectionHeader({
  icon,
  title,
  count,
  iconColor = 'text-primary',
  badgeBg = 'bg-primary/10',
  badgeText = 'text-primary',
}: {
  icon: string;
  title: string;
  count?: number;
  iconColor?: string;
  badgeBg?: string;
  badgeText?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`material-symbols-outlined ${iconColor} text-[22px]`}>{icon}</span>
      <h2 className="text-lg font-bold">{title}</h2>
      {count !== undefined && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeBg} ${badgeText}`}>
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
      <span className="material-symbols-outlined text-[32px] mb-1">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function EventCard({ event, badge }: { event: EventList; badge?: string }) {
  return (
    <Link
      to={`/events/app`}
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 text-violet-600 shrink-0">
        <span className="material-symbols-outlined text-[22px]">celebration</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{event.name}</p>
          {badge && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {event.start_date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {formatDate(event.start_date)}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {event.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function IdeaCard({ idea }: { idea: MyIdea }) {
  const status = STATUS_LABELS[idea.status] ?? { label: idea.status, color: 'bg-gray-100 text-gray-800' };
  return (
    <Link
      to={`/idea/${idea.slug}`}
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      {idea.image_url ? (
        <img src={idea.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-600 shrink-0">
          <span className="material-symbols-outlined text-[22px]">lightbulb</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{idea.title}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {IDEA_TYPE_LABELS[idea.idea_type] ?? idea.idea_type}
          </span>
        </div>
        {idea.summary && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{idea.summary}</p>
        )}
      </div>
    </Link>
  );
}

function PlannerCard({ planner }: { planner: Planner }) {
  return (
    <Link
      to="/session-planner/app"
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
        <span className="material-symbols-outlined text-[22px]">calendar_month</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{planner.title}</p>
        <p className="text-xs text-muted-foreground">
          Erstellt am {formatDate(planner.created_at)}
        </p>
      </div>
    </Link>
  );
}

function GroupCard({ group }: { group: UserGroup }) {
  return (
    <Link
      to={`/groups/${group.slug}`}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-600 shrink-0">
        <span className="material-symbols-outlined text-[22px]">groups</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {group.member_count} {group.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
        </p>
      </div>
    </Link>
  );
}

function PersonCardSmall({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold shrink-0 ${
        person.is_owner
          ? 'bg-gradient-to-br from-primary to-[hsl(174,60%,41%)]'
          : 'bg-muted-foreground/30 text-muted-foreground'
      }`}>
        {(person.first_name[0] ?? '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">
            {person.first_name} {person.last_name}
          </p>
          {person.is_owner && (
            <span className="text-xs bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full font-medium">Ich</span>
          )}
          {person.scout_name && (
            <span className="text-xs text-muted-foreground">„{person.scout_name}"</span>
          )}
        </div>
        {person.email && (
          <p className="text-xs text-muted-foreground mt-0.5">{person.email}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex items-start gap-3 p-3 rounded-lg border">
      <div className="w-10 h-10 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

export default function MyDashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile } = useMyProfile();
  const { data: invitedEvents, isLoading: invitedLoading } = useMyInvitedEvents();
  const { data: registeredEvents, isLoading: registeredLoading } = useMyRegisteredEvents();
  const { data: myIdeas, isLoading: ideasLoading } = useMyIdeas();
  const { data: planners, isLoading: plannersLoading } = usePlanners();
  const { data: groups, isLoading: groupsLoading } = useMyGroups();
  const { data: persons, isLoading: personsLoading } = usePersons();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  if (userLoading || !user) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const displayName = profile?.scout_name || profile?.first_name || user.first_name || user.email;

  return (
    <div className="container py-6 sm:py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white text-xl font-bold">
          {(displayName[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Mein Bereich</h1>
          <p className="text-sm text-muted-foreground">Hallo, {displayName}!</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link to="/profile/name" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors">
          <span className="material-symbols-outlined text-[16px]">badge</span>
          Profil bearbeiten
        </Link>
        <Link to="/profile/settings" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors">
          <span className="material-symbols-outlined text-[16px]">settings</span>
          Einstellungen
        </Link>
        <Link to="/profile/groups" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors">
          <span className="material-symbols-outlined text-[16px]">groups</span>
          Gruppen
        </Link>
        <Link to="/profile/persons" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors">
          <span className="material-symbols-outlined text-[16px]">people</span>
          Personen
        </Link>
        <Link to="/create" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-sky-100 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-200 transition-colors">
          <span className="material-symbols-outlined text-[16px]">add</span>
          Neue Idee
        </Link>
      </div>

      {/* Eingeladene Events */}
      <section>
        <SectionHeader icon="mail" title="Eingeladene Veranstaltungen" count={invitedEvents?.length} iconColor="text-violet-600" badgeBg="bg-violet-100" badgeText="text-violet-600" />
        <div className="space-y-2">
          {invitedLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!invitedLoading && (!invitedEvents || invitedEvents.length === 0) && (
            <EmptyState icon="inbox" text="Keine Einladungen vorhanden" />
          )}
          {invitedEvents?.map((event) => (
            <EventCard key={event.id} event={event} badge="Eingeladen" />
          ))}
        </div>
      </section>

      {/* Angemeldete Events */}
      <section>
        <SectionHeader icon="how_to_reg" title="Angemeldete Veranstaltungen" count={registeredEvents?.length} iconColor="text-violet-600" badgeBg="bg-violet-100" badgeText="text-violet-600" />
        <div className="space-y-2">
          {registeredLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!registeredLoading && (!registeredEvents || registeredEvents.length === 0) && (
            <EmptyState icon="event_busy" text="Noch keine Anmeldungen" />
          )}
          {registeredEvents?.map((event) => (
            <EventCard key={event.id} event={event} badge="Angemeldet" />
          ))}
        </div>
      </section>

      {/* Meine Ideen */}
      <section>
        <SectionHeader icon="lightbulb" title="Meine Ideen" count={myIdeas?.length} iconColor="text-sky-600" badgeBg="bg-sky-100" badgeText="text-sky-600" />
        <div className="space-y-2">
          {ideasLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!ideasLoading && (!myIdeas || myIdeas.length === 0) && (
            <EmptyState icon="draw" text="Du hast noch keine Ideen erstellt" />
          )}
          {myIdeas?.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      {/* Quartalsplaner */}
      <section>
        <SectionHeader icon="calendar_month" title="Meine Quartalsplaner" count={planners?.length} iconColor="text-emerald-600" badgeBg="bg-emerald-100" badgeText="text-emerald-600" />
        <div className="space-y-2">
          {plannersLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!plannersLoading && (!planners || planners.length === 0) && (
            <EmptyState icon="event_note" text="Noch keine Quartalsplaner erstellt" />
          )}
          {planners?.map((planner) => (
            <PlannerCard key={planner.id} planner={planner} />
          ))}
        </div>
      </section>

      {/* Meine Personen */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeader icon="people" title="Meine Personen" count={persons?.length} iconColor="text-amber-600" badgeBg="bg-amber-100" badgeText="text-amber-600" />
          <Link
            to="/profile/persons"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            Alle verwalten
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
        <div className="space-y-2">
          {personsLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!personsLoading && (!persons || persons.length === 0) && (
            <EmptyState icon="person_add" text="Noch keine Personen angelegt" />
          )}
          {persons?.slice(0, 5).map((person) => (
            <PersonCardSmall key={person.id} person={person} />
          ))}
          {persons && persons.length > 5 && (
            <Link
              to="/profile/persons"
              className="block text-center text-sm text-primary hover:underline py-2"
            >
              Alle {persons.length} Personen anzeigen
            </Link>
          )}
        </div>
      </section>

      {/* Meine Gruppen */}
      <section>
        <SectionHeader icon="groups" title="Meine Gruppen" count={groups?.length} iconColor="text-sky-600" badgeBg="bg-sky-100" badgeText="text-sky-600" />
        <div className="space-y-2">
          {groupsLoading && <><SkeletonCard /><SkeletonCard /></>}
          {!groupsLoading && (!groups || groups.length === 0) && (
            <EmptyState icon="group_off" text="Du bist noch keiner Gruppe beigetreten" />
          )}
          {groups?.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}
