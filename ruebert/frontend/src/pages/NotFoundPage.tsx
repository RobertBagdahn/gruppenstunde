import { Link } from 'react-router-dom';

import { Page } from '@/components/layout/Page';

export function NotFoundPage() {
  return (
    <Page area="Rübert" page="Seite nicht gefunden">
      <div className="flex flex-col gap-2 p-6">
        <h1 className="m-0 text-section font-semibold text-foreground-strong">Seite nicht gefunden</h1>
        <p className="m-0 text-body text-foreground-2">
          Diese Adresse gibt es nicht.{' '}
          <Link to="/" className="text-link">
            Zu den Entscheidungen
          </Link>
        </p>
      </div>
    </Page>
  );
}
