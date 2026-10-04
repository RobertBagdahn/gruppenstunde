import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ArrowRight, Shield } from 'lucide-react';

export default function DatenschutzPage() {
  const { data: user } = useCurrentUser();
  useDocumentMeta({ title: 'Datenschutz' });

  return (
    <div>
      <section className="pt-10 md:pt-14">
        <div className="container text-center">
          <img
            src="/images/inspi_baby_cookie.png"
            alt="Inspi Baby Keks"
            className="mx-auto w-28 md:w-36 h-auto mb-4"
          />
          <h1 className="text-title font-display font-extrabold text-foreground">Datenschutz</h1>
          <p className="mt-4 text-emphasis text-muted-foreground max-w-2xl mx-auto">
            Informationen zum Schutz deiner persönlichen Daten
          </p>
        </div>
      </section>

      {user && (
        <section className="container py-6">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/profile/privacy"
              className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors group"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                <Shield className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-body font-bold text-foreground">Meine Daten & Datenschutz</p>
                <p className="text-caption text-muted-foreground mt-0.5">
                  Sieh dir an, welche Daten wir über dich gespeichert haben, exportiere sie oder lösche dein Konto.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto shrink-0" />
            </Link>
          </div>
        </section>
      )}

      <section className="container py-8 md:py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">1. Datenschutz auf einen Blick</h3>
            <h4 className="mt-4 font-medium text-foreground">Allgemeine Hinweise</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit deinen
              personenbezogenen Daten passiert, wenn du diese Website besuchst. Personenbezogene
              Daten sind alle Daten, mit denen du persönlich identifiziert werden kannst.
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">2. Verantwortliche Stelle</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Robert Bagdahn<br />
              Rautenstrauchstr. 93<br />
              50935 Köln
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              E-Mail: robertbagdahn&#64;gmail.com
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">3. Datenerfassung auf dieser Website</h3>
            <h4 className="mt-4 font-medium text-foreground">Cookies</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Diese Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die
              auf deinem Endgerät gespeichert werden. Wir verwenden ausschließlich technisch
              notwendige Cookies, die für den Betrieb der Seite erforderlich sind (z.B.
              Session-Cookies für die Anmeldung).
            </p>

            <h4 className="mt-6 font-medium text-foreground">Server-Log-Dateien</h4>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Der Provider der Seiten erhebt und speichert automatisch Informationen in
              sogenannten Server-Log-Dateien, die dein Browser automatisch an uns übermittelt.
              Dies sind: Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer-URL,
              Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse.
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">4. Registrierung und Nutzerkonto</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Du kannst dich auf unserer Website registrieren, um zusätzliche Funktionen
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

          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">5. Deine Rechte</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Du hast jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und
              Zweck deiner gespeicherten personenbezogenen Daten zu erhalten. Du hast außerdem
              ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn du eine
              Einwilligung zur Datenverarbeitung erteilt hast, kannst du diese Einwilligung
              jederzeit für die Zukunft widerrufen. Außerdem hast du das Recht, unter bestimmten
              Umständen die Einschränkung der Verarbeitung deiner personenbezogenen Daten zu verlangen.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Des Weiteren steht dir ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
            </p>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="text-section font-display font-bold text-foreground">6. Analyse-Tools und Werbung</h3>
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
