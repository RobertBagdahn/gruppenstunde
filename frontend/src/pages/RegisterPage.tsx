import { Navigate, useSearchParams } from 'react-router-dom';

/** Accounts are created automatically on the first social login. */
export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  return <Navigate to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
}
