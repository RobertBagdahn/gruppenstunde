/**
 * StepContextHelp — shows contextual explanation text per wizard step.
 */

const STEP_HELP: Record<number, { title: string; text: string }> = {
  0: {
    title: 'Grunddaten',
    text: 'Gib deinem Event einen eindeutigen Namen. Die Farbe und das Icon helfen dir, deine Events in der Übersicht schnell zu unterscheiden. Der URL-Slug wird automatisch generiert, kann aber angepasst werden.',
  },
  1: {
    title: 'Gruppe & Einladung',
    text: 'Lade direkt Personen zu deinem Event ein. Du kannst auch ganze Gruppen einladen. Dieser Schritt ist optional — du kannst Einladungen auch später im Dashboard verschicken.',
  },
  2: {
    title: 'Datum & Ort',
    text: 'Das Start- und Enddatum bestimmt die Phase deines Events. Der Ort wird auf der Einladung und im Elternzugang angezeigt. Du kannst Treff- und Abholpunkte für die Teilnehmer definieren.',
  },
  3: {
    title: 'Anmeldung',
    text: 'Bestimme, wann und wie sich Teilnehmer anmelden können. Bei öffentlichen Events kann jeder die Eventseite sehen. Die Gastanmeldung erlaubt Anmeldungen ohne Account.',
  },
  4: {
    title: 'Buchungsoptionen',
    text: 'Erstelle verschiedene Buchungsoptionen mit unterschiedlichen Preisen und Teilnehmerlimits. Ohne Optionen melden sich Teilnehmer direkt an.',
  },
  5: {
    title: 'Packliste & Felder',
    text: 'Verknüpfe eine bestehende Packliste, die den Teilnehmern auf der Eventseite angezeigt wird. Benutzerdefinierte Felder und Labels kannst du im Dashboard einrichten.',
  },
  6: {
    title: 'Einladungstext',
    text: 'Der Einladungstext wird per E-Mail verschickt und auf der Eventseite angezeigt. Du kannst ihn manuell schreiben oder von der KI generieren lassen.',
  },
  7: {
    title: 'Zusammenfassung',
    text: 'Prüfe alle Einstellungen bevor du das Event erstellst. Du kannst alle Einstellungen später im Dashboard noch ändern.',
  },
};

interface StepContextHelpProps {
  step: number;
}

export default function StepContextHelp({ step }: StepContextHelpProps) {
  const help = STEP_HELP[step];
  if (!help) return null;

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-muted-foreground text-[18px] mt-0.5 shrink-0">
          help_outline
        </span>
        <div>
          <h4 className="text-sm font-semibold mb-1">{help.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{help.text}</p>
        </div>
      </div>
    </div>
  );
}
