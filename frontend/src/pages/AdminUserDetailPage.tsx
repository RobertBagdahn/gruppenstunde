import { useParams, Link } from 'react-router-dom';
import { useAdminUserDetail } from '@/api/admin';
import { BackButton } from '@/components/shared/BackButton';

/** Map content_type to content URL prefix */
function contentUrlForSlug(slug: string, contentType?: string): string {
  const prefixMap: Record<string, string> = {
    session: '/sessions',
    blog: '/blogs',
    game: '/games',
  };
  const prefix = prefixMap[contentType ?? ''] ?? '/sessions';
  return `${prefix}/${slug}`;
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading, error } = useAdminUserDetail(Number(userId) || 0);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <BackButton to="/admin/users" />
        </div>
        <p className="text-destructive">Benutzer nicht gefunden.</p>
      </div>
    );
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-4">
        <BackButton to="/admin/users" />
        <h1 className="text-2xl font-bold border-l pl-3">{displayName}</h1>
      </div>
      <p className="text-muted-foreground mb-6">{user.email}</p>

      {/* User Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          {user.is_active ? (
            <span className="inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800 px-2 py-0.5">Aktiv</span>
          ) : (
            <span className="inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800 px-2 py-0.5">Inaktiv</span>
          )}
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Rolle</div>
          {user.is_staff ? (
            <span className="inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 px-2 py-0.5">Admin</span>
          ) : (
            <span className="text-sm">Benutzer</span>
          )}
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Beitrittsdatum</div>
          <span className="text-sm">{new Date(user.date_joined).toLocaleDateString('de-DE')}</span>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Letzter Login</div>
          <span className="text-sm">
            {user.last_login
              ? new Date(user.last_login).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '–'}
          </span>
        </div>
      </div>

      {/* Content */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Beiträge <span className="text-sm text-muted-foreground font-normal">({user.content.length})</span>
        </h2>
        {user.content.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Titel</th>
                  <th className="text-left px-3 py-2 font-medium">Typ</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {user.content.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link to={contentUrlForSlug(item.slug, item.content_type)} className="hover:text-primary font-medium">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.content_type === 'session' ? 'Gruppenstunde' : item.content_type === 'blog' ? 'Wissen' : item.content_type === 'game' ? 'Spiel' : 'Rezept'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'published' ? 'bg-green-100 text-green-700' :
                        item.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        item.status === 'review' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status === 'published' ? 'Veröffentlicht' :
                         item.status === 'draft' ? 'Entwurf' :
                         item.status === 'review' ? 'Review' : 'Archiviert'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Beiträge vorhanden.</p>
        )}
      </section>

      {/* Comments */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Kommentare <span className="text-sm text-muted-foreground font-normal">({user.comments.length})</span>
        </h2>
        {user.comments.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Kommentar</th>
                    <th className="text-left px-3 py-2 font-medium">Beitrag</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {user.comments.map((comment) => (
                  <tr key={comment.id} className="border-t">
                    <td className="px-3 py-2 max-w-xs truncate">{comment.text}</td>
                    <td className="px-3 py-2">
                      {comment.content_slug ? (
                        <Link to={contentUrlForSlug(comment.content_slug)} className="hover:text-primary">
                          {comment.content_title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Gelöscht</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        comment.status === 'approved' ? 'bg-green-100 text-green-700' :
                        comment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {comment.status === 'approved' ? 'Freigegeben' :
                         comment.status === 'pending' ? 'Ausstehend' : 'Abgelehnt'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Kommentare vorhanden.</p>
        )}
      </section>
    </div>
  );
}
