import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RouteBoundary } from '@/components/shared/SectionBoundary';
import { PageSkeleton } from '@/components/ui/skeleton';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import Footer from './Footer';
import PreviewBanner from './PreviewBanner';
import { pageUsesActionBar } from './nav-items';

/**
 * One key per page (section + entity), so a route change replays the page-in
 * animation while query-string changes (filters, tabs) keep the page mounted.
 */
function pageKey(pathname: string): string {
  return pathname.split('/').slice(0, 3).join('/');
}

export default function FoodLayout() {
  const location = useLocation();
  const currentPage = pageKey(location.pathname);
  const actionBar = pageUsesActionBar(location.pathname);

  // A new page starts at the top; filter or tab changes keep the position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PreviewBanner />
      <AppHeader />

      {/* Bottom padding keeps content clear of the bottom bar on phones. */}
      <main className={actionBar ? 'flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0' : 'flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'}>
        <RouteBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <div key={currentPage} className="animate-page-in">
              <Outlet />
            </div>
          </Suspense>
        </RouteBoundary>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>

      {!actionBar && <BottomNav />}
    </div>
  );
}
