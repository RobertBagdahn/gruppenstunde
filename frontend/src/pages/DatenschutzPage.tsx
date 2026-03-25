export default function DatenschutzPage() {
  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white py-12 md:py-16">
        <div className="container text-center">
          <img
            src="/images/inspi_baby_cookie.png"
            alt="Inspi Baby Keks"
            className="mx-auto h-36 md:h-48 mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Datenschutz</h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl mx-auto">
            Informationen zum Schutz deiner persönlichen Daten
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">1. Datenschutz auf einen Blick</h3>
            <h4 className="mt-4 font-medium text-foreground">Allgemeine Hinweise</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">2. Verantwortliche Stelle</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Deutscher Pfadfinder*innenbund Mosaik<br />
              Robert-Perthel-Str. 79<br />
              50739 Köln
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Rechtsträger: Pfadfinder-Bundesamt Köln e.V.<br />
              VR 8654, Amtsgericht Köln
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">3. Datenerfassung auf dieser Website</h3>
            <h4 className="mt-4 font-medium text-foreground">Cookies</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Diese Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die
              auf Ihrem Endgerät gespeichert werden. Wir verwenden ausschließlich technisch
              notwendige Cookies, die für den Betrieb der Seite erforderlich sind (z.B.
              Session-Cookies für die Anmeldung).
            </p>

            <h4 className="mt-6 font-medium text-foreground">Server-Log-Dateien</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Der Provider der Seiten erhebt und speichert automatisch Informationen in
              sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
              Dies sind: Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer-URL,
              Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse.
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">4. Registrierung und Nutzerkonto</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sie können sich auf unserer Website registrieren, um zusätzliche Funktionen
              nutzen zu können. Die dazu eingegebenen Daten verwenden wir nur zum Zwecke
              der Nutzung des jeweiligen Angebotes. Die bei der Registrierung abgefragten
              Pflichtangaben müssen vollständig angegeben werden. Anderenfalls werden wir
              die Registrierung ablehnen.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Die im Rahmen der Registrierung erfassten Daten werden von uns für die
              Bereitstellung unserer Dienste gespeichert und mit Ende der Nutzung der
              Plattform gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">5. Ihre Rechte</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und
              Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem
              ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine
              Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung
              jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten
              Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground">6. Analyse-Tools und Werbung</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Diese Website verwendet keine Analyse-Tools und keine Werbung. Es werden keine
              personenbezogenen Daten an Dritte weitergegeben.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
