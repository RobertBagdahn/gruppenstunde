import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-white/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-12 md:h-14 px-4">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Gruppenstunde.de
        </p>
        <nav className="flex items-center gap-4">
          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Datenschutz
          </Link>
          <Link
            to="/imprint"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Impressum
          </Link>
        </nav>
      </div>
    </footer>
  );
}
