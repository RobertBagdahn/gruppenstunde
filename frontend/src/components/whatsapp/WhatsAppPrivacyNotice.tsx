/**
 * WhatsApp privacy notice — explains what data is processed and how to delete it.
 * Used in the QR code dialog before consent.
 */
export default function WhatsAppPrivacyNotice() {
  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
      <p className="font-medium flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">shield</span>
        Datenschutzhinweis
      </p>
      <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
        <li>
          Deine persönliche WhatsApp-Nummer wird verwendet, um Nachrichten in deinem
          Namen zu versenden.
        </li>
        <li>
          Sitzungsdaten werden verschlüsselt in der Datenbank gespeichert.
        </li>
        <li>
          Nachrichteninhalte werden <strong>nicht</strong> gespeichert — nur Metadaten
          (Empfänger, Zeitpunkt, Status).
        </li>
        <li>
          Telefonnummern der Empfänger werden nur zum Versandzeitpunkt aufgelöst.
        </li>
        <li>
          Du kannst alle WhatsApp-Daten jederzeit vollständig löschen.
        </li>
      </ul>
    </div>
  );
}
