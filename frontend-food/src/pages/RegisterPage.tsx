import { Navigate, useSearchParams } from 'react-router-dom';

/** Registration lives on the login page (social login or, during the transition, e-mail). */
export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const params = new URLSearchParams({ mode: 'register' });
  if (next) params.set('next', next);
  return <Navigate to={`/login?${params}`} replace />;
}
