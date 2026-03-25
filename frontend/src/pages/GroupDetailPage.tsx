import { useParams, Link } from 'react-router-dom';
import { useGroupDetail } from '@/api/profile';

export default function GroupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: group, isLoading, error } = useGroupDetail(slug || '');

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="bg-card rounded-xl border p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-muted-foreground/40 mb-3 block">
            error
          </span>
          <p className="text-muted-foreground">Gruppe nicht gefunden.</p>
          <Link
            to="/profile/groups"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium hover:shadow-glow transition-all"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const ancestors = [...(group.ancestors || [])].reverse();

  return (
    <div className="container py-8 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 flex-wrap">
        <Link to="/profile/groups" className="hover:text-primary transition-colors">
          Gruppen
        </Link>
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link
              to={`/groups/${ancestor.slug}`}
              className="hover:text-primary transition-colors"
            >
              {ancestor.name}
            </Link>
          </span>
        ))}
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-foreground font-medium">{group.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[28px]">groups</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{group.member_count}</p>
          <p className="text-xs text-muted-foreground mt-1">Direkte Mitglieder</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{group.inherited_member_count}</p>
          <p className="text-xs text-muted-foreground mt-1">Gesamt (inkl. vererbt)</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{group.children?.length || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Untergruppen</p>
        </div>
      </div>

      {/* Parent group */}
      {group.parent && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Übergruppe
          </h2>
          <Link
            to={`/groups/${group.parent.slug}`}
            className="flex items-center gap-3 bg-card rounded-xl border p-4 hover:border-primary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">arrow_upward</span>
            <span className="font-semibold">{group.parent.name}</span>
          </Link>
        </div>
      )}

      {/* Children */}
      {group.children && group.children.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Untergruppen
          </h2>
          <div className="space-y-2">
            {group.children.map((child) => (
              <Link
                key={child.id}
                to={`/groups/${child.slug}`}
                className="flex items-center justify-between bg-card rounded-xl border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    subdirectory_arrow_right
                  </span>
                  <div>
                    <span className="font-semibold">{child.name}</span>
                    {child.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {child.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  {child.member_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Mitglieder ({group.member_count})
        </h2>
        {group.members.length > 0 ? (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-card rounded-xl border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user_first_name} {member.user_last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.user_email}</p>
                  </div>
                </div>
                {member.role === 'admin' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-6 text-center text-muted-foreground">
            Noch keine Mitglieder.
          </div>
        )}
      </div>

      {/* Info about inheritance */}
      {group.parent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
            <p>
              Mitgliedschaften werden von übergeordneten Gruppen vererbt. Alle Mitglieder der
              Übergruppe{ancestors.length > 1 ? 'n' : ''}{' '}
              {ancestors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ', '}
                  <Link to={`/groups/${a.slug}`} className="font-medium underline">
                    {a.name}
                  </Link>
                </span>
              ))}{' '}
              sind automatisch auch Mitglieder dieser Gruppe.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
