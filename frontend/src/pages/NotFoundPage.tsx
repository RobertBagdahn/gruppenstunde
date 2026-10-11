import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/** Catch-all page for unknown routes. */
export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Seite nicht gefunden – Inspi';
    return () => {
      document.title = 'Inspi – Gruppenstunden-Inspirator';
    };
  }, []);

  return (
    <div className="container flex flex-col items-center justify-center py-16 text-center">
      <img
        src="/images/inspi_confused.png"
        alt="Verwirrtes Inspi-Maskottchen"
        className="w-32 h-32 md:w-40 md:h-40 object-contain mb-6 drop-shadow-md"
        width={160}
        height={160}
      />
      <p className="text-sm font-bold text-primary">Fehler 404</p>
      <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Seite nicht gefunden</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Diese Seite gibt es nicht oder sie wurde verschoben. Prüfe die Adresse oder starte von der Startseite aus neu.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">home</span>
          Zur Startseite
        </Link>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">search</span>
          Inhalte suchen
        </Link>
      </div>
    </div>
  );
}
