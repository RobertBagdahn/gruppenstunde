import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer data-print-hide className="mt-12 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 text-foreground">
          <BrandMark />
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} essensplan.app
          </p>
        </div>
        <nav aria-label="Rechtliches" className="flex items-center gap-5">
          <Link to="/privacy" className="text-body font-medium text-muted-foreground transition-colors hover:text-foreground">
            Datenschutz
          </Link>
          <Link to="/imprint" className="text-body font-medium text-muted-foreground transition-colors hover:text-foreground">
            Impressum
          </Link>
        </nav>
      </div>
    </footer>
  );
}
