import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_PACKING_LISTS } from '@/lib/toolColors';

export default function PackingListLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_PACKING_LISTS}
      subtitle="Erstelle Packlisten für Hajk, Sommerlager oder Wochenendaktionen. Nutze Vorlagen, tracke den Fortschritt und teile Listen mit deiner Gruppe."
      longDescription="Der Packlisten-Manager hilft dir, nichts zu vergessen. Erstelle Packlisten mit Kategorien, hake Gegenstände ab und behalte den Überblick. Nutze Vorlagen für verschiedene Anlässe und klone sie für schnellen Start."
      features={[
        { icon: 'checklist', title: 'Abhak-Funktion', description: 'Hake Gegenstände ab und behalte den Überblick mit Fortschrittsbalken.' },
        { icon: 'category', title: 'Kategorien', description: 'Organisiere deine Packliste in Kategorien (Kleidung, Schlafen, Hygiene, etc.).' },
        { icon: 'content_copy', title: 'Vorlagen klonen', description: 'Nutze Vorlagen für verschiedene Anlässe und klone sie mit einem Klick.' },
        { icon: 'ios_share', title: 'Exportieren & Teilen', description: 'Exportiere als Text, drucke aus oder teile mit einem Link.' },
        { icon: 'sort', title: 'Sortierung', description: 'Sortiere Kategorien und Gegenstände per Drag & Drop.' },
        { icon: 'restart_alt', title: 'Zurücksetzen', description: 'Setze alle Häkchen zurück für die nächste Fahrt.' },
      ]}
      examples={[
        { icon: 'hiking', title: 'Hajk-Packliste', description: 'Alles für eine 2-Tages-Wanderung: Leichtes Gepäck, wetterfeste Kleidung, Notfallausrüstung.' },
        { icon: 'camping', title: 'Sommerlager', description: 'Die große Liste für 10 Tage Lager: Von der Sonnencreme bis zum Fahrtenhemd.' },
        { icon: 'weekend', title: 'Wochenend-Aktion', description: 'Kurze Packliste für ein Wochenende in der Jugendherberge.' },
      ]}
      faq={[
        { question: 'Kann ich Listen ohne Account erstellen?', answer: 'Zum Speichern und Teilen brauchst du ein kostenloses Konto.' },
        { question: 'Kann ich meine Liste teilen?', answer: 'Ja, jede Packliste hat einen öffentlichen Link für deine Gruppe.' },
        { question: 'Was sind Vorlagen?', answer: 'Vordefinierte Packlisten, die du klonen und anpassen kannst.' },
        { question: 'Kann ich Häkchen zurücksetzen?', answer: 'Ja, mit einem Klick alle zurücksetzen für die nächste Fahrt.' },
      ]}
      ctaLabel="Packliste erstellen"
      ctaRoute="/packing-lists/app"
    />
  );
}
