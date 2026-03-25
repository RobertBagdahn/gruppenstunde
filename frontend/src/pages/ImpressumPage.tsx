export default function ImpressumPage() {
  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white py-12 md:py-16">
        <div className="container text-center">
          <img
            src="/images/inspi_teacher.webp"
            alt="Inspi Teacher"
            className="mx-auto h-36 md:h-48 mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Impressum</h1>
        </div>
      </section>

      {/* Content */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">Angaben gemäß § 5 TMG</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Deutscher Pfadfinder*innenbund Mosaik<br />
              Robert-Perthel-Str. 79<br />
              50739 Köln
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Der Deutsche Pfadfinderbund Mosaik hat die Rechtsform eines nicht eingetragenen Vereins.
              Vorstand im Sinne des § 26 BGB sind je zwei Mitglieder der Bundesführung gemeinschaftlich.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Rechtsträger aller Bundesstellen, Bundeseinrichtungen und Bundesunternehmungen ist:
              Pfadfinder-Bundesamt Köln e.V., Robert-Perthel-Str. 79, 50739 Köln<br />
              VR 8654, Amtsgericht Köln
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">Kontakt</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <a
                href="https://dpbm.de/impressum/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Kontakt zum Bundesamt
              </a>
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Deutscher Pfadfinder*innenbund Mosaik<br />
              Robert-Perthel-Str. 79<br />
              50739 Köln
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">Haftung für Inhalte</h3>
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

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">Haftung für Links</h3>
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

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">Urheberrecht</h3>
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
            <div className="mt-4 flex items-center gap-3">
              <a
                rel="license noopener noreferrer"
                href="https://creativecommons.org/licenses/by-nc/4.0/deed.de"
                target="_blank"
              >
                <img
                  alt="Creative Commons Lizenzvertrag"
                  className="border-0"
                  src="https://i.creativecommons.org/l/by-nc/4.0/88x31.png"
                />
              </a>
              <p className="text-sm text-muted-foreground">
                Dieses Werk ist lizenziert unter einer{' '}
                <a
                  rel="license noopener noreferrer"
                  href="https://creativecommons.org/licenses/by-nc/4.0/deed.de"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  Creative Commons Namensnennung-Nicht kommerziell 4.0 International Lizenz
                </a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
