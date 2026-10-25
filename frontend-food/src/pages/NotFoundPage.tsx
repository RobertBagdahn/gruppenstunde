import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Not-found page: hero surface with the mascot and one petrol button back to the start page. */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <section className="flex flex-col items-center gap-4 rounded-xl bg-primary-soft p-6 text-center shadow-card md:p-10">
        <img
          src="/images/inspi_confused.png"
          alt=""
          width={160}
          height={160}
          className="h-32 w-32 object-contain md:h-40 md:w-40"
        />
        <h1 className="font-display text-title font-extrabold text-foreground">Seite nicht gefunden</h1>
        <p className="max-w-md text-emphasis text-muted-foreground">
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <Button size="lg" className="mt-2" onClick={() => navigate('/')}>
          Zur Startseite
        </Button>
      </section>
    </div>
  );
}
