import { useNavigate } from 'react-router-dom';
import ErrorDisplay from '@/components/ErrorDisplay';
import { ApiError } from '@/lib/api';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="container py-8">
      <ErrorDisplay
        error={new ApiError(404, 'Not Found')}
        title="Seite nicht gefunden"
        description="Diese Seite existiert nicht oder wurde verschoben."
        onBack={() => navigate('/')}
        backLabel="Zur Startseite"
      />
    </div>
  );
}
