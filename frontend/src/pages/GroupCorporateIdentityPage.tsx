/**
 * GroupCorporateIdentityPage — Settings page for a group's corporate identity.
 * Route: /groups/:slug/settings/corporate-identity
 * Only accessible to group admins.
 */
import { useParams, Link } from 'react-router-dom';
import { useGroupDetail } from '@/api/profile';
import { useCurrentUser } from '@/api/auth';
import CorporateIdentityForm from '@/components/groups/CorporateIdentityForm';

export default function GroupCorporateIdentityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: group, isLoading: groupLoading, error: groupError } = useGroupDetail(slug || '');
  const { data: user } = useCurrentUser();

  if (groupLoading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (groupError || !group) {
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

  // Check if current user is a group admin
  const isAdmin =
    user &&
    group.members.some(
      (m) => m.user_id === user.id && m.role === 'admin',
    );

  if (!isAdmin) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="bg-card rounded-xl border p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-muted-foreground/40 mb-3 block">
            lock
          </span>
          <p className="text-muted-foreground">
            Nur Gruppen-Admins können die Corporate Identity verwalten.
          </p>
          <Link
            to={`/groups/${slug}`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium hover:shadow-glow transition-all"
          >
            Zurück zur Gruppe
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
        <Link to={`/groups/${slug}`} className="hover:text-primary transition-colors">
          {group.name}
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-foreground font-medium">Corporate Identity</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[28px]">palette</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Corporate Identity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Farben, Logo und Textbausteine für {group.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl border p-6">
        <CorporateIdentityForm slug={slug || ''} />
      </div>
    </div>
  );
}
