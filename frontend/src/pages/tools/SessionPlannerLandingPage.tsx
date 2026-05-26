import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_SESSION_PLANNER } from '@/lib/toolColors';

export default function SessionPlannerLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_SESSION_PLANNER}
      subtitle="Plane deine wöchentlichen Gruppenstunden mit einem festen Wochentag und Uhrzeit. Weise jeder Sitzung eine Idee zu und arbeite mit deinem Team zusammen."
      longDescription="Der Gruppenstundenplan ist dein Quartalsplaner für wöchentliche Heimabende. Lege einen festen Wochentag und eine Uhrzeit fest, und der Planer generiert automatisch die nächsten Termine. Weise jeder Sitzung eine Idee aus der Datenbank zu, schreibe Notizen, markiere Termine als ausfallend und lade weitere Leiter als Mitarbeiter ein."
      features={[
        { icon: 'calendar_month', title: 'Wöchentlicher Rhythmus', description: 'Definiere Wochentag und Uhrzeit – der Planer generiert automatisch alle Termine im Quartal.' },
        { icon: 'lightbulb', title: 'Ideen zuweisen', description: 'Suche in der Ideendatenbank und weise jeder Sitzung eine passende Idee zu.' },
        { icon: 'group_add', title: 'Kollaboratives Planen', description: 'Lade andere Leiter als Mitarbeiter ein – mit Editor- oder Betrachter-Rolle.' },
        { icon: 'event_busy', title: 'Ausfälle markieren', description: 'Markiere einzelne Termine als ausfallend (Ferien, Feiertage, etc.).' },
        { icon: 'groups', title: 'Gruppenbasiert', description: 'Verknüpfe den Planer mit einer Pfadfindergruppe – alle Mitglieder haben Zugriff.' },
        { icon: 'edit_note', title: 'Notizen & Details', description: 'Füge zu jedem Termin Notizen hinzu – Material-Erinnerungen, Aufgabenverteilung, etc.' },
      ]}
      examples={[
        { icon: 'auto_awesome', title: 'Quartalsplanung', description: 'Plane 12 Wochen Heimabend im Voraus und verteile Themen gleichmäßig über das Quartal.' },
        { icon: 'diversity_3', title: 'Leiter-Team koordinieren', description: 'Lade dein Leiter-Team ein und verteilt die Verantwortung für einzelne Abende.' },
        { icon: 'event_note', title: 'Jahresprogramm', description: 'Erstelle mehrere Planer für verschiedene Stufen (Wölflinge, Jungpfadfinder, etc.).' },
      ]}
      faq={[
        { question: 'Kann ich mehrere Planer haben?', answer: 'Ja, du kannst beliebig viele Planer erstellen – z.B. einen pro Stufe.' },
        { question: 'Wer kann meinen Planer sehen?', answer: 'Nur du und eingeladene Mitarbeiter. Bei Gruppenbindung können alle Mitglieder ihn sehen.' },
        { question: 'Kann ich Termine verschieben?', answer: 'Termine haben einen festen wöchentlichen Rhythmus. Du kannst einzelne als ausfallend markieren.' },
        { question: 'Müssen Ideen aus der Datenbank kommen?', answer: 'Nein, du kannst auch Freitext-Notizen eintragen.' },
      ]}
      ctaLabel="Planer erstellen"
      ctaRoute="/session-planner/app"
    />
  );
}
