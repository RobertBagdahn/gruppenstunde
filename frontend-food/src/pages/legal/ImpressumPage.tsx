import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const emailLocal = 'robertbagdahn';
const emailDomain = 'gmail.com';
const emailHref = `ma\u0069lto:${emailLocal}\u0040${emailDomain}`;

export default function ImpressumPage() {
  useDocumentMeta({ title: 'Impressum' });

  return (
    <div>
      <section className="gradient-hero text-white py-12 md:py-16">
        <div className="container text-center">
          <img
            src="/images/inspi_teacher.webp"
            alt="Inspi Teacher"
            className="mx-auto w-36 md:w-48 h-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-5xl font-display font-bold">Impressum</h1>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">Angaben gemäß § 5 TMG</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Robert Bagdahn<br />
              Rautenstrauchstr. 93<br />
              50935 Köln
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">Kontakt</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <a
                href={emailHref}
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                {emailLocal}&#64;{emailDomain}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Robert Bagdahn<br />
              Rautenstrauchstr. 93<br />
              50935 Köln
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">Haftung für Inhalte</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
              Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
              Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
              möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte
              umgehend entfernen.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">Haftung für Links</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
              Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
              der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
              auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
              Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
              ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
              Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-display font-bold text-foreground">Urheberrecht</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
              dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
              der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
              Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
              sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte
              auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter
              beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
              trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
              entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige
              Inhalte umgehend entfernen.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
