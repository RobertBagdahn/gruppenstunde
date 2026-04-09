import { useParams, Navigate } from 'react-router-dom';

/**
 * EventDetailPage — redirects /events/:slug to /events/app/:slug.
 * The unified dashboard page is the single event detail destination.
 */
export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return <Navigate to={`/events/app/${slug}`} replace />;
}
