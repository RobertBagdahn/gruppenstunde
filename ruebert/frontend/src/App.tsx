import { Route, Routes } from 'react-router-dom';

import { NAVIGATION } from '@/components/layout/navigation';
import { CasesPage } from '@/pages/CasesPage';
import { EventsPage } from '@/pages/EventsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderPlanPage } from '@/pages/OrderPlanPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { QualityPage } from '@/pages/QualityPage';
import { RunsPage } from '@/pages/RunsPage';
import { SetsPage } from '@/pages/SetsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StartPage } from '@/pages/StartPage';
import { StockoutsPage } from '@/pages/StockoutsPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { WikiPage } from '@/pages/WikiPage';
import { SupplierOrdersPage } from '@/pages/SupplierOrdersPage';

/** Pages built so far. Navigation entries without a page still get a placeholder, so no link leads nowhere. */
const PAGES: Record<string, JSX.Element> = {
  '/': <StartPage />,
  '/products': <ProductsPage />,
  '/order-plans': <OrderPlanPage />,
  '/supplier-orders': <SupplierOrdersPage />,
  '/forecast-quality': <QualityPage />,
  '/sets': <SetsPage />,
  '/data/cases': <CasesPage />,
  '/data/stockouts': <StockoutsPage />,
  '/data/quality': <RunsPage />,
  '/data/events': <EventsPage />,
  '/settings': <SettingsPage />,
  '/wiki': <WikiPage />,
};

export function App() {
  return (
    <Routes>
      {NAVIGATION.flatMap((group) =>
        group.items.map((item) => (
          <Route
            key={item.id}
            path={item.to}
            element={PAGES[item.to] ?? <PlaceholderPage area={group.label} page={item.label} />}
          />
        )),
      )}
      <Route path="/products/:sku" element={<ProductDetailPage />} />
      <Route path="/supplier-orders/:supplierId" element={<SupplierOrdersPage />} />
      <Route path="/sets/:setSku" element={<SetsPage />} />
      <Route path="/wiki/*" element={<WikiPage />} />
      <Route path="/styleguide" element={<StyleguidePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
