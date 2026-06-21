import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useMyContent, useMyGroups, useMyProfile } from '@/api/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMyInvitedEvents, useMyRegisteredEvents, usePersons } from '@/api/events';
import { usePlanners } from '@/api/planner';
import type { Person } from '@/schemas/event';
import type { MyContent } from '@/schemas/profile';
import type { EventList } from '@/schemas/event';

import { getContentUrl } from '@/schemas/content';
import { cn } from '@/lib/utils';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  session: 'Gruppenstunde',
  blog: 'Wissensbeitrag',
  game: 'Spiel',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Veroeffentlicht', color: 'bg-green-100 text-green-800' },
  archived: { label: 'Archiviert', color: 'bg-gray-100 text-gray-800' },
  review: { label: 'In Pruefung', color: 'bg-blue-100 text-blue-800' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
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
  action,
}: {
  icon: string;
  title: string;
  count?: number;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-muted-foreground text-[18px]">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
      </div>
      {action && (
        <Link to={action.to} className="text-xs text-primary hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-2 pl-1">{text}</p>;
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-2 py-2">
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-3 bg-muted rounded w-1/5 ml-auto" />
    </div>
  );
}

export default function MyDashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile } = useMyProfile();
  const { data: invitedEvents, isLoading: invitedLoading } = useMyInvitedEvents();
  const { data: registeredEvents, isLoading: registeredLoading } = useMyRegisteredEvents();
  const { data: myContent, isLoading: contentLoading } = useMyContent();
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const displayName =
    profile?.scout_name || profile?.first_name || user.first_name || user.email;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-primary/20 ring-offset-2">
          <AvatarImage src={profile?.profile_picture_url ?? undefined} alt={displayName} />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white">
            {(displayName[0] ?? '?').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-bold">Mein Bereich</h1>
          <p className="text-xs text-muted-foreground">Hallo, {displayName}!</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/profile"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">badge</span>
          Profil
        </Link>
        <Link
          to="/profile/groups"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">groups</span>
          Gruppen
        </Link>
        <Link
          to="/profile/persons"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">people</span>
          Personen
        </Link>
        <Link
          to="/create"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-100 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Erstellen
        </Link>
      </div>

      {/* Aktionen (Events) */}
      <section className="rounded-xl border p-4">
        <SectionHeader
          icon="celebration"
          title="Meine Aktionen"
          count={(invitedEvents?.length ?? 0) + (registeredEvents?.length ?? 0)}
          action={{ label: 'Alle Aktionen', to: '/events/app' }}
        />
        <div className="divide-y">
          {invitedLoading && <SkeletonRow />}
          {registeredLoading && <SkeletonRow />}
          {invitedEvents?.map((ev) => (
            <EventRow key={`inv-${ev.id}`} event={ev} badge="Eingeladen" />
          ))}
          {registeredEvents?.map((ev) => (
            <EventRow key={`reg-${ev.id}`} event={ev} badge="Angemeldet" />
          ))}
          {!invitedLoading &&
            !registeredLoading &&
            (invitedEvents?.length ?? 0) + (registeredEvents?.length ?? 0) === 0 && (
              <EmptyRow text="Keine Aktionen vorhanden" />
            )}
        </div>
      </section>

      {/* Meine Beiträge */}
      <section className="rounded-xl border p-4">
        <SectionHeader
          icon="lightbulb"
          title="Meine Beiträge"
          count={myContent?.length}
          action={{ label: 'Neuer Beitrag', to: '/create' }}
        />
        <div className="divide-y">
          {contentLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {!contentLoading && (!myContent || myContent.length === 0) && (
            <EmptyRow text="Noch keine Beiträge erstellt" />
          )}
          {myContent?.map((item) => (
            <ContentRow key={item.id} content={item} />
          ))}
        </div>
      </section>

      {/* Quartalsplaner */}
      <section className="rounded-xl border p-4">
        <SectionHeader
          icon="calendar_month"
          title="Quartalsplaner"
          count={planners?.length}
          action={{ label: 'Zum Planer', to: '/session-planner/app' }}
        />
        <div className="divide-y">
          {plannersLoading && <SkeletonRow />}
          {!plannersLoading && (!planners || planners.length === 0) && (
            <EmptyRow text="Noch kein Quartalsplan erstellt" />
          )}
          {planners?.map((p) => (
            <Link
              key={p.id}
              to="/session-planner/app"
              className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors"
            >
              <span className="truncate">{p.title}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {formatDate(p.created_at)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Personen */}
      <section className="rounded-xl border p-4">
        <SectionHeader
          icon="people"
          title="Personen"
          count={persons?.length}
          action={{ label: 'Verwalten', to: '/profile/persons' }}
        />
        <div className="divide-y">
          {personsLoading && <SkeletonRow />}
          {!personsLoading && (!persons || persons.length === 0) && (
            <EmptyRow text="Keine Personen angelegt" />
          )}
          {persons?.slice(0, 5).map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
          {persons && persons.length > 5 && (
            <Link
              to="/profile/persons"
              className="block text-xs text-primary hover:underline py-2 text-center"
            >
              Alle {persons.length} Personen anzeigen
            </Link>
          )}
        </div>
      </section>

      {/* Gruppen */}
      <section className="rounded-xl border p-4">
        <SectionHeader
          icon="groups"
          title="Gruppen"
          count={groups?.length}
          action={{ label: 'Alle Gruppen', to: '/profile/groups' }}
        />
        <div className="divide-y">
          {groupsLoading && <SkeletonRow />}
          {!groupsLoading && (!groups || groups.length === 0) && (
            <EmptyRow text="Keiner Gruppe beigetreten" />
          )}
          {groups?.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.slug}`}
              className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors"
            >
              <span className="truncate">{g.name}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {g.member_count} {g.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List rows
// ---------------------------------------------------------------------------

function EventRow({ event, badge }: { event: EventList; badge: string }) {
  return (
    <Link
      to="/events/app"
      className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors gap-2"
    >
      <span className="truncate font-medium">{event.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        {event.start_date && (
          <span className="text-xs text-muted-foreground">{formatDate(event.start_date)}</span>
        )}
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            badge === 'Eingeladen'
              ? 'bg-violet-100 text-violet-600'
              : 'bg-green-100 text-green-700',
          )}
        >
          {badge}
        </span>
      </div>
    </Link>
  );
}

function ContentRow({ content }: { content: MyContent }) {
  const status = STATUS_LABELS[content.status] ?? {
    label: content.status,
    color: 'bg-gray-100 text-gray-800',
  };
  return (
    <Link
      to={getContentUrl(content.content_type, content.slug)}
      className="flex items-center justify-between py-2 text-sm hover:text-primary transition-colors gap-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate font-medium">{content.title}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {CONTENT_TYPE_LABELS[content.content_type] ?? content.content_type}
        </span>
      </div>
      <span
        className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', status.color)}
      >
        {status.label}
      </span>
    </Link>
  );
}

function PersonRow({ person }: { person: Person }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0',
            person.is_owner
              ? 'bg-gradient-to-br from-primary to-[hsl(174,60%,41%)]'
              : 'bg-muted-foreground/30 text-muted-foreground',
          )}
        >
          {(person.first_name[0] ?? '?').toUpperCase()}
        </div>
        <span className="truncate">
          {person.first_name} {person.last_name}
        </span>
        {person.scout_name && (
          <span className="text-xs text-muted-foreground shrink-0">
            "{person.scout_name}"
          </span>
        )}
        {person.is_owner && (
          <span className="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
            Ich
          </span>
        )}
      </div>
      {person.email && (
        <span className="text-xs text-muted-foreground truncate max-w-[140px] shrink-0">
          {person.email}
        </span>
      )}
    </div>
  );
}
